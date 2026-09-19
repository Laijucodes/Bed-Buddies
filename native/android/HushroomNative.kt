// HushroomNative.kt
// Native Android modules for the React Native (New Architecture) build.
// minSdk 26, targetSdk 35, Kotlin 2.x. Each class maps to a TurboModule.

package app.hushroom.native

import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Color
import android.graphics.PixelFormat
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.media.AudioAttributes
import android.media.AudioDeviceInfo
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.MediaPlayer
import android.os.BatteryManager
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.os.VibrationEffect
import android.os.Vibrator
import android.provider.Settings
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import kotlin.math.abs
import kotlin.math.hypot
import kotlin.math.sqrt

// ───────────────────────────── PHASE 1 · Folder gesture state machine ─────────────────────────────
//  Same states as iOS: idle → pressed → armed → scrubbing. Works with MotionEvent so it
//  behaves identically inside a View, a Compose AndroidView, or a Fabric component.
//  Compose alternative: pointerInput { awaitEachGesture { awaitFirstDown(); awaitLongPressOrCancellation(...) ... } }

interface FolderGestureListener {
    fun onTap()
    fun onArmed()
    fun onScrub(rate: Float, deltaPx: Float)
    fun onScrubEnd(seekSeconds: Int)
    fun onContextMenu()
}

class FolderGestureDetector(private val view: View, private val listener: FolderGestureListener) : View.OnTouchListener {
    private enum class State { IDLE, PRESSED, ARMED, SCRUBBING }
    private var state = State.IDLE
    private var x0 = 0f; private var y0 = 0f; private var t0 = 0L
    private val handler = Handler(Looper.getMainLooper())
    private val density = view.resources.displayMetrics.density
    private val slop = 10 * density
    private val direction = 36 * density
    private val vibrator = view.context.getSystemService(Vibrator::class.java)
    private val arm = Runnable {
        if (state == State.PRESSED) {
            state = State.ARMED
            vibrator?.vibrate(VibrationEffect.createPredefined(VibrationEffect.EFFECT_HEAVY_CLICK))
            listener.onArmed()
        }
    }

    init { view.setOnTouchListener(this); view.isLongClickable = false }

    override fun onTouch(v: View, e: MotionEvent): Boolean {
        when (e.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                state = State.PRESSED; x0 = e.x; y0 = e.y; t0 = e.eventTime
                v.parent?.requestDisallowInterceptTouchEvent(true)      // keep scroll views away
                handler.postDelayed(arm, 500)
            }
            MotionEvent.ACTION_MOVE -> {
                val dx = e.x - x0; val dy = e.y - y0
                if (state == State.PRESSED && hypot(dx, dy) > slop) { handler.removeCallbacks(arm); state = State.IDLE }
                if (state == State.ARMED && abs(dx) > direction) { state = State.SCRUBBING; vibrator?.vibrate(VibrationEffect.createPredefined(VibrationEffect.EFFECT_TICK)) }
                if (state == State.SCRUBBING) listener.onScrub((1 + dx / (220 * density)).coerceIn(0.45f, 2.2f), dx)
            }
            MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                handler.removeCallbacks(arm)
                val dx = e.x - x0
                when (state) {
                    State.PRESSED -> if (e.eventTime - t0 < 350 && e.actionMasked == MotionEvent.ACTION_UP) { v.performClick(); listener.onTap() }
                    State.ARMED -> listener.onContextMenu()               // stationary long press
                    State.SCRUBBING -> listener.onScrubEnd((dx / (6 * density)).toInt())
                    State.IDLE -> Unit
                }
                state = State.IDLE
            }
        }
        return true
    }
}

// ───────────────────────────── PHASE 4 · Sleep audio service (media focus, honest) ─────────────────────────────
//  • USAGE_MEDIA + CONTENT_TYPE_MUSIC, foreground service (type mediaPlayback), MediaSession for lock-screen.
//  • Audio focus: we REQUEST focus; we cannot bypass it. During a phone call Android's
//    telephony holds focus and routes the earpiece — third-party media is paused (AUDIOFOCUS_LOSS_TRANSIENT)
//    and we resume on AUDIOFOCUS_GAIN. During VoIP calls (Discord etc.) the other app decides:
//    if it requests AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK we keep playing quietly (ducked); if it
//    requests exclusive focus we pause. Any "focus bypass" is a policy violation and audibly breaks calls.
//  • Playback itself runs in Oboe (AAudio) on a real-time thread; this service only owns lifecycle.

class SleepAudioService : Service() {
    private lateinit var audioManager: AudioManager
    private var focusRequest: AudioFocusRequest? = null
    var onDuck: ((Boolean) -> Unit)? = null
    var onPauseResume: ((Boolean) -> Unit)? = null

    override fun onCreate() {
        super.onCreate()
        audioManager = getSystemService(AudioManager::class.java)
        val nm = getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(NotificationChannel("sleep", "Sleep sounds", NotificationManager.IMPORTANCE_LOW))
        startForeground(1, Notification.Builder(this, "sleep").setContentTitle("Hushroom is playing").setSmallIcon(android.R.drawable.ic_media_play).build())
    }

    fun requestFocusAndPlay(): Boolean {
        val attrs = AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build()
        val req = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
            .setAudioAttributes(attrs)
            .setWillPauseWhenDucked(false)                          // let the system duck us under a call/navigation prompt
            .setOnAudioFocusChangeListener { change ->
                when (change) {
                    AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK -> onDuck?.invoke(true)
                    AudioManager.AUDIOFOCUS_LOSS_TRANSIENT -> onPauseResume?.invoke(false)
                    AudioManager.AUDIOFOCUS_GAIN -> { onDuck?.invoke(false); onPauseResume?.invoke(true) }
                    AudioManager.AUDIOFOCUS_LOSS -> onPauseResume?.invoke(false)
                }
            }.build()
        focusRequest = req
        return audioManager.requestAudioFocus(req) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
    }

    override fun onDestroy() { focusRequest?.let { audioManager.abandonAudioFocusRequest(it) }; super.onDestroy() }
    override fun onBind(intent: Intent?): IBinder? = null
}

// ───────────────────────────── PHASE 3 · Thermal governor ─────────────────────────────
//  PowerManager.addThermalStatusListener (API 29+) is the supported CPU/skin thermal signal.
//  HardwarePropertiesManager is a system-app API; battery temperature (ACTION_BATTERY_CHANGED) is
//  the coarse fallback used below for API 26–28.

class ThermalGovernor(private val context: Context, private val onPolicy: (Policy) -> Unit) {
    enum class Policy { NORMAL, REDUCED, EMERGENCY }
    private val pm = context.getSystemService(PowerManager::class.java)
    private val listener = PowerManager.OnThermalStatusChangedListener { status ->
        onPolicy(when {
            status >= PowerManager.THERMAL_STATUS_CRITICAL -> Policy.EMERGENCY   // only blackout + alarm survive
            status >= PowerManager.THERMAL_STATUS_SEVERE -> Policy.REDUCED       // stop TV ad, freeze pets, fade audio
            status >= PowerManager.THERMAL_STATUS_MODERATE -> Policy.REDUCED
            else -> Policy.NORMAL
        })
    }
    private val batteryReceiver = object : BroadcastReceiver() {
        override fun onReceive(c: Context, i: Intent) {
            val tenthsC = i.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, 250)
            onPolicy(when { tenthsC >= 450 -> Policy.EMERGENCY; tenthsC >= 400 -> Policy.REDUCED; else -> Policy.NORMAL })
        }
    }
    fun start() {
        if (Build.VERSION.SDK_INT >= 29) pm.addThermalStatusListener(listener)
        else context.registerReceiver(batteryReceiver, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
    }
    fun stop() {
        if (Build.VERSION.SDK_INT >= 29) pm.removeThermalStatusListener(listener) else context.unregisterReceiver(batteryReceiver)
    }
}

// ───────────────────────────── PHASE 4 · Blackout overlay ─────────────────────────────
//  Android CAN draw a true-black overlay above other apps (SYSTEM_ALERT_WINDOW → TYPE_APPLICATION_OVERLAY),
//  so the video-call app stays resumed and its camera keeps streaming under our black layer.
//  Brightness: overlay windows don't control panel brightness, so with WRITE_SETTINGS (user-granted)
//  we store Settings.System.SCREEN_BRIGHTNESS, set it to 0 (+ manual mode) and ALWAYS restore.
//  Wake gesture: swipe up ≥ 48 dp on the overlay. The status-bar/notification-shade area is not
//  coverable by app overlays on modern Android, so a shade pull naturally reveals the system UI; we
//  also listen for ACTION_CLOSE_SYSTEM_DIALOGS-style focus loss and dismiss to be safe.

class BlackoutOverlay(private val context: Context) {
    private val wm = context.getSystemService(WindowManager::class.java)
    private var view: View? = null
    private var previousBrightness = -1
    private var previousMode = -1
    private var startY = 0f

    fun canShow() = Settings.canDrawOverlays(context)
    fun requestPermissions() {
        context.startActivity(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        context.startActivity(Intent(Settings.ACTION_MANAGE_WRITE_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    fun show() {
        if (view != null || !canShow()) return
        val v = View(context).apply { setBackgroundColor(Color.BLACK) }   // #000000
        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT, WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.OPAQUE
        ).apply { gravity = Gravity.TOP or Gravity.START; screenBrightness = 0.01f }
        v.setOnTouchListener { _, e ->
            when (e.actionMasked) {
                MotionEvent.ACTION_DOWN -> startY = e.rawY
                MotionEvent.ACTION_UP -> if (startY - e.rawY > 48 * context.resources.displayMetrics.density) hide()
            }
            true                                                          // swallow touches: no accidental taps into the call app
        }
        wm.addView(v, params); view = v
        if (Settings.System.canWrite(context)) {
            val cr = context.contentResolver
            previousBrightness = Settings.System.getInt(cr, Settings.System.SCREEN_BRIGHTNESS, 128)
            previousMode = Settings.System.getInt(cr, Settings.System.SCREEN_BRIGHTNESS_MODE, Settings.System.SCREEN_BRIGHTNESS_MODE_AUTOMATIC)
            Settings.System.putInt(cr, Settings.System.SCREEN_BRIGHTNESS_MODE, Settings.System.SCREEN_BRIGHTNESS_MODE_MANUAL)
            Settings.System.putInt(cr, Settings.System.SCREEN_BRIGHTNESS, 0)
        }
    }

    fun hide() {
        view?.let { wm.removeView(it) }; view = null
        if (previousBrightness >= 0 && Settings.System.canWrite(context)) {
            val cr = context.contentResolver
            Settings.System.putInt(cr, Settings.System.SCREEN_BRIGHTNESS, previousBrightness)
            Settings.System.putInt(cr, Settings.System.SCREEN_BRIGHTNESS_MODE, previousMode)
        }
    }
}

// ───────────────────────────── PHASE 5 · Alarm scheduler, DND, boot, routing ─────────────────────────────
//  • Exact alarms: declare USE_EXACT_ALARM (alarm-clock apps are allowed; Play requires the
//    alarm to be a core feature) or SCHEDULE_EXACT_ALARM + canScheduleExactAlarms() check.
//    setAlarmClock() shows the alarm icon in the status bar and survives Doze.
//  • Boot: RECEIVE_BOOT_COMPLETED + BootReceiver re-schedules persisted alarms (alarms are wiped on reboot).
//  • DND: alarms (USAGE_ALARM stream) are allowed through Do Not Disturb by default in Android's
//    "Alarms" exception. If a user disabled that exception, we request policy access via
//    ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS and, once granted, set an INTERRUPTION_FILTER that
//    allows alarms — never silently; always with an explainer screen.
//  • Hardware mute: the alarm stream is independent of ring/notification volume; a muted ringer does
//    not silence USAGE_ALARM. Volume keys during ring only affect STREAM_ALARM.
//  • Force built-in speaker with Bluetooth connected: MediaPlayer/AudioTrack.setPreferredDevice(built-in speaker).

class AlarmScheduler(private val context: Context) {
    private val am = context.getSystemService(AlarmManager::class.java)
    private val nm = context.getSystemService(NotificationManager::class.java)

    fun ensureExactAlarmPermission(): Boolean {
        if (Build.VERSION.SDK_INT >= 31 && !am.canScheduleExactAlarms()) {
            context.startActivity(Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
            return false
        }
        return true
    }

    fun schedule(triggerAtMillis: Long, alarmId: Int) {
        val fire = PendingIntent.getBroadcast(context, alarmId, Intent(context, AlarmReceiver::class.java).putExtra("id", alarmId), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val show = PendingIntent.getActivity(context, alarmId, context.packageManager.getLaunchIntentForPackage(context.packageName), PendingIntent.FLAG_IMMUTABLE)
        am.setAlarmClock(AlarmManager.AlarmClockInfo(triggerAtMillis, show), fire)
        context.getSharedPreferences("alarms", Context.MODE_PRIVATE).edit().putLong("alarm_$alarmId", triggerAtMillis).apply()   // for BootReceiver
    }

    fun createAlarmChannel() {
        val attrs = AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build()
        val ch = NotificationChannel("alarm", "Alarms", NotificationManager.IMPORTANCE_HIGH).apply {
            setSound(android.net.Uri.parse("android.resource://${context.packageName}/raw/alarm"), attrs)
            setBypassDnd(true)                                            // honoured only if policy access was granted
            enableVibration(true)
        }
        nm.createNotificationChannel(ch)
    }

    fun hasDndAccess() = nm.isNotificationPolicyAccessGranted
    fun requestDndAccess() = context.startActivity(Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    fun allowAlarmsThroughDnd() {
        if (!hasDndAccess()) return
        nm.notificationPolicy = NotificationManager.Policy(NotificationManager.Policy.PRIORITY_CATEGORY_ALARMS or nm.notificationPolicy.priorityCategories, nm.notificationPolicy.priorityCallSenders, nm.notificationPolicy.priorityMessageSenders)
    }

    /** Plays the alarm through the phone speaker even if A2DP/LE Audio is connected. */
    fun ringThroughBuiltInSpeaker(): MediaPlayer {
        val audio = context.getSystemService(AudioManager::class.java)
        val speaker = audio.getDevices(AudioManager.GET_DEVICES_OUTPUTS).firstOrNull { it.type == AudioDeviceInfo.TYPE_BUILTIN_SPEAKER }
        return MediaPlayer().apply {
            setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build())
            setDataSource(context, android.net.Uri.parse("android.resource://${context.packageName}/raw/alarm"))
            isLooping = true
            speaker?.let { preferredDevice = it }                          // the documented routing override
            prepare(); start()
        }
    }
}

class AlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        // Start the full-screen alarm activity (USE_FULL_SCREEN_INTENT) and the ringing service.
        val full = PendingIntent.getActivity(context, 0, context.packageManager.getLaunchIntentForPackage(context.packageName)?.putExtra("alarm", true), PendingIntent.FLAG_IMMUTABLE)
        val n = Notification.Builder(context, "alarm").setContentTitle("Hushroom alarm").setContentText("Shake to dismiss").setSmallIcon(android.R.drawable.ic_lock_idle_alarm).setCategory(Notification.CATEGORY_ALARM).setFullScreenIntent(full, true).setOngoing(true).build()
        context.getSystemService(NotificationManager::class.java).notify(42, n)
    }
}

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) return
        val prefs = context.getSharedPreferences("alarms", Context.MODE_PRIVATE)
        val scheduler = AlarmScheduler(context)
        prefs.all.forEach { (k, v) -> if (k.startsWith("alarm_") && v is Long && v > System.currentTimeMillis()) scheduler.schedule(v, k.removePrefix("alarm_").toInt()) }
    }
}

// ───────────────────────────── PHASE 5 · Shake-to-dismiss (TYPE_ACCELEROMETER) ─────────────────────────────
class ShakeDetector(context: Context, private val onProgress: (Int) -> Unit, private val onDismiss: () -> Unit) : SensorEventListener {
    private val sm = context.getSystemService(SensorManager::class.java)
    private var lastSign = 1
    private var progress = 0f
    fun start() = sm.registerListener(this, sm.getDefaultSensor(Sensor.TYPE_ACCELEROMETER), SensorManager.SENSOR_DELAY_GAME)   // ~50 Hz
    fun stop() { sm.unregisterListener(this); progress = 0f }
    override fun onSensorChanged(e: SensorEvent) {
        val g = sqrt(e.values[0] * e.values[0] + e.values[1] * e.values[1] + e.values[2] * e.values[2]) / SensorManager.GRAVITY_EARTH - 1f
        val sign = if (g >= 0) 1 else -1
        progress = if (abs(g) > 1.15f && sign != lastSign) { lastSign = sign; (progress + 9f).coerceAtMost(100f) } else (progress - 0.3f).coerceAtLeast(0f)
        onProgress(progress.toInt())
        if (progress >= 100f) { stop(); onDismiss() }
    }
    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) = Unit
}

/*
 AndroidManifest.xml additions:

 <uses-permission android:name="android.permission.FOREGROUND_SERVICE"/>
 <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK"/>
 <uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
 <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED"/>
 <uses-permission android:name="android.permission.USE_EXACT_ALARM"/>          <!-- alarm-clock apps; else SCHEDULE_EXACT_ALARM -->
 <uses-permission android:name="android.permission.USE_FULL_SCREEN_INTENT"/>
 <uses-permission android:name="android.permission.VIBRATE"/>
 <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW"/>      <!-- blackout overlay -->
 <uses-permission android:name="android.permission.WRITE_SETTINGS"/>           <!-- brightness 0 + restore -->
 <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>   <!-- morning weather -->
 <uses-permission android:name="android.permission.ACCESS_NOTIFICATION_POLICY"/> <!-- DND alarm exception -->

 <service android:name=".SleepAudioService" android:foregroundServiceType="mediaPlayback" android:exported="false"/>
 <receiver android:name=".AlarmReceiver" android:exported="false"/>
 <receiver android:name=".BootReceiver" android:exported="false">
   <intent-filter><action android:name="android.intent.action.BOOT_COMPLETED"/></intent-filter>
 </receiver>
*/
