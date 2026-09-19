import { AnimatePresence, motion } from "framer-motion";
import { ImageOff, Pointer, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import type { ArtRef } from "../data/art";
import { useApp } from "../state/store";

/* ---------- surfaces ---------- */
export function Sheet({ open, onClose, title, children, wide = false, kicker }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean; kicker?: string }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            role="dialog" aria-label={title}
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className={`sheet max-h-[88vh] w-full overflow-y-auto ${wide ? "max-w-3xl" : "max-w-xl"}`}
          >
            <div className="sticky top-0 z-10 -mx-5 -mt-5 mb-4 flex items-center justify-between rounded-t-[26px] bg-[var(--surface)]/95 px-5 pb-3 pt-4 backdrop-blur">
              <div>
                {kicker && <p className="kicker">{kicker}</p>}
                <h2 className="display text-2xl">{title}</h2>
              </div>
              <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Modal({ open, onClose, children, label }: { open: boolean; onClose: () => void; children: ReactNode; label: string }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[80] grid place-items-center bg-black/65 p-4 backdrop-blur" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div role="dialog" aria-label={label} initial={{ scale: 0.92, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ type: "spring", damping: 24, stiffness: 320 }} onClick={(e) => e.stopPropagation()} className="card w-full max-w-md p-6">
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function SectionTitle({ kicker, title, action }: { kicker: string; title: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div><p className="kicker">{kicker}</p><h2 className="display text-2xl sm:text-3xl">{title}</h2></div>
      {action}
    </div>
  );
}

/* ---------- controls ---------- */
export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-3">
      <span><span className="block text-sm font-semibold">{label}</span>{hint && <span className="block text-xs text-[var(--muted)]">{hint}</span>}</span>
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={`toggle ${checked ? "on" : ""}`}><span className="knob" /></button>
    </label>
  );
}

export function Chip({ active = false, onClick, children, className = "" }: { active?: boolean; onClick?: () => void; children: ReactNode; className?: string }) {
  return <button type="button" onClick={onClick} className={`chip ${active ? "active" : ""} ${className}`}>{children}</button>;
}

export function Slider({ value, min, max, step, onChange, label, vertical = false }: { value: number; min: number; max: number; step: number; onChange: (v: number) => void; label: string; vertical?: boolean }) {
  const input = <input aria-label={label} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className={`slider ${vertical ? "" : "w-full"}`} />;
  return vertical ? <span className="vslider">{input}</span> : input;
}

/* ---------- art ---------- */
export function Art({ art, className = "", rounded = "rounded-2xl" }: { art: ArtRef; className?: string; rounded?: string }) {
  const [failed, setFailed] = useState(false);
  if (!art.src || failed) return <MissingArt label={art.label} className={`${className} ${rounded}`} />;
  const q = art.quadrant;
  const style = q === undefined ? undefined : { width: "200%", height: "200%", transform: `translate(${q % 2 === 1 ? "-50%" : "0"}, ${q >= 2 ? "-50%" : "0"})` };
  return (
    <div className={`relative overflow-hidden ${rounded} ${className}`}>
      <img src={art.src} alt={art.label} onError={() => setFailed(true)} style={style} className={q === undefined ? "h-full w-full object-cover" : "absolute left-0 top-0 max-w-none object-cover"} draggable={false} />
    </div>
  );
}

export function MissingArt({ label, className = "" }: { label: string; className?: string }) {
  return (
    <div className={`missing-art grid place-items-center ${className}`} title="Art missing — drop a file in src/assets/art and it will appear here">
      <div className="text-center text-[var(--muted)]"><ImageOff size={18} className="mx-auto mb-1 opacity-70" /><span className="block text-[10px] uppercase tracking-[.18em]">missing</span><span className="block text-[10px] opacity-70">{label}</span></div>
    </div>
  );
}

/* ---------- first-time tips ---------- */
export function Tip({ id, text, variant = "tap", className = "" }: { id: string; text: string; variant?: "tap" | "hold" | "info"; className?: string }) {
  const { tipVisible, markTip } = useApp();
  if (!tipVisible(id)) return null;
  return (
    <motion.button
      type="button" onClick={(e) => { e.stopPropagation(); markTip(id); }}
      initial={{ opacity: 0, y: 6, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} transition={{ delay: 0.6, type: "spring", damping: 18 }}
      className={`tip ${className}`} aria-label={`Tip: ${text}. Tap to dismiss.`}
    >
      <span className={`tip-finger ${variant}`}><Pointer size={14} /></span>
      <span>{text}</span>
    </motion.button>
  );
}

/* ---------- hand-drawn icons (kept in the cozy-cartoon style) ---------- */
export function FoldedHands({ size = 22, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12 3.5v10" />
      <path d="M9.5 6.5 6.8 9.9a3 3 0 0 0-.6 1.8V16a4.5 4.5 0 0 0 4.5 4.5H12" />
      <path d="M14.5 6.5l2.7 3.4a3 3 0 0 1 .6 1.8V16a4.5 4.5 0 0 1-4.5 4.5H12" />
      <path d="M9.5 6.5 12 3.5l2.5 3" />
      <path d="M8 12.5 12 9l4 3.5" />
    </svg>
  );
}

export function SheepSvg({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 72" className={className} aria-hidden="true">
      <ellipse cx="50" cy="44" rx="30" ry="20" fill="#fbf6ee" stroke="#2d2a2e" strokeWidth="3" />
      <circle cx="30" cy="34" r="11" fill="#fbf6ee" stroke="#2d2a2e" strokeWidth="3" />
      <circle cx="70" cy="34" r="11" fill="#fbf6ee" stroke="#2d2a2e" strokeWidth="3" />
      <circle cx="50" cy="26" r="12" fill="#fbf6ee" stroke="#2d2a2e" strokeWidth="3" />
      <ellipse cx="74" cy="40" rx="11" ry="9" fill="#3b3540" stroke="#2d2a2e" strokeWidth="3" />
      <circle cx="77" cy="38" r="1.8" fill="#fff" /><circle cx="71" cy="38" r="1.8" fill="#fff" />
      <ellipse cx="66" cy="33" rx="5" ry="3" fill="#3b3540" transform="rotate(-25 66 33)" />
      <rect x="36" y="58" width="6" height="11" rx="3" fill="#3b3540" /><rect x="50" y="58" width="6" height="11" rx="3" fill="#3b3540" /><rect x="62" y="58" width="6" height="11" rx="3" fill="#3b3540" />
      <circle cx="82" cy="46" r="2.5" fill="#f6b8c6" />
    </svg>
  );
}

export function Price({ cents }: { cents: number }) {
  return <span className={`price ${cents === 0 ? "free" : ""}`}>{cents === 0 ? "Free" : `$${(cents / 100).toFixed(2)}`}</span>;
}
