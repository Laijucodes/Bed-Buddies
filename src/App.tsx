import { AnimatePresence, motion } from "framer-motion";
import { AlarmClock, CloudSun, Heart, Library, Moon, Settings, ShoppingBag, Sofa, Thermometer, Timer, Vibrate } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FavoritesView } from "./components/FavoritesView";
import { MixFolder } from "./components/MixFolder";
import { RoomView } from "./components/RoomView";
import { SettingsSheet } from "./components/SettingsSheet";
import { SoundsView } from "./components/SoundsView";
import { StoreView } from "./components/StoreView";
import { ThanksView } from "./components/ThanksView";
import { Art, FoldedHands, Modal, SheepSvg } from "./components/ui";
import { STORE_BY_ID } from "./data/storeCatalog";
import { AppProvider, useApp, type Tab } from "./state/store";

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}

function Shell() {
  const app = useApp();
  const { tab, setTab, theme, sleepEndsAt, setBlackout, thermal, blackout, state } = app;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { document.title = "Bed Buddies — Cozy Rain & Sleep ASMR"; }, []);
  useEffect(() => { if (!sleepEndsAt) return; const id = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(id); }, [sleepEndsAt]);
  const left = sleepEndsAt ? Math.max(0, sleepEndsAt - now) : 0;

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "sounds", label: "Sounds", icon: <Library size={20} /> },
    { id: "favorites", label: "Favorites", icon: <Heart size={20} fill={tab === "favorites" ? "currentColor" : "none"} /> },
    { id: "room", label: "Room", icon: <Sofa size={20} /> },
    { id: "store", label: "Store", icon: <ShoppingBag size={20} /> },
    { id: "thanks", label: "Thank you", icon: <FoldedHands size={21} /> },
  ];

  return (
    <div className="app-root min-h-screen" data-theme={theme.id}>
      <header className="fixed inset-x-0 top-0 z-50 flex h-[68px] items-center justify-between px-4 sm:px-6 md:px-10">
        <button className="flex items-center gap-2.5 text-left" onClick={() => setTab("sounds")} aria-label="Bed Buddies home">
          <span className="logo-mark" aria-hidden="true"><Moon size={16} /></span>
          <span><b className="display block text-lg leading-none">Bed Buddies</b><small className="block text-[10px] uppercase tracking-[.22em] text-[var(--muted)]">a softer night</small></span>
        </button>
        <div className="flex items-center gap-2">
          {sleepEndsAt && <button className="pill" onClick={() => setSettingsOpen(true)} aria-label="Sleep timer running"><Timer size={13} /> {Math.floor(left / 60000)}:{String(Math.floor((left % 60000) / 1000)).padStart(2, "0")}</button>}
          {thermal !== "nominal" && <span className="pill warn"><Thermometer size={13} /> {thermal}</span>}
          <button className="icon-btn glass" onClick={() => setBlackout(true)} aria-label="Blackout screen"><Moon size={17} /></button>
          <button className="icon-btn glass" onClick={() => setSettingsOpen(true)} aria-label="Settings"><Settings size={17} /></button>
        </div>
      </header>

      <main>
        {tab === "sounds" && <SoundsView />}
        {tab === "favorites" && <FavoritesView />}
        {tab === "room" && <RoomView />}
        {tab === "store" && <StoreView />}
        {tab === "thanks" && <ThanksView />}
      </main>

      {(tab === "sounds" || tab === "favorites") && <MixFolder />}

      <nav className="bottom-nav" aria-label="Main">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => { app.engine.click("soft"); setTab(t.id); }} className={`nav-item ${tab === t.id ? "active" : ""}`} aria-current={tab === t.id ? "page" : undefined}>
            {t.icon}<span>{t.label}</span>
            {t.id === "favorites" && state.favorites.length > 0 && <i className="nav-dot" />}
          </button>
        ))}
      </nav>

      <Flyers />
      <Toasts />
      <ConfirmDialog />
      <CozySheep />
      <AlarmOverlay />
      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <AnimatePresence>{blackout && <Blackout />}</AnimatePresence>
    </div>
  );
}

/* ---------- card → folder flyers ---------- */
function Flyers() {
  const { flyers, removeFlyer, folderRef } = useApp();
  return (
    <div className="pointer-events-none fixed inset-0 z-[60]">
      {flyers.map((f) => {
        const target = folderRef.current?.getBoundingClientRect();
        const tx = target ? target.left + target.width / 2 - 28 : window.innerWidth / 2;
        const ty = target ? target.top + target.height / 2 - 28 : window.innerHeight - 140;
        return (
          <motion.div key={f.id} initial={{ left: f.from.x, top: f.from.y, width: f.from.w, height: f.from.h, opacity: 1, rotate: 0 }} animate={{ left: tx, top: ty, width: 56, height: 56, opacity: 0.2, rotate: -8 }} transition={{ type: "spring", damping: 22, stiffness: 170, mass: 0.9 }} onAnimationComplete={() => removeFlyer(f.id)} className="absolute overflow-hidden rounded-2xl shadow-2xl">
            <Art art={f.art} className="h-full w-full" rounded="rounded-2xl" />
          </motion.div>
        );
      })}
    </div>
  );
}

function Toasts() {
  const { toasts } = useApp();
  return (
    <div className="pointer-events-none fixed left-1/2 top-20 z-[90] flex w-[min(92vw,420px)] -translate-x-1/2 flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div key={t.id} role="status" initial={{ opacity: 0, y: -10, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }} className={`toast ${t.tone}`}>{t.message}</motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function ConfirmDialog() {
  const { confirmState, closeConfirm, engine } = useApp();
  return (
    <Modal open={Boolean(confirmState)} onClose={() => { engine.stopPreview(); closeConfirm(); }} label={confirmState?.title ?? "Confirm"}>
      {confirmState && (
        <>
          <p className="kicker">Please confirm</p>
          <h3 className="display text-2xl">{confirmState.title}</h3>
          {confirmState.body && <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{confirmState.body}</p>}
          {confirmState.price && <p className="display mt-4 text-3xl">{confirmState.price}</p>}
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button className="btn-ghost" onClick={() => { engine.stopPreview(); closeConfirm(); }}>Not now</button>
            <button className={confirmState.danger ? "btn-danger" : "btn-primary"} onClick={() => { const fn = confirmState.onConfirm; engine.stopPreview(); closeConfirm(); fn(); }}>{confirmState.confirmLabel ?? "Confirm"}</button>
          </div>
        </>
      )}
    </Modal>
  );
}

/* ---------- Cozy Sheep mascot: leaps across the safe strip under the header ---------- */
function CozySheep() {
  const { adsRemoved, thermal, confirm, purchase, notify, engine } = useApp();
  const [visible, setVisible] = useState(false);
  const [run, setRun] = useState(0);
  const frozen = thermal === "serious" || thermal === "critical";
  useEffect(() => {
    if (adsRemoved || frozen) { setVisible(false); return; }
    let timer = window.setTimeout(function hop() { setVisible(true); setRun((r) => r + 1); timer = window.setTimeout(hop, 45_000 + Math.random() * 40_000); }, 9_000);
    return () => window.clearTimeout(timer);
  }, [adsRemoved, frozen]);
  if (!visible || adsRemoved || frozen) return null;
  const width = typeof window !== "undefined" ? window.innerWidth : 800;
  return (
    <motion.button
      key={run} initial={{ x: width + 90, y: 0 }} animate={{ x: -120, y: [0, -46, 0, -34, 0, -50, 0, -30, 0] }} transition={{ x: { duration: 7.5, ease: "linear" }, y: { duration: 7.5, ease: "easeInOut", times: [0, 0.14, 0.26, 0.4, 0.5, 0.66, 0.78, 0.9, 1] } }}
      onAnimationComplete={() => setVisible(false)}
      onClick={() => { engine.click("pop"); setVisible(false); confirm({ title: "Meet the cozy sheep", body: "One $5.00 lifetime pass removes every ad. Keep the TV as ambient art or remove it from your room. No subscriptions.", price: "$5.00", confirmLabel: "Remove ads forever", onConfirm: () => { const item = STORE_BY_ID.remove_ads; if (item) purchase(item); else notify("Store item missing"); } }); }}
      className="sheep" aria-label="Cozy sheep: learn about removing ads"
    >
      <SheepSvg className="h-full w-full" />
    </motion.button>
  );
}

/* ---------- Blackout overlay (true #000, swipe up to wake) ---------- */
function Blackout() {
  const { setBlackout, playing } = useApp();
  const y0 = useRef(0);
  const [hint, setHint] = useState(false);
  useEffect(() => { const id = window.setTimeout(() => setHint(true), 1500); return () => window.clearTimeout(id); }, []);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-black" style={{ touchAction: "none" }}
      onPointerDown={(e) => { y0.current = e.clientY; }} onPointerUp={(e) => { if (y0.current - e.clientY > 48) setBlackout(false); }} role="button" aria-label="Screen blackout. Swipe up to wake." tabIndex={0} onKeyDown={(e) => { if (e.key === "Escape") setBlackout(false); }}>
      {hint && <p className="absolute bottom-10 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[.3em] text-white/20">{playing ? "playing · " : ""}swipe up to wake</p>}
    </motion.div>
  );
}

/* ---------- Alarm overlay with shake-to-dismiss & morning weather ---------- */
function AlarmOverlay() {
  const { alarmRinging, dismissAlarm, snoozeAlarm, state, weather, notify } = useApp();
  const [progress, setProgress] = useState(0);
  const [motionReady, setMotionReady] = useState(false);
  const holdRef = useRef(0);
  const lastRef = useRef({ mag: 9.8, sign: 1, peaks: 0 });
  const alarm = state.settings.alarm;

  useEffect(() => { if (weather) notify(`Good morning — ${weather.temp}°C and ${weather.label}.`, "success"); }, [notify, weather]);
  useEffect(() => {
    if (!alarmRinging || !alarm.shakeToDismiss || !motionReady) return;
    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity; if (!a) return;
      const mag = Math.hypot(a.x ?? 0, a.y ?? 0, a.z ?? 0);
      const delta = mag - 9.81; const sign = delta > 0 ? 1 : -1;
      if (Math.abs(delta) > 11 && sign !== lastRef.current.sign) { lastRef.current.sign = sign; lastRef.current.peaks += 1; setProgress((p) => Math.min(100, p + 9)); }
    };
    window.addEventListener("devicemotion", onMotion);
    const decay = window.setInterval(() => setProgress((p) => Math.max(0, p - 3)), 400);
    return () => { window.removeEventListener("devicemotion", onMotion); window.clearInterval(decay); };
  }, [alarm.shakeToDismiss, alarmRinging, motionReady]);
  useEffect(() => { if (progress >= 100 && alarmRinging) { setProgress(0); dismissAlarm(); } }, [alarmRinging, dismissAlarm, progress]);
  useEffect(() => { if (!alarmRinging) { setProgress(0); lastRef.current = { mag: 9.8, sign: 1, peaks: 0 }; } }, [alarmRinging]);

  const enableMotion = async () => {
    const DM = DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> };
    if (typeof DM.requestPermission === "function") { try { const r = await DM.requestPermission(); setMotionReady(r === "granted"); } catch { setMotionReady(false); } }
    else setMotionReady(true);
  };

  return (
    <AnimatePresence>
      {alarmRinging && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[210] grid place-items-center bg-[var(--bg)] p-6">
          <div className="w-full max-w-sm text-center">
            <motion.div animate={{ rotate: [0, -10, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 0.8 }} className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-[28px] bg-[var(--accent)] text-[var(--accent-ink)]"><AlarmClock size={36} /></motion.div>
            <p className="kicker">Smart alarm</p>
            <h2 className="display text-6xl">{alarm.time}</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">{alarm.shakeToDismiss ? "Keep shaking the phone to turn it off." : "Hold the button to turn it off."}</p>
            {alarm.shakeToDismiss && (
              <div className="mt-5">
                {!motionReady ? <button className="btn-primary w-full" onClick={() => void enableMotion()}><Vibrate size={16} /> Enable shake sensor</button> : <div className="progress big"><span style={{ width: `${progress}%` }} /></div>}
              </div>
            )}
            <button className="btn-ghost mt-4 w-full" onPointerDown={() => { holdRef.current = window.setTimeout(dismissAlarm, 1800); }} onPointerUp={() => window.clearTimeout(holdRef.current)} onPointerLeave={() => window.clearTimeout(holdRef.current)}>Hold 2 s to dismiss</button>
            <div className="mt-4 flex flex-wrap justify-center gap-2">{alarm.snoozeOptions.map((m) => <button key={m} className="chip" onClick={() => snoozeAlarm(m)}>Snooze {m}m</button>)}</div>
            <p className="mt-6 flex items-center justify-center gap-2 text-xs text-[var(--muted)]"><CloudSun size={14} /> {alarm.weather ? "Weather arrives right after you dismiss." : "Morning weather is off."}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
