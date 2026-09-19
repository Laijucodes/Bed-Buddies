import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, FastForward, FolderOpen, Heart, Pause, Play, Rewind, SlidersHorizontal, Trash2, Volume2, X } from "lucide-react";
import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { EQ_PRESETS, MASTER_EQ_FREQS, TRACK_EQ_FREQS } from "../audio/engine";
import { COVER_ART } from "../data/art";
import { PACK_BY_ID } from "../data/soundCatalog";
import { useApp } from "../state/store";
import { Art, Chip, Modal, Sheet, Slider, Tip } from "./ui";

type GState = "idle" | "pressed" | "armed" | "scrubbing";
const HOLD_MS = 500;
const TAP_MS = 350;
const SLOP = 10;
const DIRECTION = 36;
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export function MixFolder() {
  const app = useApp();
  const { state, playing, elapsed, togglePlay, seek, engine, haptic, markTip, notify, resolveSound, currentFavoriteId, saveFavorite, confirm, clearMix } = app;
  const tracks = state.mix.tracks;
  const g = useRef<{ state: GState; x0: number; y0: number; t0: number; timer: number; dx: number }>({ state: "idle", x0: 0, y0: 0, t0: 0, timer: 0, dx: 0 });
  const [armed, setArmed] = useState(false);
  const [scrub, setScrub] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mixerOpen, setMixerOpen] = useState(false);
  const [eqOpen, setEqOpen] = useState(false);
  const [eqTrack, setEqTrack] = useState<string | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState("");

  const reset = () => { window.clearTimeout(g.current.timer); g.current.state = "idle"; g.current.dx = 0; setArmed(false); setScrub(0); engine.setScrubRate(1); };

  const onDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    g.current = { state: "pressed", x0: e.clientX, y0: e.clientY, t0: performance.now(), dx: 0, timer: 0 };
    g.current.timer = window.setTimeout(() => {
      if (g.current.state !== "pressed") return;
      g.current.state = "armed"; setArmed(true); haptic(30); engine.click("soft"); markTip("folder-hold");
    }, HOLD_MS);
  };
  const onMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const cur = g.current; if (cur.state === "idle") return;
    const dx = e.clientX - cur.x0; const dy = e.clientY - cur.y0;
    if (cur.state === "pressed" && Math.hypot(dx, dy) > SLOP) { window.clearTimeout(cur.timer); cur.state = "idle"; return; }
    if (cur.state === "armed" && Math.abs(dx) > DIRECTION) { cur.state = "scrubbing"; haptic(12); }
    if (cur.state === "scrubbing") { cur.dx = dx; setScrub(dx); engine.setScrubRate(clamp(1 + dx / 220, 0.45, 2.2)); }
  };
  const onUp = () => {
    const cur = g.current;
    if (cur.state === "pressed" && performance.now() - cur.t0 < TAP_MS) togglePlay();
    else if (cur.state === "armed") { setMenuOpen(true); haptic(20); }
    else if (cur.state === "scrubbing") { const secs = Math.round(cur.dx / 6); seek(secs); notify(secs > 0 ? `Fast-forwarded ${secs}s` : `Rewound ${Math.abs(secs)}s`); }
    reset();
  };

  const covers = tracks.slice(0, 3).map((t) => resolveSound(t.soundId)).filter(Boolean);
  const trackName = (id: string) => resolveSound(id)?.title ?? id;

  const menuAction = (action: string) => {
    setMenuOpen(false);
    if (action === "Open") setMixerOpen(true);
    if (action === "Play" || action === "Pause") togglePlay();
    if (action === "Rewind") { seek(-15); engine.click("soft"); notify("Rewound 15s"); }
    if (action === "Forward") { seek(15); engine.click("soft"); notify("Forward 15s"); }
    if (action === "Delete") confirm({ title: "Delete this mix?", body: "All layers leave the folder. Saved favorites are kept.", confirmLabel: "Delete mix", danger: true, onConfirm: () => { clearMix(); notify("Mix cleared"); } });
  };

  return (
    <>
      <div className="fixed inset-x-0 bottom-[84px] z-40 flex justify-center px-3 md:bottom-[104px]">
        <div className="mix-bar relative w-full max-w-lg">
          <div className="relative">
            <button
              ref={(el) => { app.folderRef.current = el; }}
              onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={reset} onContextMenu={(e) => e.preventDefault()}
              className={`folder ${playing ? "playing" : ""} ${armed ? "armed" : ""} ${scrub !== 0 ? "scrubbing" : ""}`}
              aria-label={playing ? "Mix folder. Tap to pause, hold for options" : "Mix folder. Tap to play, hold for options"}
            >
              <span className="folder-tab" />
              <span className="folder-body">
                {covers.length === 0 ? <FolderOpen size={20} /> : covers.map((s, i) => <span key={s!.id} className="folder-thumb" style={{ transform: `translate(${i * 6 - 6}px, ${i * -3}px) rotate(${(i - 1) * 6}deg)` }}><Art art={COVER_ART[s!.cover]} rounded="rounded-md" className="h-full w-full" /></span>)}
                <span className="folder-play">{playing ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" className="ml-0.5" />}</span>
              </span>
              {tracks.length > 0 && <span className="folder-count">{tracks.length}</span>}
            </button>
            <AnimatePresence>
              {scrub !== 0 && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="scrub-label">
                  {scrub < 0 ? <Rewind size={14} /> : <FastForward size={14} />} {scrub < 0 ? "Rewinding" : "Fast-forward"} {Math.abs(Math.round(scrub / 6))}s
                </motion.div>
              )}
            </AnimatePresence>
            {tracks.length > 0 && <Tip id="folder-hold" text="Hold the folder: drag left to rewind, right to fast-forward, or stay for more." variant="hold" className="-top-16 left-0 w-60" />}
          </div>

          <button className="min-w-0 flex-1 text-left" onClick={() => { setMixerOpen(true); markTip("open-folder"); }} aria-label="Open the mix folder">
            <span className="flex items-baseline justify-between gap-2">
              <span className="truncate text-sm font-bold">{tracks.length ? tracks.map((t) => trackName(t.soundId)).join(" · ") : "Your mix folder is empty"}</span>
              <span className="tabular text-xs text-[var(--muted)]">{fmt(elapsed)}</span>
            </span>
            <span className="mt-1.5 flex h-3 items-end gap-[3px]" aria-hidden="true">
              {Array.from({ length: 26 }).map((_, i) => <motion.i key={i} animate={{ height: playing ? [3, 4 + ((i * 7) % 9), 3] : 3 }} transition={{ duration: 0.7 + (i % 4) * 0.13, repeat: Infinity }} className="w-[3px] rounded-full bg-[var(--accent)]" />)}
            </span>
          </button>

          <div className="relative flex items-center gap-1">
            <button className={`icon-btn ${currentFavoriteId ? "text-[#f27b93]" : ""}`} onClick={() => { if (!tracks.length) { notify("Add sounds first", "error"); return; } markTip("heart"); setName(""); setSaveOpen(true); }} aria-label="Save mix to favorites"><Heart size={18} fill={currentFavoriteId ? "currentColor" : "none"} /></button>
            <button className="icon-btn" onClick={() => { setEqTrack(null); setEqOpen(true); }} aria-label="Equalizer"><SlidersHorizontal size={18} /></button>
            {tracks.length > 0 && <Tip id="heart" text="Tap the heart to save this exact mix to Favorites." className="-top-16 right-0 w-52" />}
          </div>
        </div>
      </div>

      {/* Stationary long-press context overlay */}
      <Modal open={menuOpen} onClose={() => setMenuOpen(false)} label="Mix controls">
        <p className="kicker">Mix folder</p>
        <h3 className="display mb-3 text-2xl">What next?</h3>
        {[["Open", FolderOpen], [playing ? "Pause" : "Play", playing ? Pause : Play], ["Rewind", Rewind], ["Forward", FastForward], ["Delete", Trash2]].map(([label, Icon]) => {
          const I = Icon as typeof FolderOpen; const l = label as string;
          return <button key={l} onClick={() => menuAction(l)} className={`menu-row ${l === "Delete" ? "text-[var(--danger)]" : ""}`}><span className="flex items-center gap-3"><I size={18} />{l}</span><ChevronRight size={16} className="opacity-40" /></button>;
        })}
      </Modal>

      <MixerSheet open={mixerOpen} onClose={() => setMixerOpen(false)} onEq={(id) => { setEqTrack(id); setEqOpen(true); }} onSave={() => { setName(""); setSaveOpen(true); }} />

      <Sheet open={eqOpen} onClose={() => setEqOpen(false)} title="Equalizer" kicker={eqTrack ? trackName(eqTrack) : "Entire mix"}>
        <div className="mb-4 flex flex-wrap gap-2">
          <Chip active={eqTrack === null} onClick={() => setEqTrack(null)}>Whole mix</Chip>
          {tracks.map((t) => <Chip key={t.soundId} active={eqTrack === t.soundId} onClick={() => setEqTrack(t.soundId)}>{trackName(t.soundId)}</Chip>)}
        </div>
        {eqTrack === null ? (
          <>
            <div className="eq-grid">
              {MASTER_EQ_FREQS.map((f, i) => (
                <div key={f} className="eq-band">
                  <span className="tabular text-xs">{state.mix.masterEq[i] > 0 ? "+" : ""}{state.mix.masterEq[i].toFixed(1)}</span>
                  <Slider vertical label={`${f} Hz`} min={-12} max={12} step={0.5} value={state.mix.masterEq[i]} onChange={(v) => app.setMasterEq(state.mix.masterEq.map((g2, j) => (j === i ? v : g2)))} />
                  <span className="text-[10px] text-[var(--muted)]">{f >= 1000 ? `${f / 1000}k` : f}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">{Object.entries(EQ_PRESETS).map(([label, bands]) => <Chip key={label} active={bands.every((b, i) => b === state.mix.masterEq[i])} onClick={() => app.setMasterEq([...bands])}>{label}</Chip>)}</div>
          </>
        ) : (
          <div className="eq-grid three">
            {TRACK_EQ_FREQS.map((f, i) => {
              const track = tracks.find((t) => t.soundId === eqTrack); const val = track?.eq[i] ?? 0;
              return (
                <div key={f} className="eq-band">
                  <span className="tabular text-xs">{val > 0 ? "+" : ""}{val.toFixed(1)}</span>
                  <Slider vertical label={`${["Low", "Mid", "High"][i]} ${f} Hz`} min={-12} max={12} step={0.5} value={val} onChange={(v) => app.setTrackEq(eqTrack, i, v)} />
                  <span className="text-[10px] text-[var(--muted)]">{["Low", "Mid", "High"][i]}</span>
                </div>
              );
            })}
          </div>
        )}
        <p className="mt-4 text-xs text-[var(--muted)]">Peaking filters, ±12 dB, ramped to avoid zipper noise. The mix passes through a soft compressor and a −3 dB limiter after the EQ so stacked loops never clip.</p>
      </Sheet>

      <Modal open={saveOpen} onClose={() => setSaveOpen(false)} label="Save favorite">
        <p className="kicker">Favorites</p>
        <h3 className="display text-2xl">Name this mix</h3>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Rainy cabin night" maxLength={40} className="input mt-4" aria-label="Favorite name" />
        <p className="mt-2 text-xs text-[var(--muted)]">{tracks.map((t) => trackName(t.soundId)).join(" · ")}</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button className="btn-ghost" onClick={() => setSaveOpen(false)}>Cancel</button>
          <button className="btn-primary" onClick={() => { saveFavorite(name); setSaveOpen(false); }}><Heart size={16} /> Save</button>
        </div>
      </Modal>
    </>
  );
}

function MixerSheet({ open, onClose, onEq, onSave }: { open: boolean; onClose: () => void; onEq: (id: string) => void; onSave: () => void }) {
  const { state, playing, togglePlay, setTrackVolume, removeTrack, resolveSound, haptic, markTip, engine } = useApp();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [jiggle, setJiggle] = useState(false);
  const holdRef = useRef(0);
  const tracks = state.mix.tracks;

  const startJiggle = () => {
    setJiggle(true); haptic(35); engine.click("soft"); markTip("jiggle");
    document.body.classList.add("app-jiggle");
    window.setTimeout(() => document.body.classList.remove("app-jiggle"), 700);
  };

  return (
    <Sheet open={open} onClose={() => { setJiggle(false); onClose(); }} title="Mix folder" kicker={`${tracks.length} layer${tracks.length === 1 ? "" : "s"}`}>
      <div className="mb-3 flex items-center justify-between">
        <button className="btn-primary !px-4 !py-2" onClick={togglePlay}>{playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}{playing ? "Pause" : "Play"}</button>
        <div className="flex gap-2">
          {jiggle && <button className="btn-ghost !px-3 !py-2" onClick={() => setJiggle(false)}>Done</button>}
          <button className="btn-ghost !px-3 !py-2" onClick={onSave}><Heart size={15} /> Save</button>
        </div>
      </div>
      {tracks.length === 0 && <p className="py-8 text-center text-sm text-[var(--muted)]">Tap sound cards to fill this folder.</p>}
      <div className="relative">
        {tracks.length > 0 && <Tip id="jiggle" text="Press and hold a layer to enter jiggle mode and eject it." variant="hold" className="-top-10 left-0 w-60" />}
        <ul className="space-y-2">
          {tracks.map((t) => {
            const sound = resolveSound(t.soundId); if (!sound) return null;
            const isOpen = expanded === t.soundId;
            return (
              <motion.li layout key={t.soundId} className={`track-row ${jiggle ? "jiggling" : ""}`}
                onContextMenu={(e) => e.preventDefault()}
                onPointerDown={() => { holdRef.current = window.setTimeout(startJiggle, 500); }}
                onPointerUp={() => window.clearTimeout(holdRef.current)} onPointerLeave={() => window.clearTimeout(holdRef.current)} onPointerCancel={() => window.clearTimeout(holdRef.current)}
              >
                {jiggle && <button className="eject" onClick={() => removeTrack(t.soundId)} aria-label={`Remove ${sound.title}`}><X size={12} strokeWidth={3} /></button>}
                <button className="flex w-full items-center gap-3 text-left" onClick={() => { if (!jiggle) setExpanded(isOpen ? null : t.soundId); }}>
                  <Art art={COVER_ART[sound.cover]} className="h-12 w-12 shrink-0" rounded="rounded-xl" />
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{sound.title}</span><span className="block text-xs text-[var(--muted)]">{PACK_BY_ID[sound.packId]?.short ?? "Community"} · {Math.round(t.volume * 100)}%</span></span>
                  <span className="icon-btn" role="presentation" onClick={(e) => { e.stopPropagation(); onEq(t.soundId); }}><SlidersHorizontal size={15} /></span>
                  <Volume2 size={16} className="text-[var(--muted)]" />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ type: "spring", damping: 26, stiffness: 300 }} className="overflow-hidden">
                      <div className="flex items-center gap-3 px-1 pb-2 pt-3">
                        <Volume2 size={14} className="text-[var(--muted)]" />
                        <Slider label={`${sound.title} volume`} min={0} max={1} step={0.01} value={t.volume} onChange={(v) => setTrackVolume(t.soundId, v)} />
                        <span className="tabular w-10 text-right text-xs">{Math.round(t.volume * 100)}%</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.li>
            );
          })}
        </ul>
      </div>
    </Sheet>
  );
}
