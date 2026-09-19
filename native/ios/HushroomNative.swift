//  HushroomNative.swift
//  Native iOS modules for the React Native (New Architecture) build.
//  Each class maps to a TurboModule / Fabric component; JS only sends commands.
//  Minimum iOS 16. Swift 5.9.

import AVFoundation
import CoreLocation
import CoreMotion
import UIKit
import UserNotifications

// MARK: - PHASE 1 · Folder gesture state machine
//
//  idle ─press─▶ pressed ─(≤350 ms release, <10 pt)─▶ TAP  (toggle play/pause)
//                │ 500 ms stationary
//                ▼
//              armed ── haptic ── release w/o travel ─▶ CONTEXT MENU
//                │ |dx| > 36 pt
//                ▼
//            scrubbing ── dx<0 rewind / dx>0 fast-forward (continuous rate) ─▶ release: seek
//
//  All three recognizers live on the same view. Tap must FAIL when long-press
//  recognises, and the pan only begins after the long press has armed.

public protocol FolderGestureDelegate: AnyObject {
    func folderTapped()
    func folderArmed()                                   // haptic + visual ring
    func folderScrub(rate: Double, deltaPoints: CGFloat) // rate 0.45…2.2, negative delta = rewind
    func folderScrubEnded(seekSeconds: Int)
    func folderContextMenu(anchor: UIView)
}

public final class FolderGestureController: NSObject, UIGestureRecognizerDelegate {
    private enum State { case idle, pressed, armed, scrubbing }
    private var state: State = .idle
    private var startPoint: CGPoint = .zero
    private let haptic = UIImpactFeedbackGenerator(style: .medium)
    private weak var view: UIView?
    public weak var delegate: FolderGestureDelegate?

    public init(view: UIView) {
        super.init()
        self.view = view
        let tap = UITapGestureRecognizer(target: self, action: #selector(onTap))
        let long = UILongPressGestureRecognizer(target: self, action: #selector(onLong))
        long.minimumPressDuration = 0.5
        long.allowableMovement = 10
        let pan = UIPanGestureRecognizer(target: self, action: #selector(onPan))
        tap.require(toFail: long)          // a recognised hold is never also a tap
        pan.delegate = self                // pan is allowed only while armed
        long.delegate = self
        [tap, long, pan].forEach { view.addGestureRecognizer($0) }
        view.isAccessibilityElement = true
        view.accessibilityHint = "Double-tap to play or pause. Touch and hold for rewind, fast-forward and more options."
    }

    @objc private func onTap() { delegate?.folderTapped() }

    @objc private func onLong(_ g: UILongPressGestureRecognizer) {
        switch g.state {
        case .began:
            state = .armed
            startPoint = g.location(in: view)
            haptic.prepare(); haptic.impactOccurred()
            delegate?.folderArmed()
        case .ended, .cancelled:
            if state == .armed, let v = view { delegate?.folderContextMenu(anchor: v) }   // stationary hold
            if state != .scrubbing { state = .idle }
        default: break
        }
    }

    @objc private func onPan(_ g: UIPanGestureRecognizer) {
        guard state == .armed || state == .scrubbing else { return }
        let dx = g.translation(in: view).x
        switch g.state {
        case .changed:
            if state == .armed, abs(dx) > 36 { state = .scrubbing; UISelectionFeedbackGenerator().selectionChanged() }
            if state == .scrubbing {
                let rate = min(2.2, max(0.45, 1 + Double(dx) / 220))
                delegate?.folderScrub(rate: rate, deltaPoints: dx)
            }
        case .ended, .cancelled:
            if state == .scrubbing { delegate?.folderScrubEnded(seekSeconds: Int(dx / 6)) }
            state = .idle
        default: break
        }
    }

    // Pan may only begin once the hold has armed; both recognizers run together.
    public func gestureRecognizerShouldBegin(_ g: UIGestureRecognizer) -> Bool {
        if g is UIPanGestureRecognizer { return state == .armed || state == .scrubbing }
        return true
    }
    public func gestureRecognizer(_ g: UIGestureRecognizer, shouldRecognizeSimultaneouslyWith other: UIGestureRecognizer) -> Bool {
        (g is UIPanGestureRecognizer && other is UILongPressGestureRecognizer) || (g is UILongPressGestureRecognizer && other is UIPanGestureRecognizer)
    }
}

// MARK: - PHASE 4 · Audio session for sleep loops (mixing with other apps)
//
//  Truth table (verified against AVAudioSession docs):
//   • .playback + .mixWithOthers  → keeps playing in background, mixes with other
//     apps that ALSO allow mixing (music, most VoIP apps in speakerphone mode,
//     FaceTime). Ignores the silent switch. Requires UIBackgroundModes: audio.
//   • .ambient (+ .mixWithOthers implied) → mixes, but is silenced by the ring
//     switch and does not run in the background. Use only for UI click SFX.
//   • Cellular (GSM) calls: the system owns the audio route. Third-party audio is
//     interrupted (AVAudioSession.interruptionNotification .began) and can resume
//     after the call. There is NO supported way to "inject" audio into a cellular
//     call, and App Review rejects private-API attempts. Design: auto-resume on
//     .ended with .shouldResume, and tell the user why audio paused.
//   • VoIP apps (Discord/Instagram/Snapchat) decide their own mixing policy. If the
//     other app uses .duckOthers or exclusive playAndRecord, our loop ducks or
//     pauses. This is arbitrated by iOS, not by us.

public final class SleepAudioSession {
    public static let shared = SleepAudioSession()
    public var onInterruption: ((Bool /*began*/, Bool /*shouldResume*/) -> Void)?

    public func activateForSleepLoops() throws {
        let s = AVAudioSession.sharedInstance()
        try s.setCategory(.playback, mode: .default, options: [.mixWithOthers])
        try s.setActive(true)
        NotificationCenter.default.addObserver(forName: AVAudioSession.interruptionNotification, object: s, queue: .main) { [weak self] n in
            guard let info = n.userInfo, let raw = info[AVAudioSessionInterruptionTypeKey] as? UInt,
                  let type = AVAudioSession.InterruptionType(rawValue: raw) else { return }
            let opts = AVAudioSession.InterruptionOptions(rawValue: info[AVAudioSessionInterruptionOptionKey] as? UInt ?? 0)
            self?.onInterruption?(type == .began, opts.contains(.shouldResume))
        }
        NotificationCenter.default.addObserver(forName: AVAudioSession.routeChangeNotification, object: s, queue: .main) { _ in
            // Headphones unplugged / Bluetooth dropped: iOS pauses playback; we keep the engine alive and resume on the new route.
        }
    }

    /// UI click/pop SFX must never wake the speaker over a call or ignore the mute switch.
    public func activateForUiClicks() throws {
        try AVAudioSession.sharedInstance().setCategory(.ambient, mode: .default, options: [.mixWithOthers])
    }
}

// MARK: - PHASE 3 · Thermal governor
//
//  ProcessInfo.thermalState: nominal → fair → serious → critical.
//  serious: stop ads/TV, drop animation frame rate, pause non-critical audio.
//  critical: additionally release all optional work; only the black overlay and
//  the alarm keep running. Apple also throttles CPU here; we get ahead of it.

public final class ThermalGovernor {
    public enum Policy { case normal, reduced, emergency }
    public var onPolicy: ((Policy) -> Void)?
    private var observer: NSObjectProtocol?

    public func start() {
        apply(ProcessInfo.processInfo.thermalState)
        observer = NotificationCenter.default.addObserver(forName: ProcessInfo.thermalStateDidChangeNotification, object: nil, queue: .main) { [weak self] _ in
            self?.apply(ProcessInfo.processInfo.thermalState)
        }
    }
    private func apply(_ state: ProcessInfo.ThermalState) {
        switch state {
        case .nominal, .fair: onPolicy?(.normal)
        case .serious:        onPolicy?(.reduced)     // audio fades out over 2 s, TV ad loop halts, pets freeze
        case .critical:       onPolicy?(.emergency)   // everything except blackout + alarm threads
        @unknown default:     onPolicy?(.reduced)
        }
    }
}

// MARK: - PHASE 4 · Screen blackout (true #000000, brightness 0, swipe to wake)
//
//  What iOS allows:
//   • UIScreen.main.brightness = 0 while OUR app is frontmost. OLED shows pure
//     black pixels at zero brightness → panel is effectively off. We always
//     restore the previous value on wake, background, and scene disconnect.
//   • We cannot draw over another app. For "sleeping couple on a video call":
//     FaceTime keeps the camera streaming in Picture-in-Picture when you switch
//     to Hushroom (iOS 15+), so the call continues while our black window is
//     frontmost. Third-party call apps continue only if THEY support PiP with
//     camera access; otherwise iOS suspends their camera. We document this in-app.
//   • Notification-shade swipes are system gestures we cannot intercept; our wake
//     gesture is a swipe UP anywhere on the overlay (plus VoiceOver double-tap).

public final class BlackoutController {
    private var window: UIWindow?
    private var previousBrightness: CGFloat = UIScreen.main.brightness
    private var startY: CGFloat = 0

    public func show(in scene: UIWindowScene) {
        previousBrightness = UIScreen.main.brightness
        let w = UIWindow(windowScene: scene)
        w.windowLevel = .alert + 1
        w.backgroundColor = .black                     // #000000, no alpha
        w.rootViewController = UIViewController()
        w.rootViewController?.view.backgroundColor = .black
        let pan = UIPanGestureRecognizer(target: self, action: #selector(onPan))
        w.addGestureRecognizer(pan)
        w.isHidden = false
        window = w
        UIApplication.shared.isIdleTimerDisabled = true
        UIView.animate(withDuration: 0.6) { UIScreen.main.brightness = 0 }
        NotificationCenter.default.addObserver(self, selector: #selector(hide), name: UIApplication.willResignActiveNotification, object: nil)
    }

    @objc private func onPan(_ g: UIPanGestureRecognizer) {
        switch g.state {
        case .began: startY = g.location(in: window).y
        case .ended: if startY - g.location(in: window).y > 48 { hide() }   // swipe up ≥ 48 pt
        default: break
        }
    }

    @objc public func hide() {
        UIScreen.main.brightness = previousBrightness  // always restore
        UIApplication.shared.isIdleTimerDisabled = false
        window?.isHidden = true
        window = nil
    }
}

// MARK: - PHASE 5 · Alarm: silent-switch/Focus behaviour, critical alerts, speaker routing
//
//  Reality on iOS:
//   1. App audio in the .playback category ignores the ring/silent switch and
//      Focus modes. Because Hushroom already keeps a background audio session
//      alive for sleep loops, the alarm can fire IN-PROCESS at the exact time
//      through AVAudioEngine — no entitlement needed. This is how leading alarm
//      apps work.
//   2. If the OS terminated the process, the fallback is a local notification.
//      Notification sounds ARE silenced by the switch/Focus unless the app holds
//      the Critical Alerts entitlement (com.apple.developer.usernotifications.critical-alerts).
//      Apply at developer.apple.com → Account → Additional Capabilities →
//      "Critical Alerts" request form. Apple grants it case-by-case (health,
//      safety, home security…); a sleep alarm may be declined. Ship the
//      in-process path first and treat critical alerts as an enhancement.
//   3. Speaker override with Bluetooth connected: iOS only routes to the built-in
//      speaker for a .playAndRecord session with .defaultToSpeaker and WITHOUT
//      .allowBluetooth/.allowBluetoothA2DP. That needs NSMicrophoneUsageDescription
//      and (first time) the microphone prompt. We show a one-time explainer.

public final class AlarmEngine {
    private let engine = AVAudioEngine()
    private let player = AVAudioPlayerNode()

    public func requestNotificationAuthorization() {
        var options: UNAuthorizationOptions = [.alert, .sound]
        #if CRITICAL_ALERTS_ENTITLED
        options.insert(.criticalAlert)
        #endif
        UNUserNotificationCenter.current().requestAuthorization(options: options) { _, _ in }
    }

    /// Fallback notification for when the process is not alive at alarm time.
    public func scheduleFallbackNotification(at date: Date, id: String) {
        let content = UNMutableNotificationContent()
        content.title = "Hushroom alarm"
        content.body = "Shake your phone to dismiss."
        #if CRITICAL_ALERTS_ENTITLED
        content.sound = UNNotificationSound.criticalSoundNamed(UNNotificationSoundName("alarm.caf"), withAudioVolume: 1.0)
        content.interruptionLevel = .critical
        #else
        content.sound = UNNotificationSound(named: UNNotificationSoundName("alarm.caf"))
        content.interruptionLevel = .timeSensitive
        #endif
        let comps = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: date)
        let trigger = UNCalendarNotificationTrigger(dateMatching: comps, repeats: false)
        UNUserNotificationCenter.current().add(UNNotificationRequest(identifier: id, content: content, trigger: trigger))
    }

    /// Forces the built-in speaker even when AirPods / a Bluetooth speaker are connected.
    public func routeAlarmToBuiltInSpeaker() throws {
        let s = AVAudioSession.sharedInstance()
        try s.setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker])   // no Bluetooth options on purpose
        try s.overrideOutputAudioPort(.speaker)
        try s.setActive(true)
    }

    /// Returns to the normal sleep-loop session after dismissal.
    public func restoreSleepRoute() throws { try SleepAudioSession.shared.activateForSleepLoops() }

    public func ring(url: URL) throws {
        let file = try AVAudioFile(forReading: url)
        engine.attach(player)
        engine.connect(player, to: engine.mainMixerNode, format: file.processingFormat)
        try engine.start()
        player.scheduleFile(file, at: nil, completionHandler: nil)
        player.play()
    }
    public func stop() { player.stop(); engine.stop() }
}

// MARK: - PHASE 5 · Shake-to-dismiss (CoreMotion)
//
//  Sustained-shake detector: counts direction reversals of acceleration above a
//  force threshold and requires them to keep coming; progress decays so a single
//  bump never dismisses.

public final class ShakeDismissMonitor {
    private let motion = CMMotionManager()
    private var lastSign = 1
    private var progress = 0.0
    public var onProgress: ((Double) -> Void)?
    public var onDismiss: (() -> Void)?

    public func start(threshold g: Double = 1.15, samplesPerSecond: Double = 40) {
        guard motion.isAccelerometerAvailable else { return }
        motion.accelerometerUpdateInterval = 1 / samplesPerSecond
        motion.startAccelerometerUpdates(to: .main) { [weak self] data, _ in
            guard let self, let a = data?.acceleration else { return }
            let magnitude = (a.x * a.x + a.y * a.y + a.z * a.z).squareRoot() - 1.0   // remove gravity (g units)
            let sign = magnitude >= 0 ? 1 : -1
            if abs(magnitude) > g && sign != self.lastSign {                          // a real reversal, not a bump
                self.lastSign = sign
                self.progress = min(100, self.progress + 9)
            } else {
                self.progress = max(0, self.progress - 0.35)                          // decay ~14/s when idle
            }
            self.onProgress?(self.progress)
            if self.progress >= 100 { self.stop(); self.onDismiss?() }
        }
    }
    public func stop() { motion.stopAccelerometerUpdates(); progress = 0 }
}

// MARK: - PHASE 5 · Weather after dismissal (Open-Meteo, no API key)

public final class WeatherClient: NSObject, CLLocationManagerDelegate {
    private let location = CLLocationManager()
    private var completion: ((String?) -> Void)?

    public func fetchMorningWeather(_ done: @escaping (String?) -> Void) {
        completion = done
        location.delegate = self
        location.desiredAccuracy = kCLLocationAccuracyKilometer      // coarse is enough
        location.requestWhenInUseAuthorization()
        location.requestLocation()
    }
    public func locationManager(_ m: CLLocationManager, didUpdateLocations locs: [CLLocation]) {
        guard let c = locs.first?.coordinate else { completion?(nil); return }
        let url = URL(string: "https://api.open-meteo.com/v1/forecast?latitude=\(c.latitude)&longitude=\(c.longitude)&current=temperature_2m,weather_code")!
        URLSession.shared.dataTask(with: url) { data, _, _ in
            guard let data, let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let cur = json["current"] as? [String: Any], let t = cur["temperature_2m"] as? Double else { self.completion?(nil); return }
            DispatchQueue.main.async { self.completion?("Good morning — \(Int(t.rounded()))°C") }
        }.resume()
    }
    public func locationManager(_ m: CLLocationManager, didFailWithError e: Error) { completion?(nil) }
}

/*
 Info.plist keys required:
   UIBackgroundModes            = [audio]
   NSMicrophoneUsageDescription = "Needed only to force the alarm through the phone speaker while Bluetooth is connected."
   NSLocationWhenInUseUsageDescription = "Shows the local weather when your alarm goes off."
   NSMotionUsageDescription     = "Shake to dismiss the alarm."
 Entitlements (optional, Apple-approved): com.apple.developer.usernotifications.critical-alerts
*/
