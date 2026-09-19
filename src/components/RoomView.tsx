import { AnimatePresence, motion } from "framer-motion";
import { Backpack, BookOpen, Coffee, Flame, Hammer, Heart, Lightbulb, PawPrint, RotateCcw, Sparkles, Tv, Utensils, VolumeX, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { STORE_BY_ID, STORE_ITEMS, isCraftable, type Pattern, type SpriteKey, type StoreItem, type Zone } from "../data/storeCatalog";
import { useApp, type PlacedItem } from "../state/store";
import { FurnitureSprite, PetSprite, type ActorMode } from "./Sprites";
import { Chip, Modal, Sheet, Tip } from "./ui";

/* ---------- swap-in real backdrops: drop a file at src/assets/art/rooms/<id>.jpg ---------- */
const ROOM_IMAGES = import.meta.glob<string>("../assets/art/rooms/*.{jpg,jpeg,png}", { eager: true, import: "default" });
const roomImage = (id: string) => ROOM_IMAGES[`../assets/art/rooms/${id}.jpg`] ?? "";

/* ---------- layered side-view stage (matches hero.jpg composition) ----------
   ceiling band 0–15% · wall band 15–60% · floor band 60–96%. Items are free to
   move anywhere inside their own architectural zone — no other restrictions. */
const ZONES: Record<Zone, { minY: number; maxY: number }> = {
  ceiling: { minY: 0.04, maxY: 0.15 },
  wall: { minY: 0.17, maxY: 0.58 },
  floor: { minY: 0.62, maxY: 0.94 },
  wallcover: { minY: 0, maxY: 0 },
};
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const depthScale = (y: number) => 0.72 + 0.55 * clamp((y - 0.62) / 0.32, 0, 1);
const WIDTHS: Record<SpriteKey, number> = {
  rug: 24, carpet: 30, mat: 13, plant: 10, lamp: 9, "tea-table": 15, sofa: 26, armchair: 15, bookshelf: 14, fireplace: 21, desk: 20, bed: 30, kitchen: 23,
  pillow: 10, blanket: 12, aquarium: 20, fishbowl: 10,
  poster: 9, banner: 24, "shelf-wall": 15, curtain: 13, wreath: 9,
  "ceiling-light": 8, "ceiling-fan": 16, "string-lights": 28,
  "xmas-tree": 15, "gift-pile": 15, pumpkin: 10, "ghost-lamp": 9, "harvest-basket": 13, "heart-garland": 24, "rose-vase": 8,
};

const INTERIOR_LABELS: Record<string, string> = { rainroom: "Rainroom", "log-cabin": "Log cabin", apartment: "City apartment", train: "Night train", castle: "Castle chamber" };
const INTERIOR_STYLE: Record<string, { wall: string; wall2: string; floor: string; floor2: string; motif: "plain" | "logs" | "stone" | "panels" }> = {
  rainroom: { wall: "#7fa088", wall2: "#6d8f78", floor: "#a9805a", floor2: "#8f6a48", motif: "plain" },
  "log-cabin": { wall: "#a5713f", wall2: "#8f5f34", floor: "#8a5a38", floor2: "#744a2e", motif: "logs" },
  apartment: { wall: "#e5d3ba", wall2: "#d9bfa0", floor: "#c8a274", floor2: "#b08a5e", motif: "plain" },
  train: { wall: "#7a5a42", wall2: "#684a36", floor: "#7c4650", floor2: "#673a44", motif: "panels" },
  castle: { wall: "#8a8598", wall2: "#787488", floor: "#77728a", floor2: "#666276", motif: "stone" },
};

type Actor = { x: number; y: number; mode: ActorMode; until: number; facing: "left" | "right"; onWall?: boolean; emote?: EmoteKind };
type EmoteKind = "coffee" | "book" | "flame" | "bulb" | "tv" | "food" | "sparkle" | "heart";
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

export function RoomView() {
  const app = useApp();
  const { state, adsRemoved, thermal, placeItem, moveItem, returnItem, setInterior, setWallCover, notify, markTip, engine, haptic, setTab } = app;
  const frozen = thermal === "serious" || thermal === "critical";
  const placed = state.room.placed;
  const roomRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [tvOpen, setTvOpen] = useState(false);
  const [placing, setPlacing] = useState<StoreItem | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [careFor, setCareFor] = useState<PlacedItem | null>(null);
  const [actors, setActors] = useState<Record<string, Actor>>({});
  const drag = useRef<{ uid: string; x0: number; y0: number; moved: boolean } | null>(null);

  const pets = useMemo(() => placed.filter((p) => STORE_BY_ID[p.itemId]?.kind === "pet"), [placed]);
  const decor = useMemo(() => placed.filter((p) => { const d = STORE_BY_ID[p.itemId]; return d && d.kind !== "pet"; }), [placed]);
  const tvVisible = !(adsRemoved && state.settings.tvMode === "removed");
  const wallCoverItem = state.room.wallCover ? STORE_BY_ID[state.room.wallCover] : null;

  /* ---------- pet behaviour: seek out real furniture, species-true habits ---------- */
  useEffect(() => {
    if (frozen) return;
    const tick = () => {
      const now = Date.now();
      setActors((prev) => {
        const next = { ...prev };
        const byBehavior = (b: string) => decor.filter((d) => STORE_BY_ID[d.itemId]?.behavior === b);
        const bySprite = (s: SpriteKey) => decor.filter((d) => STORE_BY_ID[d.itemId]?.sprite === s);
        const soft = [...byBehavior("softspot"), ...byBehavior("bed"), ...byBehavior("seat")];
        const shelves = bySprite("shelf-wall");
        const lamps = [...bySprite("lamp"), ...byBehavior("light").filter((d) => STORE_BY_ID[d.itemId]?.zone === "floor")];
        const appliances = byBehavior("appliance");
        const rugs = [...bySprite("rug"), ...bySprite("carpet"), ...bySprite("mat"), ...bySprite("blanket")];
        const moveTo = (a: Actor, x: number, y: number, mode: ActorMode, hold: number, emote?: EmoteKind, onWall = false): Actor => {
          const dist = Math.hypot(x - a.x, y - a.y);
          const walking = dist > 0.02;
          return { x, y, mode: walking ? "wander" : mode, until: now + (walking ? dist * 5200 + 500 : hold), facing: x >= a.x ? "right" : "left", emote: walking ? undefined : emote, onWall: walking ? false : onWall };
        };
        pets.forEach((p) => {
          const a = next[p.uid] ?? { x: p.u, y: clamp(p.v, ZONES.floor.minY, ZONES.floor.maxY), mode: "idle" as ActorMode, until: 0, facing: "right" as const };
          if (a.until > now) return;
          const species = STORE_BY_ID[p.itemId]?.species;
          const sleepy = (state.petCare[p.itemId]?.lastCare ?? 0) < now - 48 * 3600_000;
          if (a.mode === "wander") { next[p.uid] = { ...a, mode: "idle", until: now + rnd(1200, 3400), onWall: a.onWall }; return; }
          const roll = Math.random() * (sleepy ? 0.6 : 1); // neglected pets just nap more — never distressed
          const floorSpot = () => ({ x: rnd(0.06, 0.94), y: rnd(ZONES.floor.minY + 0.04, ZONES.floor.maxY) });
          if (species === "red-panda" && shelves.length && roll > 0.55) { const s = pick(shelves); next[p.uid] = moveTo(a, s.u, s.v + 0.05, "sleep", rnd(9000, 16000), "sparkle", true); return; }
          if (species === "fox" && tvVisible && roll > 0.72) { next[p.uid] = moveTo(a, 0.78, 0.8, "watch", rnd(7000, 11000), "tv"); return; }
          if (species === "squirrel" && lamps.length && roll > 0.6) { const l = pick(lamps); next[p.uid] = moveTo(a, l.u + 0.03, clamp(l.v, ZONES.floor.minY, ZONES.floor.maxY), "play", rnd(2600, 4200), "bulb"); return; }
          if (species === "raccoon" && appliances.length && roll > 0.55) { const ap = pick(appliances); next[p.uid] = moveTo(a, ap.u + 0.04, clamp(ap.v + 0.03, ZONES.floor.minY, ZONES.floor.maxY), "use", rnd(3600, 6400), "sparkle"); return; }
          if ((species === "cat" || species === "pig" || species === "dog") && (soft.length || rugs.length) && roll > 0.45) {
            const t = pick(species === "cat" ? (soft.length ? soft : rugs) : rugs.length ? rugs : soft);
            next[p.uid] = moveTo(a, t.u + rnd(-0.02, 0.02), clamp(t.v + rnd(-0.01, 0.02), ZONES.floor.minY, ZONES.floor.maxY), "sleep", rnd(9000, 17000));
            return;
          }
          if (roll > 0.3) { const f = floorSpot(); next[p.uid] = moveTo(a, f.x, f.y, "idle", rnd(1800, 3600)); return; }
          next[p.uid] = { ...a, mode: sleepy ? "sleep" : "sit", until: now + rnd(4200, 8000), emote: undefined, onWall: false };
        });
        return next;
      });
    };
    tick();
    const id = window.setInterval(tick, 800);
    return () => window.clearInterval(id);
  }, [decor, frozen, pets, state.petCare, tvVisible]);

  /* ---------- placement, drag, return ---------- */
  const pointIn = useCallback((clientX: number, clientY: number) => {
    const r = roomRef.current?.getBoundingClientRect(); if (!r) return { x: 0.5, y: 0.5 };
    return { x: clamp((clientX - r.left) / r.width, 0.03, 0.97), y: clamp((clientY - r.top) / r.height, 0, 1) };
  }, []);
  const clampToZone = (item: StoreItem | undefined, x: number, y: number) => {
    const zone = item?.zone ?? "floor"; const z = ZONES[zone === "wallcover" ? "wall" : zone];
    return { x, y: clamp(y, z.minY, z.maxY) };
  };
  const onRoomTap = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (placing) {
      const raw = pointIn(e.clientX, e.clientY);
      if (placing.kind === "wallcover") { setWallCover(placing.id); notify(`${placing.name} applied to the wall`, "success"); }
      else { const { x, y } = clampToZone(placing, raw.x, raw.y); placeItem(placing.id, x, y); engine.click("pop"); haptic(14); }
      setPlacing(null);
      return;
    }
    setSelected(null);
  };
  const onItemDown = (e: ReactPointerEvent<HTMLButtonElement>, item: PlacedItem) => {
    e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { uid: item.uid, x0: e.clientX, y0: e.clientY, moved: false };
  };
  const onItemMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = drag.current; if (!d) return;
    if (!d.moved && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 7) return;
    d.moved = true;
    const item = placed.find((p) => p.uid === d.uid); const def = item ? STORE_BY_ID[item.itemId] : undefined;
    const raw = pointIn(e.clientX, e.clientY); const { x, y } = clampToZone(def, raw.x, raw.y);
    moveItem(d.uid, x, y);
    setActors((a) => (a[d.uid] ? { ...a, [d.uid]: { ...a[d.uid], x, y, mode: "idle", until: Date.now() + 2500, onWall: false } } : a));
  };
  const onItemUp = (item: PlacedItem) => {
    const d = drag.current; drag.current = null;
    if (d && !d.moved) {
      const def = STORE_BY_ID[item.itemId];
      if (def?.kind === "pet") { setCareFor(item); markTip("pet-care"); engine.click("soft"); }
      else setSelected((s) => (s === item.uid ? null : item.uid));
    }
  };

  const craftAnother = (uid: string) => {
    const src = placed.find((p) => p.uid === uid); if (!src) return;
    const def = STORE_BY_ID[src.itemId]; if (!def || !isCraftable(def)) return;
    const { x, y } = clampToZone(def, clamp(src.u + 0.06, 0.05, 0.95), src.v + 0.02);
    placeItem(src.itemId, x, y); engine.click("pop"); notify(`Crafted another ${def.name}`, "success");
  };

  const selectedItem = placed.find((p) => p.uid === selected);
  const style = INTERIOR_STYLE[state.room.interiorId] ?? INTERIOR_STYLE.rainroom;
  const override = roomImage(state.room.interiorId);
  const ambient = adsRemoved && state.settings.tvMode !== "ads";

  return (
    <div className="mx-auto max-w-5xl px-3 pb-36 pt-24 sm:px-5 md:px-10">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3 px-2">
        <div><p className="kicker">Your space</p><h1 className="display text-4xl">{INTERIOR_LABELS[state.room.interiorId] ?? "Cozy room"}</h1></div>
        <button className="btn-primary !py-2.5" onClick={() => { markTip("room-menu"); setMenuOpen(true); }} aria-label="Open room menu">
          <Backpack size={17} /> Room menu
        </button>
      </div>

      <div ref={roomRef} className={`stage-room ${placing ? "placing" : ""}`} onPointerUp={onRoomTap}>
        {/* Layer 0: backdrop (CSS scene, or your image if present) */}
        {override ? <img src={override} alt="" className="absolute inset-0 h-full w-full rounded-[28px] object-cover" draggable={false} />
          : <Backdrop style={style} cover={wallCoverItem ? { tint: wallCoverItem.tint ?? "#7fa088", pattern: wallCoverItem.pattern ?? "solid" } : null} />}
        <div className="stage-vignette" />

        {/* Layer 1: television (wall-right, enlarged, muted) */}
        {tvVisible && (
          <button className="stage-tv" style={{ left: "79%", top: "56%" }} onPointerUp={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); markTip("tv"); setTvOpen(true); }} aria-label={ambient ? "Television, ambient art" : "Television, muted ad. Tap to watch"}>
            <span className="tv-frame">
              <span className={`tv-screen ${frozen ? "off" : ambient ? "ambient" : "static"}`}>
                {!frozen && ambient && <span className="tv-scene"><span className="tv-moon" /><span className="tv-rain" /><span className="tv-cat"><PetSprite species="cat" mode="sleep" facing="right" /></span></span>}
                {frozen && <span className="tv-label">cooling</span>}
                {!frozen && !ambient && <span className="tv-label"><VolumeX size={10} /> ad · muted</span>}
              </span>
              <span className="tv-stand" />
            </span>
            <Tip id="tv" text="Ads only ever live inside this TV, muted. Tap to peek." className="-top-12 left-1/2 w-56 -translate-x-1/2" />
          </button>
        )}

        {/* Layer 2: placed decor, sorted by depth */}
        {decor.map((item) => {
          const def = STORE_BY_ID[item.itemId]; if (!def?.sprite) return null;
          const isFloor = (def.zone ?? "floor") === "floor";
          const sc = isFloor ? depthScale(item.v) : 0.95;
          const z = def.zone === "ceiling" ? 8 : def.zone === "wall" ? 9 : 10 + Math.round(item.v * 60);
          return (
            <button key={item.uid} className={`stage-prop ${def.zone === "ceiling" ? "from-ceiling" : ""} ${selected === item.uid ? "selected" : ""}`}
              style={{ left: `${item.u * 100}%`, top: `${item.v * 100}%`, width: `${(WIDTHS[def.sprite] ?? 14) * sc}%`, zIndex: z }}
              onPointerDown={(e) => onItemDown(e, item)} onPointerMove={onItemMove} onPointerUp={(e) => { e.stopPropagation(); onItemUp(item); }} onPointerCancel={() => { drag.current = null; }}
              aria-label={`${def.name}. Drag to move, tap for options`}>
              <FurnitureSprite sprite={def.sprite} tint={def.tint} />
            </button>
          );
        })}

        {/* Layer 3: pets (buttery motion + squash/smear classes) */}
        {pets.map((item) => {
          const def = STORE_BY_ID[item.itemId]; if (!def?.species) return null;
          const a = actors[item.uid] ?? { x: item.u, y: clamp(item.v, ZONES.floor.minY, ZONES.floor.maxY), mode: "idle" as ActorMode, until: 0, facing: "right" as const };
          const sc = a.onWall ? 0.62 : depthScale(a.y);
          const lonely = (state.petCare[item.itemId]?.lastCare ?? 0) < Date.now() - 48 * 3600_000;
          return (
            <button key={item.uid} className={`stage-actor ${a.mode === "wander" ? "moving" : ""}`}
              style={{ left: `${a.x * 100}%`, top: `${a.y * 100}%`, width: `${11.5 * sc}%`, zIndex: a.onWall ? 9 : 11 + Math.round(a.y * 60) }}
              onPointerDown={(e) => onItemDown(e, item)} onPointerMove={onItemMove} onPointerUp={(e) => { e.stopPropagation(); onItemUp(item); }}
              aria-label={`${def.name}. Tap to care for it`}>
              {a.emote && !frozen && <Emote kind={a.emote} />}
              {lonely && !frozen && <span className="lonely-tag">zzz… misses you</span>}
              <PetSprite species={def.species} mode={frozen ? "sleep" : a.mode} facing={a.facing} />
            </button>
          );
        })}

        {pets.length > 0 && <Tip id="pet-care" text="Tap a pet to pet, feed and brush it. Bonds only ever grow." className="left-3 top-3 w-56" />}
        {placing && (
          <div className="placing-hint">
            <Sparkles size={14} /> {placing.kind === "wallcover" ? `Tap the wall to apply ${placing.name.toLowerCase()}` : `Tap the ${placing.zone ?? "floor"} to place the ${placing.name.toLowerCase()}`}
            <button className="ml-2 underline" onClick={(e) => { e.stopPropagation(); setPlacing(null); }}>cancel</button>
          </div>
        )}
        {frozen && <div className="placing-hint">Room paused to keep the device cool</div>}
      </div>

      {/* selected decor action bar */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mx-auto mt-3 flex w-fit flex-wrap items-center justify-center gap-2 rounded-full bg-[var(--surface)] px-3 py-2 text-sm shadow-lg">
            <b>{STORE_BY_ID[selectedItem.itemId]?.name}</b>
            {isCraftable(STORE_BY_ID[selectedItem.itemId]!) && <button className="btn-ghost !px-3 !py-1.5" onClick={() => craftAnother(selectedItem.uid)}><Hammer size={14} /> Craft another</button>}
            <button className="btn-ghost !px-3 !py-1.5" onClick={() => { returnItem(selectedItem.uid); setSelected(null); notify("Returned to your Room menu"); }}><RotateCcw size={14} /> Return</button>
            <button className="icon-btn" onClick={() => setSelected(null)} aria-label="Close"><X size={14} /></button>
          </motion.div>
        )}
      </AnimatePresence>
      <p className="mt-3 px-2 text-center text-xs text-[var(--muted)]">Drag anything within its zone · tap decor for craft/return · tap a pet to care for it</p>

      <RoomMenu open={menuOpen} onClose={() => setMenuOpen(false)} onPlace={(item) => { setMenuOpen(false); setPlacing(item); }} onStore={() => { setMenuOpen(false); setTab("store"); }} onInterior={(id) => setInterior(id)} />
      {careFor && <PetCareSheet placed={careFor} onClose={() => setCareFor(null)} />}
      <TvModal open={tvOpen} onClose={() => setTvOpen(false)} />
    </div>
  );
}

/* ---------- CSS/SVG backdrop with wall-cover layer ---------- */
function Backdrop({ style, cover }: { style: (typeof INTERIOR_STYLE)[string]; cover: { tint: string; pattern: Pattern } | null }) {
  const ink = "rgba(45,42,46,0.55)";
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full rounded-[28px]" aria-hidden="true">
      <defs>
        <pattern id="pat-stars" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="0.55" fill="#fff" opacity="0.75" /><circle cx="6.5" cy="6" r="0.35" fill="#fff" opacity="0.5" /></pattern>
        <pattern id="pat-dots" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="3.5" cy="3.5" r="0.9" fill="#fff" opacity="0.4" /></pattern>
        <pattern id="pat-stripes" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="4" height="8" fill="#fff" opacity="0.16" /></pattern>
        <pattern id="pat-hearts" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M5 7 L3.4 5.2 a1.1 1.1 0 0 1 1.6 -1.5 a1.1 1.1 0 0 1 1.6 1.5z" fill="#fff" opacity="0.5" /></pattern>
      </defs>
      {/* wall */}
      <rect x="0" y="0" width="100" height="62" fill={style.wall} />
      {style.motif === "logs" && Array.from({ length: 8 }).map((_, i) => <rect key={i} x="0" y={i * 8} width="100" height="0.7" fill={style.wall2} />)}
      {style.motif === "stone" && Array.from({ length: 7 }).map((_, i) => <g key={i}><rect x="0" y={i * 9} width="100" height="0.6" fill={style.wall2} />{Array.from({ length: 6 }).map((_, j) => <rect key={j} x={(j * 17 + (i % 2) * 8) % 100} y={i * 9} width="0.6" height="9" fill={style.wall2} />)}</g>)}
      {style.motif === "panels" && Array.from({ length: 6 }).map((_, i) => <rect key={i} x={i * 17 + 2} y="4" width="0.7" height="56" fill={style.wall2} />)}
      {/* wall cover (paint / wallpaper) sits over the base wall, under the window */}
      {cover && <rect x="0" y="0" width="100" height="62" fill={cover.tint} opacity="0.92" />}
      {cover && cover.pattern !== "solid" && <rect x="0" y="0" width="100" height="62" fill={`url(#pat-${cover.pattern})`} />}
      {/* window with animated rain (always left, like hero.jpg) */}
      <g>
        <rect x="7" y="16" width="26" height="34" rx="2.4" fill="#2c3a5c" stroke={ink} strokeWidth="1.1" />
        <rect x="8.2" y="17.2" width="23.6" height="31.6" rx="1.8" fill="#1f2c4a" />
        <circle cx="27" cy="22" r="2.6" fill="#ffe9a8" opacity="0.95" />
        <circle cx="14" cy="40" r="1" fill="#f2c9a0" opacity="0.6" /><circle cx="20" cy="43" r="0.8" fill="#b3c9f2" opacity="0.6" /><circle cx="25" cy="38" r="0.9" fill="#f6b8c6" opacity="0.5" />
        <g className="window-rain">{Array.from({ length: 7 }).map((_, i) => <line key={i} x1={9.5 + i * 3.2} y1={18} x2={8.7 + i * 3.2} y2={24} stroke="#b3c9f2" strokeWidth="0.35" opacity="0.7" />)}</g>
        <rect x="19.6" y="16" width="0.9" height="34" fill={ink} opacity="0.8" /><rect x="7" y="32" width="26" height="0.9" fill={ink} opacity="0.8" />
        <rect x="5.6" y="49.4" width="28.8" height="2" rx="1" fill={style.wall2} stroke={ink} strokeWidth="0.7" />
      </g>
      {/* baseboard + floor */}
      <rect x="0" y="60.4" width="100" height="1.8" fill={style.wall2} />
      <rect x="0" y="62" width="100" height="38" fill={style.floor} />
      {Array.from({ length: 6 }).map((_, i) => <rect key={i} x="0" y={65 + i * 6} width="100" height="0.55" fill={style.floor2} opacity="0.8" />)}
      <ellipse cx="50" cy="97" rx="60" ry="9" fill="#000" opacity="0.10" />
    </svg>
  );
}

function Emote({ kind }: { kind: EmoteKind }) {
  const Icon = kind === "coffee" ? Coffee : kind === "book" ? BookOpen : kind === "flame" ? Flame : kind === "bulb" ? Lightbulb : kind === "tv" ? Tv : kind === "food" ? Utensils : kind === "heart" ? Heart : Sparkles;
  return <motion.span initial={{ opacity: 0, y: 6, scale: 0.7 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="emote"><Icon size={13} /></motion.span>;
}

/* ---------- unified Room menu: storage list + craft + walls + rooms ---------- */
function RoomMenu({ open, onClose, onPlace, onStore, onInterior }: { open: boolean; onClose: () => void; onPlace: (i: StoreItem) => void; onStore: () => void; onInterior: (id: string) => void }) {
  const { state, owns, purchase, setWallCover, notify } = useApp();
  const [tab, setTabLocal] = useState<"decor" | "pets" | "walls" | "rooms">("decor");
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    state.room.placed.forEach((p) => m.set(p.itemId, (m.get(p.itemId) ?? 0) + 1));
    return m;
  }, [state.room.placed]);
  const ownedItems = STORE_ITEMS.filter((i) => state.inventory.includes(i.id));
  const decorItems = ownedItems.filter((i) => isCraftable(i) && i.kind !== "wallcover");
  const petItems = ownedItems.filter((i) => i.kind === "pet" || i.kind === "aquarium");
  const wallItems = ownedItems.filter((i) => i.kind === "wallcover");
  const interiors = [{ id: "rainroom", name: "Rainroom", ownedFlag: true, item: null as StoreItem | null }, ...STORE_ITEMS.filter((i) => i.kind === "interior").map((i) => ({ id: i.interiorId!, name: INTERIOR_LABELS[i.interiorId!] ?? i.name, ownedFlag: owns(i.id), item: i }))];

  return (
    <Sheet open={open} onClose={onClose} title="Room menu" kicker="Storage · everything you've unlocked" wide>
      <div className="mb-4 flex gap-2 overflow-x-auto">
        {([["decor", "Decor & furniture"], ["pets", "Pets"], ["walls", "Walls"], ["rooms", "Rooms"]] as const).map(([id, label]) => <Chip key={id} active={tab === id} onClick={() => setTabLocal(id)}>{label}</Chip>)}
      </div>
      {tab === "decor" && (
        decorItems.length === 0 ? <EmptyNote onStore={onStore} /> : (
          <>
            <p className="mb-3 text-xs text-[var(--muted)]">Unlocked items are an infinite palette — craft and place as many copies as you like. Returning a copy never loses the unlock.</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {decorItems.map((item) => (
                <button key={item.id} className="inv-card" onClick={() => onPlace(item)}>
                  <span className="inv-stage">{item.sprite && <FurnitureSprite sprite={item.sprite} tint={item.tint} />}</span>
                  <span className="block truncate text-sm font-bold">{item.name}</span>
                  <span className="block text-[11px] text-[var(--muted)]">{item.zone === "wall" ? "Wall" : item.zone === "ceiling" ? "Ceiling" : "Floor"} · {counts.get(item.id) ?? 0} placed · <Hammer size={10} className="inline" /> craft</span>
                </button>
              ))}
            </div>
          </>
        )
      )}
      {tab === "pets" && (
        petItems.length === 0 ? <EmptyNote onStore={onStore} pets /> : (
          <>
            <p className="mb-3 text-xs text-[var(--muted)]">Pets are one-of-a-kind friends — they can be placed or rest here, but never crafted or duplicated.</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {petItems.map((item) => {
                const placedAlready = (counts.get(item.id) ?? 0) > 0;
                return (
                  <button key={item.id} className={`inv-card ${placedAlready ? "opacity-60" : ""}`} disabled={placedAlready} onClick={() => onPlace(item)}>
                    <span className="inv-stage">{item.species ? <PetSprite species={item.species} mode="idle" facing="right" /> : item.sprite ? <FurnitureSprite sprite={item.sprite} /> : null}</span>
                    <span className="block truncate text-sm font-bold">{item.name}</span>
                    <span className="block text-[11px] text-[var(--muted)]">{placedAlready ? "In the room" : "Tap to place"}</span>
                  </button>
                );
              })}
            </div>
          </>
        )
      )}
      {tab === "walls" && (
        <>
          <p className="mb-3 text-xs text-[var(--muted)]">Paint and wallpaper recolor the whole wall instantly. One active at a time.</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            <button className={`inv-card ${!state.room.wallCover ? "outline outline-2 outline-[var(--accent)]" : ""}`} onClick={() => { setWallCover(null); notify("Back to the room's own wall"); }}>
              <span className="inv-stage"><span className="theme-swatch" style={{ background: "linear-gradient(135deg,#7fa088,#6d8f78)" }} /></span>
              <span className="block text-sm font-bold">Original wall</span>
            </button>
            {wallItems.map((item) => (
              <button key={item.id} className={`inv-card ${state.room.wallCover === item.id ? "outline outline-2 outline-[var(--accent)]" : ""}`} onClick={() => { setWallCover(item.id); notify(`${item.name} applied`, "success"); }}>
                <span className="inv-stage"><span className="theme-swatch" style={{ background: item.tint }} /></span>
                <span className="block truncate text-sm font-bold">{item.name}</span>
                <span className="block text-[11px] text-[var(--muted)]">{item.pattern === "solid" ? "Paint" : "Wallpaper"}</span>
              </button>
            ))}
          </div>
        </>
      )}
      {tab === "rooms" && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {interiors.map((i) => (
            <button key={i.id} className={`inv-card ${state.room.interiorId === i.id ? "outline outline-2 outline-[var(--accent)]" : ""}`}
              onClick={() => { if (i.ownedFlag) { onInterior(i.id); notify(`Moved into the ${i.name}`, "success"); } else if (i.item) purchase(i.item); }}>
              <span className="inv-stage"><MiniRoom styleId={i.id} /></span>
              <span className="block truncate text-sm font-bold">{i.name}</span>
              <span className="block text-[11px] text-[var(--muted)]">{i.ownedFlag ? (state.room.interiorId === i.id ? "Current" : "Move in") : "$1.00 · tap to buy"}</span>
            </button>
          ))}
        </div>
      )}
    </Sheet>
  );
}

function MiniRoom({ styleId }: { styleId: string }) {
  const s = INTERIOR_STYLE[styleId] ?? INTERIOR_STYLE.rainroom;
  return <span className="block h-full w-full rounded-xl" style={{ background: `linear-gradient(${s.wall} 0 60%, ${s.floor} 60% 100%)` }} />;
}

function EmptyNote({ onStore, pets = false }: { onStore: () => void; pets?: boolean }) {
  return <div className="card p-6 text-center text-sm text-[var(--muted)]">Nothing here yet. <button className="ml-1 underline" onClick={onStore}>Visit the store</button> for {pets ? "pets and aquariums" : "furniture, holiday sets and decor"}.</div>;
}

/* ---------- therapeutic pet care: pet · feed · brush, zero pressure ---------- */
const BOND_TITLES: [number, string][] = [[0, "New friends"], [6, "Warming up"], [16, "Snuggle buddies"], [32, "Inseparable"], [60, "Bonded for life"]];
function PetCareSheet({ placed, onClose }: { placed: PlacedItem; onClose: () => void }) {
  const { state, carePet, engine, haptic, returnItem, notify } = useApp();
  const def = STORE_BY_ID[placed.itemId];
  const care = state.petCare[placed.itemId] ?? { bond: 0, lastCare: 0, fed: 0, brushed: 0, petted: 0 };
  const [mode, setMode] = useState<"pet" | "feed" | "brush">("pet");
  const [hearts, setHearts] = useState<{ id: number; x: number; y: number; kind: "heart" | "sparkle" }[]>([]);
  const [bowl, setBowl] = useState<"empty" | "full" | "eating">("empty");
  const strokeAcc = useRef(0);
  const lastPt = useRef<{ x: number; y: number } | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const title = BOND_TITLES.reduce((acc, [min, label]) => (care.bond >= min ? label : acc), BOND_TITLES[0][1]);
  const hours = care.lastCare ? (Date.now() - care.lastCare) / 3600_000 : Infinity;
  const mood = hours < 12 ? "Cozy and content" : hours < 48 ? "A little sleepy" : "Very sleepy — but happy you're here";

  const burst = useCallback((clientX: number, clientY: number, kind: "heart" | "sparkle") => {
    const r = stageRef.current?.getBoundingClientRect(); if (!r) return;
    const id = Date.now() + Math.random();
    setHearts((h) => [...h.slice(-8), { id, x: ((clientX - r.left) / r.width) * 100, y: ((clientY - r.top) / r.height) * 100, kind }]);
    window.setTimeout(() => setHearts((h) => h.filter((p) => p.id !== id)), 1100);
  }, []);

  const onStroke = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.buttons === 0 || mode === "feed") return;
    const prev = lastPt.current; lastPt.current = { x: e.clientX, y: e.clientY };
    if (!prev) return;
    strokeAcc.current += Math.hypot(e.clientX - prev.x, e.clientY - prev.y);
    if (strokeAcc.current > 70) {
      strokeAcc.current = 0;
      burst(e.clientX, e.clientY, mode === "brush" ? "sparkle" : "heart");
      carePet(placed.itemId, mode === "brush" ? "brush" : "pet");
      haptic(8);
    }
  };

  const feed = () => {
    if (bowl !== "empty") return;
    setBowl("full"); engine.click("pop");
    window.setTimeout(() => { setBowl("eating"); carePet(placed.itemId, "feed"); }, 700);
    window.setTimeout(() => setBowl("empty"), 3400);
  };

  if (!def?.species && def?.kind !== "aquarium") return null;
  return (
    <Sheet open onClose={onClose} title={def?.name ?? "Friend"} kicker={`${title} · bond ${care.bond}`}>
      <div ref={stageRef} className="care-stage" onPointerMove={onStroke} onPointerDown={(e) => { lastPt.current = { x: e.clientX, y: e.clientY }; }} onPointerUp={() => { lastPt.current = null; }}>
        <span className={`care-pet ${mode === "brush" ? "brushing" : ""} ${bowl === "eating" ? "eating" : ""}`}>
          {def?.species ? <PetSprite species={def.species} mode={bowl === "eating" ? "play" : hours > 48 ? "sleep" : "sit"} facing="right" /> : def?.sprite ? <FurnitureSprite sprite={def.sprite} /> : null}
        </span>
        {mode === "feed" && (
          <button className="care-bowl" onClick={feed} aria-label="Fill the food dish">
            <svg viewBox="0 0 90 46" className="w-full">
              <ellipse cx="45" cy="34" rx="36" ry="10" fill="#e9a37a" stroke="#2d2a2e" strokeWidth="2.6" />
              <ellipse cx="45" cy="30" rx="28" ry="7" fill="#c9805a" stroke="#2d2a2e" strokeWidth="2" />
              {bowl !== "empty" && <ellipse cx="45" cy="29" rx="22" ry="5" fill="#8a5a38" />}
              {bowl !== "empty" && [[34, 27], [45, 25], [56, 27], [40, 29], [51, 29]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.6" fill="#6a4228" />)}
            </svg>
            <span className="text-[11px] font-bold text-[var(--muted)]">{bowl === "empty" ? "Tap to fill" : bowl === "full" ? "Dinner is served…" : "nom nom nom"}</span>
          </button>
        )}
        <AnimatePresence>
          {hearts.map((h) => (
            <motion.span key={h.id} initial={{ opacity: 0, scale: 0.4, x: "-50%", y: 0 }} animate={{ opacity: 1, scale: 1, y: -34 }} exit={{ opacity: 0 }} transition={{ duration: 1 }}
              className="care-heart" style={{ left: `${h.x}%`, top: `${h.y}%` }}>
              {h.kind === "heart" ? <Heart size={16} fill="#f27b93" stroke="#2d2a2e" /> : <Sparkles size={15} stroke="#2d2a2e" fill="#ffe08a" />}
            </motion.span>
          ))}
        </AnimatePresence>
        {mode !== "feed" && <span className="care-hint">{mode === "pet" ? "Slowly stroke with your finger" : "Gentle strokes with the brush"}</span>}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {([["pet", "Pet", PawPrint], ["feed", "Feed", Utensils], ["brush", "Brush", Sparkles]] as const).map(([id, label, Icon]) => (
          <button key={id} className={id === mode ? "btn-primary" : "btn-ghost"} onClick={() => setMode(id)}><Icon size={15} /> {label}</button>
        ))}
      </div>
      <p className="mt-3 text-center text-xs text-[var(--muted)]">{mood}. Nothing bad can ever happen to your buddies — no timers, no sickness, no guilt. Petted {care.petted} · fed {care.fed} · brushed {care.brushed}.</p>
      <button className="btn-ghost mt-3 w-full !py-2 text-xs" onClick={() => { returnItem(placed.uid); onClose(); notify(`${def?.name} is resting in your Room menu — the bond stays.`); }}>
        <RotateCcw size={13} /> Send to Room menu (bond is kept)
      </button>
    </Sheet>
  );
}

/* ---------- TV modal ---------- */
function TvModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { adsRemoved, notify, purchase } = useApp();
  const [watching, setWatching] = useState(0);
  useEffect(() => { if (!open) setWatching(0); }, [open]);
  useEffect(() => {
    if (watching <= 0) return;
    const id = window.setTimeout(() => { if (watching === 1) notify("Thanks for watching — that keeps Bed Buddies free.", "success"); setWatching((w) => w - 1); }, 1000);
    return () => window.clearTimeout(id);
  }, [notify, watching]);
  return (
    <Modal open={open} onClose={onClose} label="Television">
      <p className="kicker">Television</p>
      <h3 className="display text-2xl">{adsRemoved ? "Ad-free ambient TV" : "Muted ad slot"}</h3>
      <div className={`tv-preview ${adsRemoved ? "ambient" : "static"}`}>
        {watching > 0 ? <span className="tv-countdown">Simulated ad · {watching}s</span> : adsRemoved ? <span className="tv-scene"><span className="tv-moon" /><span className="tv-rain" /></span> : <span className="tv-label"><VolumeX size={11} /> muted preview</span>}
      </div>
      <p className="mt-3 text-sm text-[var(--muted)]">{adsRemoved ? "You removed ads. Pick Ambient loop, Silent static or Remove TV in Settings → Television." : "Ads only ever play muted inside the TV frame — never over your sleep. In the store build this frame hosts an AdMob / Unity native video placement you explicitly choose to expand."}</p>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {!adsRemoved && <button className="btn-ghost" onClick={() => setWatching(5)}>Watch the full ad</button>}
        {!adsRemoved && <button className="btn-primary" onClick={() => { onClose(); const item = STORE_BY_ID.remove_ads; if (item) purchase(item); }}>Remove ads · $5.00</button>}
        {adsRemoved && <button className="btn-primary sm:col-span-2" onClick={onClose}>Cozy.</button>}
      </div>
    </Modal>
  );
}
