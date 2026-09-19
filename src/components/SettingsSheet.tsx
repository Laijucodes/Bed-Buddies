import { AlarmClock, Camera, ChevronDown, LogIn, LogOut, Moon, Palette, ShieldAlert, Thermometer, Timer, Tv, UserRound } from "lucide-react";
import { useRef, useState } from "react";
import { CATALOG_STATS, catalogIssues } from "../data/soundCatalog";
import { HOLIDAY_CAMPAIGNS } from "../data/storeCatalog";
import { useApp, type ThermalLevel } from "../state/store";
import { Chip, Sheet, Slider, Toggle } from "./ui";

const TIMER_STEPS = [30, 45, 60, 90, 120, 150, 180];

export function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const app = useApp();
  const { state, updateSettings, updateAlarm, unlockedThemes, theme, account, login, register, logout, setProfilePhoto, sleepEndsAt, startSleepTimer, cancelSleepTimer, thermal, setThermal, activeCampaign, setCampaign, simulateDay, adsRemoved, setBlackout, confirm, notify, ringAlarm } = app;
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [name, setName] = useState(""); const [error, setError] = useState<string | null>(null);
  const [devOpen, setDevOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const issues = catalogIssues();
  const s = state.settings;

  const submitAuth = async () => {
    const err = mode === "login" ? await login(email, password) : await register(email, password, name);
    setError(err); if (!err) { setEmail(""); setPassword(""); setName(""); }
  };

  const onPhotoFile = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) { notify("Please pick an image under 4 MB", "error"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const size = 192; const canvas = document.createElement("canvas");
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext("2d"); if (!ctx) return;
        const min = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - min) / 2, (img.height - min) / 2, min, min, 0, 0, size, size);
        setProfilePhoto(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <Sheet open={open} onClose={onClose} title="Settings" kicker="Bed Buddies" wide>
      {/* Account & profile picture */}
      <section className="settings-block">
        <h3 className="settings-title"><UserRound size={16} /> Account & profile</h3>
        <div className="mb-3 flex items-center gap-4">
          <button className="profile-photo" onClick={() => fileRef.current?.click()} aria-label="Change profile picture">
            {state.profilePhoto ? <img src={state.profilePhoto} alt="Your profile" /> : <UserRound size={26} className="opacity-50" />}
            <span className="profile-photo-badge"><Camera size={12} /></span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPhotoFile(e.target.files?.[0])} />
          <div className="min-w-0 flex-1">
            <b className="block">{account ? account.displayName : "Guest listener"}</b>
            <span className="block text-xs text-[var(--muted)]">{account ? account.email : "Progress is saved on this device. Create an account to keep it forever."}</span>
          </div>
          {account && <button className="btn-ghost !py-2" onClick={logout}><LogOut size={15} /> Sign out</button>}
        </div>
        {!account && (
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <div>
              <div className="mb-2 flex gap-2"><Chip active={mode === "login"} onClick={() => setMode("login")}>Sign in</Chip><Chip active={mode === "register"} onClick={() => setMode("register")}>Create account</Chip></div>
              {mode === "register" && <input className="input mb-2" placeholder="Display name" value={name} onChange={(e) => setName(e.target.value)} aria-label="Display name" />}
              <input className="input mb-2" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email" />
              <input className="input" type="password" placeholder="Password (8+ characters)" value={password} onChange={(e) => setPassword(e.target.value)} aria-label="Password" />
              {error && <p className="mt-2 text-xs text-[var(--danger)]">{error}</p>}
              <p className="mt-2 text-[11px] text-[var(--muted)]">Preview auth is stored on this device only. The store build uses Supabase Auth with email verification and passkeys.</p>
            </div>
            <div className="flex flex-col gap-2"><button className="btn-primary" onClick={() => void submitAuth()}><LogIn size={15} /> {mode === "login" ? "Sign in" : "Create"}</button></div>
          </div>
        )}
      </section>

      {/* Theme */}
      <section className="settings-block">
        <h3 className="settings-title"><Palette size={16} /> Theme</h3>
        <label className="select-wrap">
          <select value={theme.id} onChange={(e) => updateSettings({ themeId: e.target.value })} aria-label="Theme">
            {unlockedThemes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <ChevronDown size={16} />
        </label>
        <p className="mt-2 text-xs text-[var(--muted)]">{theme.blurb} · {unlockedThemes.length} unlocked. Buy interiors or themes in the store to add more.</p>
        <div className="mt-3 flex gap-2">{unlockedThemes.map((t) => <button key={t.id} aria-label={t.name} onClick={() => updateSettings({ themeId: t.id })} className={`swatch ${theme.id === t.id ? "active" : ""}`} style={{ background: `linear-gradient(135deg, ${t.swatches[0]} 0 45%, ${t.swatches[1]} 45% 75%, ${t.swatches[2]} 75%)` }} />)}</div>
        <Toggle checked={s.tipsEnabled} onChange={(v) => updateSettings({ tipsEnabled: v })} label="Show helpful tips" hint="First-time hints like “hold the folder”" />
        <Toggle checked={s.haptics} onChange={(v) => updateSettings({ haptics: v })} label="Haptic feedback" hint="Vibration on long-press and confirmations" />
      </section>

      {/* Sleep */}
      <section className="settings-block">
        <h3 className="settings-title"><Timer size={16} /> Sleep timer & blackout</h3>
        <div className="flex items-baseline justify-between"><span className="display text-4xl">{s.sleepTimerMinutes}<span className="ml-1 text-sm text-[var(--muted)]">min</span></span>{sleepEndsAt && <span className="text-xs text-[var(--accent)]">fading out at {new Date(sleepEndsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}</div>
        <Slider label="Sleep timer" min={30} max={180} step={15} value={s.sleepTimerMinutes} onChange={(v) => updateSettings({ sleepTimerMinutes: v })} />
        <div className="mt-2 flex flex-wrap gap-2">{TIMER_STEPS.map((m) => <Chip key={m} active={s.sleepTimerMinutes === m} onClick={() => updateSettings({ sleepTimerMinutes: m })}>{m >= 60 ? `${m / 60}h${m % 60 ? ` ${m % 60}` : ""}` : `${m}m`}</Chip>)}</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {sleepEndsAt ? <button className="btn-ghost" onClick={() => { cancelSleepTimer(); notify("Sleep timer cancelled"); }}>Cancel timer</button> : <button className="btn-primary" onClick={() => startSleepTimer(s.sleepTimerMinutes)}><Timer size={15} /> Start timer</button>}
          <button className="btn-ghost" onClick={() => { onClose(); setBlackout(true); }}><Moon size={15} /> Blackout screen</button>
        </div>
        <p className="mt-2 text-xs text-[var(--muted)]">At the end the mix fades for 30 s, then audio is suspended so the device can sleep.</p>
      </section>

      {/* Television */}
      <section className="settings-block">
        <h3 className="settings-title"><Tv size={16} /> Television</h3>
        {adsRemoved ? (
          <div className="flex flex-wrap gap-2">{(["ambient", "static", "removed"] as const).map((m) => <Chip key={m} active={s.tvMode === m} onClick={() => updateSettings({ tvMode: m })}>{m === "ambient" ? "Ambient cozy loop" : m === "static" ? "Silent static" : "Remove TV from room"}</Chip>)}</div>
        ) : <p className="text-sm text-[var(--muted)]">The TV shows muted ads inside its frame. Buy the $5.00 pass in the store to switch it to ambient art or remove it.</p>}
      </section>

      {/* Content */}
      <section className="settings-block">
        <h3 className="settings-title"><ShieldAlert size={16} /> Content</h3>
        <Toggle checked={s.matureContent} onChange={(v) => { if (!v) { updateSettings({ matureContent: false }); return; } confirm({ title: "Enable Vocal ASMR (18+)?", body: "Soft sleepy voices and breathing loops. Confirm you are an adult.", confirmLabel: "I'm 18+, enable", onConfirm: () => updateSettings({ matureContent: true }) }); }} label="Vocal ASMR (18+)" hint="Off by default. Shows the Vocal pack on the Sounds page" />
      </section>

      {/* Alarm */}
      <section className="settings-block">
        <h3 className="settings-title"><AlarmClock size={16} /> Smart alarm</h3>
        <Toggle checked={s.alarm.enabled} onChange={(v) => updateAlarm({ enabled: v })} label="Alarm enabled" hint="Rings through the app's own audio session, so it ignores the silent switch while the app is alive" />
        <div className="flex flex-wrap items-center gap-3">
          <input type="time" className="input !w-auto" value={s.alarm.time} onChange={(e) => updateAlarm({ time: e.target.value })} aria-label="Alarm time" />
          <span className="text-xs text-[var(--muted)]">Snooze:</span>{s.alarm.snoozeOptions.map((m) => <Chip key={m} active={s.alarm.snoozeMinutes === m} onClick={() => updateAlarm({ snoozeMinutes: m })}>{m} min</Chip>)}
        </div>
        <Toggle checked={s.alarm.shakeToDismiss} onChange={(v) => updateAlarm({ shakeToDismiss: v })} label="Shake to dismiss" hint="Sustain a shake (accelerometer) to stop the alarm" />
        <Toggle checked={s.alarm.weather} onChange={(v) => updateAlarm({ weather: v })} label="Morning weather" hint="Fetches local weather (Open-Meteo) after you dismiss" />
        <Toggle checked={s.alarm.forceSpeaker} onChange={(v) => updateAlarm({ forceSpeaker: v })} label="Force phone speaker" hint="Native only: routes the alarm to the built-in speaker even with Bluetooth connected" />
        <button className="btn-ghost mt-2 !py-2" onClick={() => { onClose(); ringAlarm(); }}>Test alarm now</button>
      </section>

      {/* Developer */}
      <section className="settings-block">
        <button className="settings-title w-full justify-between" onClick={() => setDevOpen((v) => !v)}><span className="flex items-center gap-2"><Thermometer size={16} /> Developer panel (preview of the web admin)</span><ChevronDown size={16} className={devOpen ? "rotate-180" : ""} /></button>
        {devOpen && (
          <div className="mt-3 space-y-4 text-sm">
            <div>
              <p className="kicker mb-1">Thermal simulation</p>
              <div className="flex flex-wrap gap-2">{(["nominal", "fair", "serious", "critical"] as ThermalLevel[]).map((t) => <Chip key={t} active={thermal === t} onClick={() => setThermal(t)}>{t}</Chip>)}</div>
              <p className="mt-1 text-xs text-[var(--muted)]">Serious/critical: audio, TV, pets and the sheep stop; only blackout and the alarm keep running.</p>
            </div>
            <div>
              <p className="kicker mb-1">Holiday campaign</p>
              <div className="flex flex-wrap gap-2"><Chip active={!activeCampaign} onClick={() => setCampaign(null)}>Off</Chip>{HOLIDAY_CAMPAIGNS.map((c) => <Chip key={c.id} active={activeCampaign?.id === c.id} onClick={() => setCampaign(c.id)}>{c.name}</Chip>)}</div>
              {activeCampaign && <div className="mt-2 flex items-center gap-3 text-xs"><span>{state.holiday.openDays.length}/{activeCampaign.requiredDays} daily opens</span><button className="btn-ghost !px-3 !py-1" onClick={simulateDay}>Simulate a day</button></div>}
            </div>
            <div>
              <p className="kicker mb-1">Catalog audit (Rule of 3)</p>
              <p className="text-xs text-[var(--muted)]">{CATALOG_STATS.packs} packs · {CATALOG_STATS.sounds} loops · {CATALOG_STATS.free} free · {CATALOG_STATS.premium} premium</p>
              {issues.length === 0 ? <p className="mt-1 text-xs text-[var(--accent)]">All sold packs have ≥3 free loops. Publishable.</p> : issues.map((i) => <p key={i} className="mt-1 text-xs text-[var(--danger)]">{i}</p>)}
              <p className="mt-2 text-xs text-[var(--muted)]">Real administration (uploads, bans, pricing) lives only in the separate Next.js admin with passkeys — never in this app. See docs/ARCHITECTURE.md.</p>
            </div>
          </div>
        )}
      </section>
    </Sheet>
  );
}
