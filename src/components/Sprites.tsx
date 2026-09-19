import type { Species, SpriteKey } from "../data/storeCatalog";
import type { AvatarConfig } from "../state/store";

export type ActorMode = "wander" | "idle" | "sit" | "sleep" | "play" | "use" | "watch";
const INK = "#2d2a2e";
const S = { stroke: INK, strokeWidth: 2.6, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

/* ------------------------------------------------------------------ pets */
type PetStyle = { body: string; belly: string; ear: string; earShape: "point" | "round" | "floppy"; tail: "thin" | "curl" | "fluffy" | "ring" | "big"; mask?: string };
const PETS: Record<Species, PetStyle> = {
  cat: { body: "#f6dcb4", belly: "#fff7ea", ear: "#f4b0b8", earShape: "point", tail: "thin" },
  dog: { body: "#dba46b", belly: "#f8e8cf", ear: "#b8783f", earShape: "floppy", tail: "curl" },
  fox: { body: "#f38d4d", belly: "#fff4e8", ear: INK, earShape: "point", tail: "fluffy" },
  "red-panda": { body: "#cf5a2f", belly: "#3d2b27", ear: "#fff4e8", earShape: "round", tail: "ring", mask: "#fff4e8" },
  squirrel: { body: "#ad6c3f", belly: "#f8e8cf", ear: "#ad6c3f", earShape: "point", tail: "big" },
  raccoon: { body: "#9494a3", belly: "#dcdce4", ear: "#66666f", earShape: "round", tail: "ring", mask: "#3b3540" },
  pig: { body: "#f7bccb", belly: "#fbdbe3", ear: "#f3a2b5", earShape: "floppy", tail: "curl" },
};

export function PetSprite({ species, mode, facing }: { species: Species; mode: ActorMode; facing: "left" | "right" }) {
  const p = PETS[species];
  const asleep = mode === "sleep";
  const cls = mode === "wander" ? "walk" : mode === "play" ? "hop" : asleep ? "breathe" : "";
  return (
    <svg viewBox="0 0 84 64" className={`sprite pet ${cls}`} style={{ transform: facing === "left" ? "scaleX(-1)" : undefined }} aria-hidden="true">
      {p.tail === "thin" && <path d="M22 40 C10 36 8 22 18 18" fill="none" {...S} strokeWidth={5} stroke={p.body} />}
      {p.tail === "thin" && <path d="M22 40 C10 36 8 22 18 18" fill="none" {...S} strokeWidth={8} stroke={INK} opacity={0.0} />}
      {p.tail === "curl" && <circle cx="21" cy="32" r="6" fill="none" {...S} stroke={p.body} strokeWidth={5} />}
      {p.tail === "fluffy" && <><ellipse cx="16" cy="34" rx="12" ry="8" fill={p.body} {...S} /><ellipse cx="8" cy="36" rx="5" ry="4" fill={p.belly} /></>}
      {p.tail === "ring" && <><ellipse cx="16" cy="32" rx="11" ry="7" fill={p.body} {...S} /><path d="M9 28 v8 M14 26 v12 M19 26 v12" stroke={p.mask ?? p.belly} strokeWidth={2.5} strokeLinecap="round" /></>}
      {p.tail === "big" && <ellipse cx="18" cy="26" rx="10" ry="16" fill={p.body} {...S} />}
      <g className="legs">
        <rect className="leg-a" x="30" y="46" width="7" height="14" rx="3.5" fill={p.body} {...S} />
        <rect className="leg-b" x="42" y="46" width="7" height="14" rx="3.5" fill={p.body} {...S} />
        <rect className="leg-a" x="54" y="46" width="7" height="14" rx="3.5" fill={p.body} {...S} />
      </g>
      <ellipse cx="44" cy="40" rx="22" ry="14" fill={p.body} {...S} />
      <ellipse cx="46" cy="46" rx="12" ry="6" fill={p.belly} />
      {p.earShape === "point" && <><path d="M52 18 L55 6 L61 17Z" fill={p.ear} {...S} /><path d="M63 16 L69 6 L72 18Z" fill={p.ear} {...S} /></>}
      {p.earShape === "round" && <><circle cx="55" cy="13" r="6" fill={p.ear} {...S} /><circle cx="70" cy="13" r="6" fill={p.ear} {...S} /></>}
      {p.earShape === "floppy" && <><ellipse cx="52" cy="24" rx="5" ry="10" fill={p.ear} {...S} /><ellipse cx="73" cy="24" rx="5" ry="10" fill={p.ear} {...S} /></>}
      <circle cx="62" cy="26" r="13" fill={p.body} {...S} />
      {p.mask && <ellipse cx="62" cy="26" rx="10" ry="5" fill={p.mask} />}
      {asleep ? <><path d="M55 26 h5 M64 26 h5" {...S} strokeWidth={2.2} /><text x="72" y="12" fontSize="9" fontWeight="800" fill={INK} className="zzz">z</text></> : <><circle cx="57.5" cy="25" r="1.9" fill={INK} /><circle cx="66.5" cy="25" r="1.9" fill={INK} /></>}
      <ellipse cx="62" cy="31" rx="2.4" ry="1.6" fill={species === "pig" ? "#e88ba4" : INK} />
      <circle cx="54" cy="30" r="2.2" fill="#f6b8c6" opacity="0.8" /><circle cx="70" cy="30" r="2.2" fill="#f6b8c6" opacity="0.8" />
    </svg>
  );
}

/* ------------------------------------------------------------------ furniture & decor */
const shade = (hex: string, amount: number): string => {
  const n = parseInt(hex.replace("#", ""), 16);
  const mix = (c: number) => Math.max(0, Math.min(255, Math.round(c + (amount > 0 ? (255 - c) * amount : c * amount))));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map(mix).map((c) => c.toString(16).padStart(2, "0")).join("")}`;
};

export function FurnitureSprite({ sprite, tint }: { sprite: SpriteKey; tint?: string }) {
  const t = tint;
  switch (sprite) {
    case "rug": return <svg viewBox="0 0 120 70" className="sprite furniture" aria-hidden="true"><path d="M60 6 L114 35 L60 64 L6 35Z" fill={t ?? "#cfe3c4"} {...S} /><path d="M60 16 L96 35 L60 54 L24 35Z" fill={t ? shade(t, 0.28) : "#f2c9a0"} stroke={t ? shade(t, -0.15) : "#e5a878"} strokeWidth={2} strokeDasharray="4 4" /><path d="M60 26 L78 35 L60 44 L42 35Z" fill={t ? shade(t, 0.5) : "#f6b8c6"} /></svg>;
    case "carpet": return <svg viewBox="0 0 150 80" className="sprite furniture" aria-hidden="true"><ellipse cx="75" cy="40" rx="70" ry="34" fill={t ?? "#e8c9a0"} {...S} /><ellipse cx="75" cy="40" rx="52" ry="24" fill={t ? shade(t, 0.22) : "#f2ddc0"} stroke={t ? shade(t, -0.15) : "#d8b088"} strokeWidth={2} strokeDasharray="5 5" /><ellipse cx="75" cy="40" rx="28" ry="13" fill={t ? shade(t, 0.42) : "#fbf0dc"} /></svg>;
    case "mat": return <svg viewBox="0 0 90 46" className="sprite furniture" aria-hidden="true"><rect x="5" y="8" width="80" height="30" rx="12" fill={t ?? "#a9d6b6"} {...S} /><rect x="14" y="15" width="62" height="16" rx="8" fill={t ? shade(t, 0.3) : "#c8e8d0"} stroke={t ? shade(t, -0.15) : "#8fc3a0"} strokeWidth={2} strokeDasharray="4 4" /></svg>;
    case "pillow": return <svg viewBox="0 0 90 66" className="sprite furniture squish" aria-hidden="true"><path d="M12 20 Q45 6 78 20 Q86 40 78 52 Q45 64 12 52 Q4 40 12 20Z" fill={t ?? "#f6b8c6"} {...S} /><path d="M22 30 Q45 22 68 30" fill="none" stroke={t ? shade(t, -0.2) : "#e094a8"} strokeWidth={2.4} strokeLinecap="round" /><circle cx="45" cy="42" r="3.4" fill={t ? shade(t, 0.4) : "#fbe3e8"} /></svg>;
    case "blanket": return <svg viewBox="0 0 100 64" className="sprite furniture" aria-hidden="true"><rect x="10" y="14" width="80" height="42" rx="10" fill={t ?? "#cfe3c4"} {...S} /><rect x="10" y="26" width="80" height="8" fill={t ? shade(t, 0.28) : "#e6f2dc"} /><rect x="10" y="42" width="80" height="8" fill={t ? shade(t, 0.28) : "#e6f2dc"} /><path d="M10 56 q6 6 12 0 q6 6 12 0 q6 6 12 0 q6 6 12 0 q6 6 12 0 q6 6 12 0 q6 6 8 0" fill="none" {...S} strokeWidth={2.2} /></svg>;
    case "poster": return <svg viewBox="0 0 76 96" className="sprite" aria-hidden="true"><rect x="6" y="6" width="64" height="84" rx="6" fill="#f8f0e0" {...S} /><rect x="13" y="13" width="50" height="70" rx="4" fill={t ?? "#3c4a72"} /><circle cx="48" cy="34" r="10" fill="#ffe9a8" /><path d="M20 66 l10 -12 8 8 9 -13 9 17z" fill={t ? shade(t, -0.35) : "#27314e"} /><circle cx="26" cy="28" r="1.8" fill="#fff" opacity="0.9" /><circle cx="34" cy="22" r="1.4" fill="#fff" opacity="0.7" /></svg>;
    case "banner": return <svg viewBox="0 0 150 56" className="sprite" aria-hidden="true"><path d="M4 10 q71 26 142 0" fill="none" {...S} strokeWidth={2.6} />{[16, 42, 68, 94, 120].map((x, i) => <path key={x} className={`swing s${i % 2}`} d={`M${x} ${14 + (i % 2) * 4} h22 l-11 22z`} fill={i % 2 ? (t ?? "#f2c9a0") : t ? shade(t, 0.35) : "#a9d6b6"} {...S} strokeWidth={2.2} />)}</svg>;
    case "shelf-wall": return <svg viewBox="0 0 120 66" className="sprite" aria-hidden="true"><rect x="6" y="38" width="108" height="10" rx="4" fill={t ?? "#d9a066"} {...S} /><path d="M22 48 l-6 14 M98 48 l6 14" {...S} strokeWidth={3} /><rect x="18" y="14" width="10" height="24" rx="2" fill="#e8a2a8" {...S} strokeWidth={2} /><rect x="30" y="18" width="10" height="20" rx="2" fill="#b3c9f2" {...S} strokeWidth={2} /><ellipse cx="62" cy="30" rx="9" ry="8" fill="#6fbf7f" {...S} strokeWidth={2} /><rect x="58" y="34" width="8" height="6" fill="#e9a37a" {...S} strokeWidth={2} /><circle cx="92" cy="28" r="8" fill="#ffe08a" {...S} strokeWidth={2} /></svg>;
    case "curtain": return <svg viewBox="0 0 110 120" className="sprite" aria-hidden="true"><rect x="4" y="6" width="102" height="8" rx="4" fill="#d9a066" {...S} strokeWidth={2.2} /><path d="M12 14 q-4 50 6 100 q10 -6 16 0 q2 -52 -4 -100z" fill={t ?? "#b3c9f2"} {...S} /><path d="M98 14 q4 50 -6 100 q-10 -6 -16 0 q-2 -52 4 -100z" fill={t ?? "#b3c9f2"} {...S} /><path d="M20 40 q6 4 10 0 M80 40 q6 4 10 0" fill="none" stroke={t ? shade(t, -0.25) : "#8fa9dc"} strokeWidth={2.2} strokeLinecap="round" /><path d="M14 84 q8 8 16 0 M80 84 q8 8 16 0" fill="none" stroke={t ? shade(t, -0.25) : "#8fa9dc"} strokeWidth={2.2} strokeLinecap="round" /></svg>;
    case "wreath": return <svg viewBox="0 0 90 96" className="sprite sway" aria-hidden="true"><circle cx="45" cy="48" r="28" fill="none" stroke={t ?? "#6fbf7f"} strokeWidth={14} /><circle cx="45" cy="48" r="28" fill="none" {...S} strokeWidth={2} opacity="0.4" />{[[45, 18], [68, 32], [72, 58], [52, 76], [24, 68], [18, 40], [30, 24]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3.4" fill={i % 2 ? "#e2626a" : "#ffe08a"} {...S} strokeWidth={1.6} />)}<path d="M38 74 h14 l-7 10z" fill="#e2626a" {...S} strokeWidth={2} /></svg>;
    case "ceiling-light": return <svg viewBox="0 0 80 110" className="sprite" aria-hidden="true"><path d="M40 0 v26" {...S} strokeWidth={3} /><path d="M14 52 Q40 18 66 52 Z" fill={t ?? "#ffe08a"} {...S} /><circle cx="40" cy="58" r="9" fill="#fff4d0" {...S} strokeWidth={2.4} /><circle cx="40" cy="62" r="26" fill={t ?? "#ffe08a"} opacity="0.22" className="glow" /></svg>;
    case "ceiling-fan": return <svg viewBox="0 0 140 80" className="sprite" aria-hidden="true"><path d="M70 0 v18" {...S} strokeWidth={3} /><g className="fan-blades"><ellipse cx="34" cy="34" rx="32" ry="8" fill={t ?? "#d9a066"} {...S} transform="rotate(-8 34 34)" /><ellipse cx="106" cy="34" rx="32" ry="8" fill={t ?? "#d9a066"} {...S} transform="rotate(8 106 34)" /></g><circle cx="70" cy="32" r="11" fill={t ? shade(t, -0.2) : "#b8783f"} {...S} /><circle cx="70" cy="48" r="7" fill="#fff4d0" {...S} strokeWidth={2.2} /><circle cx="70" cy="50" r="18" fill="#ffe08a" opacity="0.18" className="glow" /></svg>;
    case "string-lights": return <svg viewBox="0 0 170 56" className="sprite" aria-hidden="true"><path d="M4 8 q40 30 82 12 q42 -16 80 10" fill="none" {...S} strokeWidth={2.4} />{[[20, 22], [46, 30], [74, 26], [102, 18], [128, 20], [152, 28]].map(([x, y], i) => <g key={i}><path d={`M${x} ${y} v6`} {...S} strokeWidth={2} /><circle className={`twinkle t${i % 3}`} cx={x} cy={y + 11} r="5.4" fill={i % 2 ? (t ?? "#ffe08a") : t ? shade(t, 0.3) : "#f6b8c6"} {...S} strokeWidth={1.8} /></g>)}</svg>;
    case "plant": return <svg viewBox="0 0 80 100" className="sprite furniture sway" aria-hidden="true"><path d="M26 66 h28 l-4 30 h-20z" fill="#e9a37a" {...S} /><rect x="22" y="60" width="36" height="9" rx="4" fill="#f2c9a0" {...S} /><ellipse cx="40" cy="42" rx="10" ry="22" fill="#5aa86f" {...S} /><ellipse cx="22" cy="44" rx="9" ry="18" fill="#6fbf7f" {...S} transform="rotate(-30 22 44)" /><ellipse cx="58" cy="44" rx="9" ry="18" fill="#6fbf7f" {...S} transform="rotate(30 58 44)" /></svg>;
    case "lamp": return <svg viewBox="0 0 80 110" className="sprite furniture" aria-hidden="true"><circle cx="40" cy="34" r="30" fill="#ffe7a3" opacity="0.28" className="glow" /><rect x="34" y="46" width="12" height="46" rx="5" fill="#d9a066" {...S} /><ellipse cx="40" cy="96" rx="20" ry="7" fill="#b8783f" {...S} /><path d="M10 40 Q40 -6 70 40 Z" fill="#f6b8c6" {...S} /><circle cx="28" cy="30" r="3" fill="#fff" /><circle cx="46" cy="22" r="3" fill="#fff" /></svg>;
    case "tea-table": return <svg viewBox="0 0 110 80" className="sprite furniture" aria-hidden="true"><path d="M55 14 L100 36 L55 58 L10 36Z" fill="#e0b086" {...S} /><path d="M10 36 v10 L55 68 v-10Z" fill="#b8783f" {...S} /><path d="M100 36 v10 L55 68 v-10Z" fill="#c98f5a" {...S} /><ellipse cx="50" cy="34" rx="9" ry="6" fill="#cfe3c4" {...S} /><path d="M58 30 q8 -2 8 4" fill="none" {...S} /><ellipse cx="68" cy="40" rx="5" ry="3.5" fill="#fff7ea" {...S} /></svg>;
    case "sofa": return <svg viewBox="0 0 150 90" className="sprite furniture" aria-hidden="true"><rect x="14" y="14" width="122" height="44" rx="16" fill="#8fc3a0" {...S} /><rect x="6" y="40" width="138" height="34" rx="14" fill="#a9d6b6" {...S} /><rect x="6" y="36" width="24" height="40" rx="10" fill="#8fc3a0" {...S} /><rect x="120" y="36" width="24" height="40" rx="10" fill="#8fc3a0" {...S} /><rect x="36" y="44" width="36" height="22" rx="8" fill="#f2c9a0" {...S} /><rect x="78" y="44" width="36" height="22" rx="8" fill="#f6b8c6" {...S} /><rect x="20" y="74" width="10" height="10" rx="3" fill="#b8783f" {...S} /><rect x="120" y="74" width="10" height="10" rx="3" fill="#b8783f" {...S} /></svg>;
    case "armchair": return <svg viewBox="0 0 100 100" className="sprite furniture" aria-hidden="true"><rect x="18" y="10" width="64" height="50" rx="18" fill="#e8a2a8" {...S} /><rect x="8" y="46" width="84" height="34" rx="14" fill="#f2b8be" {...S} /><rect x="6" y="42" width="20" height="40" rx="9" fill="#e8a2a8" {...S} /><rect x="74" y="42" width="20" height="40" rx="9" fill="#e8a2a8" {...S} /><rect x="32" y="52" width="36" height="18" rx="8" fill="#fff0d8" {...S} /><rect x="18" y="80" width="10" height="10" rx="3" fill="#b8783f" {...S} /><rect x="72" y="80" width="10" height="10" rx="3" fill="#b8783f" {...S} /></svg>;
    case "bookshelf": return <svg viewBox="0 0 100 130" className="sprite furniture" aria-hidden="true"><rect x="10" y="6" width="80" height="118" rx="8" fill="#d9a066" {...S} />{[26, 58, 90].map((y) => <rect key={y} x="16" y={y} width="68" height="4" fill="#b8783f" />)}{[[20, 14, "#f6b8c6"], [34, 12, "#8fc3a0"], [48, 16, "#b3c9f2"], [20, 46, "#f2c9a0"], [42, 46, "#cdbdf0"], [60, 46, "#e8a2a8"], [22, 78, "#8fc3a0"], [40, 78, "#f7a35c"], [58, 78, "#b3c9f2"]].map(([x, y, c], i) => <rect key={i} x={Number(x)} y={Number(y)} width="12" height="26" rx="2" fill={String(c)} {...S} strokeWidth={2} />)}<ellipse cx="72" cy="108" rx="7" ry="4" fill="#6fbf7f" {...S} strokeWidth={2} /></svg>;
    case "fireplace": return <svg viewBox="0 0 130 120" className="sprite furniture" aria-hidden="true"><rect x="8" y="10" width="114" height="104" rx="10" fill="#c9c2cf" {...S} /><rect x="14" y="4" width="102" height="14" rx="6" fill="#d9a066" {...S} /><rect x="30" y="36" width="70" height="64" rx="8" fill="#2f2a33" {...S} /><g className="flame"><path d="M50 98 C42 82 54 74 54 62 C62 72 62 80 60 86 C70 78 72 66 68 56 C84 70 86 90 74 98Z" fill="#f7a35c" /><path d="M56 98 C52 88 60 82 60 74 C66 82 68 90 64 98Z" fill="#ffe08a" /></g>{[[18, 30], [18, 62], [104, 46], [104, 80]].map(([x, y], i) => <rect key={i} x={x} y={y} width="10" height="12" rx="3" fill="#b3aabd" />)}</svg>;
    case "desk": return <svg viewBox="0 0 130 100" className="sprite furniture" aria-hidden="true"><path d="M65 18 L124 46 L65 74 L6 46Z" fill="#e0b086" {...S} /><path d="M6 46 v14 L65 88 v-14Z" fill="#b8783f" {...S} /><path d="M124 46 v14 L65 88 v-14Z" fill="#c98f5a" {...S} /><path d="M44 42 L64 32 L82 41 L62 51Z" fill="#fff7ea" {...S} strokeWidth={2} /><path d="M52 44 l10 -5 M56 48 l10 -5" stroke="#b3c9f2" strokeWidth={2} /><rect x="88" y="26" width="6" height="18" fill="#3b3540" /><path d="M78 26 q13 -14 26 0z" fill="#8fc3a0" {...S} strokeWidth={2} /></svg>;
    case "bed": return <svg viewBox="0 0 160 110" className="sprite furniture" aria-hidden="true"><rect x="10" y="10" width="140" height="80" rx="16" fill="#fff0d8" {...S} /><rect x="10" y="40" width="140" height="56" rx="14" fill={t ?? "#b3c9f2"} {...S} /><path d="M10 60 h140" stroke={t ? shade(t, -0.25) : "#8fa9dc"} strokeWidth={3} strokeDasharray="8 8" /><rect x="22" y="18" width="46" height="24" rx="10" fill={t ? shade(t, 0.45) : "#f6b8c6"} {...S} /><rect x="92" y="18" width="46" height="24" rx="10" fill={t ? shade(t, 0.45) : "#f6b8c6"} {...S} /><rect x="16" y="92" width="10" height="12" rx="3" fill="#b8783f" {...S} /><rect x="134" y="92" width="10" height="12" rx="3" fill="#b8783f" {...S} /></svg>;
    case "kitchen": return <svg viewBox="0 0 140 110" className="sprite furniture" aria-hidden="true"><rect x="8" y="46" width="124" height="56" rx="8" fill="#a9d6b6" {...S} /><rect x="4" y="40" width="132" height="12" rx="5" fill="#e0b086" {...S} /><rect x="20" y="60" width="40" height="34" rx="4" fill="#8fc3a0" {...S} strokeWidth={2} /><rect x="80" y="60" width="40" height="34" rx="4" fill="#8fc3a0" {...S} strokeWidth={2} /><path d="M40 20 h30 v20 h-30z" fill="#f6b8c6" {...S} /><path d="M70 26 q10 0 10 8" fill="none" {...S} /><circle cx="55" cy="18" r="4" fill="#fff" {...S} strokeWidth={2} /><ellipse cx="100" cy="32" rx="9" ry="6" fill="#fff7ea" {...S} strokeWidth={2} /><path className="steam" d="M96 8 q4 6 0 12 M104 6 q4 6 0 12" fill="none" stroke="#fff" strokeWidth={2} opacity="0.8" /></svg>;
    case "aquarium": return <svg viewBox="0 0 140 110" className="sprite furniture" aria-hidden="true"><rect x="10" y="84" width="120" height="18" rx="6" fill="#b8783f" {...S} /><rect x="16" y="10" width="108" height="78" rx="8" fill="#9fd4ea" {...S} /><rect x="16" y="10" width="108" height="14" fill="#c9e8f4" opacity="0.7" /><path d="M30 88 q6 -30 0 -50" stroke="#5aa86f" strokeWidth={4} fill="none" /><path d="M108 88 q-6 -26 0 -42" stroke="#6fbf7f" strokeWidth={4} fill="none" /><g className="fish"><ellipse cx="60" cy="40" rx="11" ry="6" fill="#f7a35c" {...S} strokeWidth={2} /><path d="M70 40 l8 -5 v10z" fill="#f7a35c" {...S} strokeWidth={2} /><circle cx="56" cy="39" r="1.3" fill={INK} /></g><g className="fish fish-2"><ellipse cx="80" cy="64" rx="9" ry="5" fill="#f6b8c6" {...S} strokeWidth={2} /><path d="M88 64 l7 -4 v8z" fill="#f6b8c6" {...S} strokeWidth={2} /><circle cx="77" cy="63" r="1.2" fill={INK} /></g><circle className="bubble" cx="44" cy="30" r="3" fill="#fff" opacity="0.8" /><circle className="bubble bubble-2" cx="98" cy="46" r="2" fill="#fff" opacity="0.8" /><path d="M20 82 h100" stroke="#e0b086" strokeWidth={6} strokeLinecap="round" /></svg>;
    case "fishbowl": return <svg viewBox="0 0 90 90" className="sprite furniture" aria-hidden="true"><circle cx="45" cy="48" r="34" fill="#9fd4ea" {...S} /><path d="M14 40 q31 -14 62 0" stroke="#c9e8f4" strokeWidth={5} fill="none" /><rect x="30" y="8" width="30" height="10" rx="4" fill="#c9e8f4" {...S} /><g className="fish"><ellipse cx="42" cy="52" rx="10" ry="6" fill="#f7a35c" {...S} strokeWidth={2} /><path d="M51 52 l8 -5 v10z" fill="#f7a35c" {...S} strokeWidth={2} /><circle cx="38" cy="51" r="1.3" fill={INK} /></g><ellipse cx="45" cy="76" rx="18" ry="4" fill="#e0b086" /></svg>;
    case "xmas-tree": return <svg viewBox="0 0 100 130" className="sprite furniture" aria-hidden="true"><rect x="42" y="104" width="16" height="20" rx="4" fill="#b8783f" {...S} /><path d="M50 62 L88 106 H12Z" fill="#5aa86f" {...S} /><path d="M50 36 L82 80 H18Z" fill="#6fbf7f" {...S} /><path d="M50 12 L74 54 H26Z" fill="#7fcf8f" {...S} />{[[36, 74, "#f6b8c6"], [62, 70, "#ffe08a"], [50, 96, "#b3c9f2"], [30, 98, "#f7a35c"], [70, 98, "#f6b8c6"], [44, 46, "#ffe08a"]].map(([x, y, c], i) => <circle key={i} className={`twinkle t${i % 3}`} cx={Number(x)} cy={Number(y)} r="4" fill={String(c)} {...S} strokeWidth={1.5} />)}<path d="M50 2 l3 7 h7 l-6 4 2 7 -6 -4 -6 4 2 -7 -6 -4 h7z" fill="#ffe08a" {...S} strokeWidth={2} /></svg>;
    case "gift-pile": return <svg viewBox="0 0 110 80" className="sprite furniture" aria-hidden="true"><rect x="8" y="36" width="44" height="38" rx="6" fill="#e2626a" {...S} /><rect x="26" y="36" width="8" height="38" fill="#ffe08a" /><rect x="52" y="44" width="50" height="30" rx="6" fill="#b3c9f2" {...S} /><rect x="52" y="56" width="50" height="7" fill="#fff" /><rect x="30" y="10" width="34" height="28" rx="6" fill="#8fc3a0" {...S} /><rect x="44" y="10" width="7" height="28" fill="#f6b8c6" /><path d="M40 10 q7 -12 8 0 q1 -12 8 0" fill="none" {...S} strokeWidth={2.2} stroke="#e2626a" /></svg>;
    case "pumpkin": return <svg viewBox="0 0 100 90" className="sprite furniture" aria-hidden="true"><circle cx="50" cy="52" r="40" fill="#ffb347" opacity="0.28" className="glow" /><ellipse cx="50" cy="54" rx="34" ry="28" fill="#f7a35c" {...S} /><path d="M36 28 q14 -6 28 0 M50 26 v56 M30 34 q-8 20 0 40 M70 34 q8 20 0 40" fill="none" stroke="#e58a3e" strokeWidth={3} /><rect x="45" y="16" width="10" height="14" rx="4" fill="#5aa86f" {...S} /><path d="M34 46 l10 6 -10 4z M66 46 l-10 6 10 4z M34 66 q16 12 32 0 l-6 6 -6 -4 -4 4 -4 -4 -6 4z" fill="#ffe08a" /></svg>;
    case "ghost-lamp": return <svg viewBox="0 0 80 100" className="sprite furniture float" aria-hidden="true"><circle cx="40" cy="44" r="36" fill="#cdbdf0" opacity="0.28" className="glow" /><path d="M14 90 V44 a26 26 0 0 1 52 0 V90 l-8 -8 -9 8 -9 -8 -9 8 -9 -8z" fill="#fbf6ee" {...S} /><circle cx="31" cy="46" r="3.5" fill={INK} /><circle cx="49" cy="46" r="3.5" fill={INK} /><ellipse cx="40" cy="58" rx="4" ry="5" fill={INK} /><circle cx="26" cy="54" r="3" fill="#f6b8c6" opacity="0.8" /><circle cx="54" cy="54" r="3" fill="#f6b8c6" opacity="0.8" /></svg>;
    case "harvest-basket": return <svg viewBox="0 0 120 80" className="sprite furniture" aria-hidden="true"><path d="M12 40 h96 l-10 34 h-76z" fill="#d9a066" {...S} /><path d="M20 50 h80 M18 60 h84" stroke="#b8783f" strokeWidth={3} /><ellipse cx="42" cy="36" rx="18" ry="14" fill="#f7a35c" {...S} /><ellipse cx="76" cy="36" rx="14" ry="12" fill="#e2626a" {...S} /><rect x="56" y="14" width="10" height="26" rx="5" fill="#ffe08a" {...S} /><path d="M26 22 q10 -12 22 -2" stroke="#5aa86f" strokeWidth={4} fill="none" strokeLinecap="round" /></svg>;
    case "heart-garland": return <svg viewBox="0 0 160 60" className="sprite furniture" aria-hidden="true"><path d="M4 10 q76 40 152 0" fill="none" {...S} strokeWidth={2.4} />{[24, 56, 88, 120, 150].map((x, i) => <path key={x} className={`swing s${i % 2}`} d={`M${x} ${28 + (i % 2) * 6} l-9 -9 a6 6 0 0 1 9 -8 a6 6 0 0 1 9 8z`} fill={i % 2 ? "#e2626a" : "#f6b8c6"} {...S} strokeWidth={2} />)}</svg>;
    case "rose-vase": return <svg viewBox="0 0 80 110" className="sprite furniture" aria-hidden="true"><path d="M26 50 h28 l6 50 h-40z" fill="#b3c9f2" {...S} /><rect x="30" y="42" width="20" height="12" rx="4" fill="#c9e8f4" {...S} /><path d="M40 46 v-30 M30 46 q-4 -20 -8 -28 M50 46 q4 -20 8 -28" stroke="#5aa86f" strokeWidth={3} fill="none" /><circle cx="40" cy="14" r="8" fill="#e2626a" {...S} /><circle cx="22" cy="16" r="7" fill="#f6b8c6" {...S} /><circle cx="58" cy="16" r="7" fill="#f6b8c6" {...S} /></svg>;
    default: return null;
  }
}

/* ------------------------------------------------------------------ avatar */
export function AvatarSprite({ config, mode = "idle", facing = "right" }: { config: AvatarConfig; mode?: ActorMode; facing?: "left" | "right" }) {
  const sitting = mode === "sit" || mode === "sleep";
  const cls = mode === "wander" ? "walk" : mode === "sleep" ? "breathe" : "";
  const eyesY = 34;
  const face = (() => {
    switch (config.expression) {
      case "sleepy": return <><path d="M24 34 h6 M38 34 h6" {...S} strokeWidth={2.2} /><path d="M31 42 q3 2 6 0" fill="none" {...S} strokeWidth={2} /></>;
      case "wink": return <><circle cx="27" cy={eyesY} r="2" fill={INK} /><path d="M38 34 h6" {...S} strokeWidth={2.2} /><path d="M27 42 q7 6 14 0" fill="none" {...S} strokeWidth={2.2} /></>;
      case "coy": return <><circle cx="29" cy={eyesY} r="2" fill={INK} /><circle cx="43" cy={eyesY} r="2" fill={INK} /><path d="M33 42 q6 4 10 0" fill="none" {...S} strokeWidth={2.2} /><circle cx="22" cy="40" r="3" fill="#f6b8c6" opacity="0.9" /><circle cx="48" cy="40" r="3" fill="#f6b8c6" opacity="0.9" /></>;
      case "smirk": return <><circle cx="27" cy={eyesY} r="2" fill={INK} /><circle cx="41" cy={eyesY} r="2" fill={INK} /><path d="M29 43 q8 3 14 -3" fill="none" {...S} strokeWidth={2.2} /></>;
      case "sus": return <><path d="M22 32 h9 M37 32 h9" {...S} strokeWidth={2.4} /><circle cx="29" cy="34.5" r="1.8" fill={INK} /><circle cx="43" cy="34.5" r="1.8" fill={INK} /><path d="M30 43 h10" {...S} strokeWidth={2.2} /></>;
      default: return <><circle cx="27" cy={eyesY} r="2" fill={INK} /><circle cx="41" cy={eyesY} r="2" fill={INK} /><path d="M28 41 q6 5 12 0" fill="none" {...S} strokeWidth={2.2} /><circle cx="21" cy="40" r="3" fill="#f6b8c6" opacity="0.8" /><circle cx="47" cy="40" r="3" fill="#f6b8c6" opacity="0.8" /></>;
    }
  })();
  const hair = (() => {
    const c = config.hairColor;
    switch (config.hair) {
      case "buzz": return <path d="M16 30 a18 16 0 0 1 36 0 v-2 a18 18 0 0 0 -36 0z" fill={c} {...S} />;
      case "bob": return <><path d="M14 30 a20 18 0 0 1 40 0 v12 h-6 v-10 q-14 -6 -28 0 v10 h-6z" fill={c} {...S} /></>;
      case "long": return <><path d="M14 30 a20 18 0 0 1 40 0 v26 h-7 v-22 q-13 -6 -26 0 v22 h-7z" fill={c} {...S} /></>;
      case "curly": return <><circle cx="20" cy="26" r="8" fill={c} {...S} /><circle cx="48" cy="26" r="8" fill={c} {...S} /><circle cx="34" cy="16" r="10" fill={c} {...S} /><circle cx="24" cy="16" r="7" fill={c} {...S} /><circle cx="44" cy="16" r="7" fill={c} {...S} /></>;
      case "bun": return <><circle cx="34" cy="10" r="7" fill={c} {...S} /><path d="M15 30 a19 17 0 0 1 38 0 v-4 a19 19 0 0 0 -38 0z" fill={c} {...S} /></>;
      default: return <path d="M15 30 a19 17 0 0 1 38 0 v-1 q-8 -8 -19 -6 q-11 -2 -19 6z" fill={c} {...S} />;
    }
  })();
  const accessory = (() => {
    switch (config.accessory) {
      case "santa": return <><path d="M14 22 q20 -26 40 -4 l-4 6 q-16 -14 -32 2z" fill="#e2626a" {...S} /><rect x="12" y="20" width="44" height="8" rx="4" fill="#fff" {...S} /><circle cx="56" cy="16" r="5" fill="#fff" {...S} /></>;
      case "witch": return <><path d="M34 -6 l16 30 h-32z" fill="#8b6fd6" {...S} /><ellipse cx="34" cy="24" rx="26" ry="5" fill="#8b6fd6" {...S} /><rect x="26" y="14" width="16" height="4" fill="#f7a35c" /></>;
      case "scarf": return <><rect x="18" y="50" width="32" height="9" rx="4" fill="#f7a35c" {...S} /><rect x="40" y="56" width="9" height="16" rx="4" fill="#f7a35c" {...S} /></>;
      case "flower": return <><circle cx="52" cy="24" r="5" fill="#f6b8c6" {...S} strokeWidth={2} /><circle cx="52" cy="24" r="1.8" fill="#ffe08a" /></>;
      default: return null;
    }
  })();
  const top = (() => {
    const c = config.topColor;
    if (config.top === "hoodie") return <><rect x="16" y="52" width="36" height="34" rx="10" fill={c} {...S} /><path d="M22 52 q12 12 24 0" fill="none" {...S} strokeWidth={2} /><rect x="26" y="70" width="16" height="10" rx="4" fill="none" {...S} strokeWidth={2} /><rect x="10" y="56" width="9" height="24" rx="4.5" fill={c} {...S} /><rect x="49" y="56" width="9" height="24" rx="4.5" fill={c} {...S} /></>;
    if (config.top === "sweater") return <><rect x="16" y="52" width="36" height="34" rx="9" fill={c} {...S} /><path d="M20 60 h28 M20 68 h28 M20 76 h28" stroke={INK} strokeOpacity="0.25" strokeWidth={2} /><rect x="9" y="56" width="10" height="26" rx="5" fill={c} {...S} /><rect x="49" y="56" width="10" height="26" rx="5" fill={c} {...S} /></>;
    return <><rect x="16" y="52" width="36" height="32" rx="8" fill={c} {...S} /><rect x="10" y="54" width="9" height="14" rx="4.5" fill={c} {...S} /><rect x="49" y="54" width="9" height="14" rx="4.5" fill={c} {...S} /><rect x="10" y="66" width="8" height="14" rx="4" fill={config.skin} {...S} /><rect x="50" y="66" width="8" height="14" rx="4" fill={config.skin} {...S} /></>;
  })();
  const bottom = (() => {
    const c = config.bottomColor;
    if (sitting) return <><rect x="18" y="82" width="34" height="12" rx="5" fill={c} {...S} /><rect x="14" y="86" width="10" height="10" rx="4" fill={c} {...S} /><rect x="44" y="86" width="10" height="10" rx="4" fill={c} {...S} /></>;
    if (config.bottom === "skirt") return <><path d="M18 82 h32 l6 16 h-44z" fill={c} {...S} /><rect className="leg-a" x="22" y="96" width="9" height="12" rx="4" fill={config.skin} {...S} /><rect className="leg-b" x="37" y="96" width="9" height="12" rx="4" fill={config.skin} {...S} /></>;
    if (config.bottom === "shorts") return <><rect className="leg-a" x="20" y="82" width="12" height="12" rx="4" fill={c} {...S} /><rect className="leg-b" x="36" y="82" width="12" height="12" rx="4" fill={c} {...S} /><rect className="leg-a" x="22" y="92" width="9" height="16" rx="4" fill={config.skin} {...S} /><rect className="leg-b" x="38" y="92" width="9" height="16" rx="4" fill={config.skin} {...S} /></>;
    return <><rect className="leg-a" x="20" y="82" width="12" height="26" rx="5" fill={c} {...S} /><rect className="leg-b" x="36" y="82" width="12" height="26" rx="5" fill={c} {...S} /></>;
  })();
  return (
    <svg viewBox="-4 -8 76 120" className={`sprite avatar ${cls} ${sitting ? "sitting" : ""}`} style={{ transform: facing === "left" ? "scaleX(-1)" : undefined }} aria-hidden="true">
      {bottom}
      {top}
      <circle cx="34" cy="34" r="19" fill={config.skin} {...S} />
      {face}
      {hair}
      {accessory}
      {mode === "sleep" && <text x="54" y="12" fontSize="10" fontWeight="800" fill={INK} className="zzz">z</text>}
    </svg>
  );
}

/* ------------------------------------------------------------------ fixed room props */
export function ChestSprite({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 110 90" className="sprite" aria-hidden="true">
      <rect x="10" y="38" width="90" height="46" rx="8" fill="#d9a066" {...S} />
      <path d={open ? "M10 40 q45 -46 90 0 l0 -14 q-45 -46 -90 0z" : "M10 40 a45 22 0 0 1 90 0z"} fill="#b8783f" {...S} />
      <rect x="46" y="34" width="18" height="16" rx="4" fill="#ffe08a" {...S} />
      <rect x="10" y="52" width="90" height="6" fill="#b8783f" />
      {open && <><circle cx="40" cy="30" r="4" fill="#f6b8c6" className="twinkle t0" /><circle cx="70" cy="24" r="3" fill="#b3c9f2" className="twinkle t1" /></>}
    </svg>
  );
}

export function ClosetSprite() {
  return (
    <svg viewBox="0 0 100 140" className="sprite" aria-hidden="true">
      <rect x="8" y="8" width="84" height="126" rx="10" fill="#e8a2a8" {...S} />
      <rect x="14" y="16" width="34" height="110" rx="6" fill="#f2b8be" {...S} strokeWidth={2} />
      <rect x="52" y="16" width="34" height="110" rx="6" fill="#f2b8be" {...S} strokeWidth={2} />
      <circle cx="44" cy="72" r="3" fill="#ffe08a" {...S} strokeWidth={1.5} /><circle cx="56" cy="72" r="3" fill="#ffe08a" {...S} strokeWidth={1.5} />
      <path d="M20 40 h22 M58 40 h22" stroke={INK} strokeOpacity="0.2" strokeWidth={3} />
    </svg>
  );
}
