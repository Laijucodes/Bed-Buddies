import { motion } from "framer-motion";
import { Check, ChevronRight, Gift, Lock, Play, ShieldCheck, Sparkles, WandSparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { COVER_ART, INTERIOR_ART } from "../data/art";
import { SOUNDS, familyFromPrompt, slug, type SoundDef } from "../data/soundCatalog";
import { STORE_BY_ID, STORE_ITEMS, formatPrice, type StoreItem } from "../data/storeCatalog";
import { THEME_BY_ID } from "../data/themes";
import { useApp } from "../state/store";
import { FurnitureSprite, PetSprite } from "./Sprites";
import { Art, Chip, Modal, Price, SectionTitle, Sheet, Tip } from "./ui";

type StoreTab = "room" | "community" | "packs";
type GridEntry = { key: string; sound?: SoundDef; item?: StoreItem };

export function StoreView() {
  const app = useApp();
  const { adsRemoved, purchase, owns, ownsPack, activeCampaign, state, engine } = app;
  const [tab, setTab] = useState<StoreTab>("room");
  const [preview, setPreview] = useState<StoreItem | null>(null);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const removeAds = STORE_BY_ID.remove_ads;

  const groups: { title: string; blurb: string; kinds: StoreItem["kind"][] }[] = [
    { title: "Holiday sets", blurb: "Full-room redecoration bundles: wall paint, wallpaper, banners, bedding, rugs, lights and hero decor. Active campaigns give 1 free item per week for daily check-ins.", kinds: ["holiday"] },
    { title: "Animated pets & aquariums", blurb: "They wander, climb shelves, nap on pillows and watch the TV. Fish stay in their tanks. Pets can never be crafted.", kinds: ["pet", "aquarium"] },
    { title: "Furniture & soft things", blurb: "Beds, bedding, pillows, blankets — pets claim everything. Craft unlimited copies once unlocked.", kinds: ["furniture"] },
    { title: "Wall & ceiling decor", blurb: "Posters, banners, shelves, curtains, pendants, fans and string lights — place them anywhere on their surface.", kinds: ["decor"] },
    { title: "Wall paint & wallpaper", blurb: "Recolor the entire wall in one tap from the Room menu.", kinds: ["wallcover"] },
    { title: "House interiors", blurb: "Whole-room overrides that match premium sound packs. Each unlocks its UI theme.", kinds: ["interior"] },
    { title: "Theme sets", blurb: "A full UI re-skin plus matching decor for the room.", kinds: ["theme"] },
  ];
  const sellable = (i: StoreItem) => i.category === "room" && i.priceCents > 0;

  return (
    <div className="mx-auto max-w-6xl px-5 pb-40 pt-24 md:px-10">
      <SectionTitle kicker="A little extra" title="The cozy store" />

      {/* Pinned Remove Ads banner */}
      <button onClick={() => (adsRemoved ? undefined : purchase(removeAds))} className={`ads-banner ${adsRemoved ? "owned" : ""}`} aria-label="Remove all ads for five dollars">
        <span className="ads-sheep" aria-hidden="true">🐑</span>
        <span className="min-w-0 flex-1 text-left">
          <span className="kicker !text-[var(--accent-2)]">Lifetime pass · pinned</span>
          <span className="display block text-xl sm:text-2xl">{adsRemoved ? "Ads removed — thank you 🙏" : "Remove all ads, forever"}</span>
          <span className="block text-xs text-[var(--muted)]">{adsRemoved ? "The TV is now cozy ambient art (or remove it in Settings)." : "Keep the TV as ambient art or remove it. No subscriptions, ever."}</span>
        </span>
        <span className="flex items-center gap-2 font-extrabold">{adsRemoved ? <Check /> : <>$5.00 <ChevronRight size={18} /></>}</span>
      </button>

      <div className="mt-6 flex gap-2 border-b border-white/10 pb-3">
        {([["room", "Room"], ["community", "Community"], ["packs", "Sound packs"]] as [StoreTab, string][]).map(([id, label]) => <Chip key={id} active={tab === id} onClick={() => setTab(id)}>{label}</Chip>)}
      </div>

      {tab === "room" && (
        <div className="mt-6 space-y-10">
          {activeCampaign && (
            <div className="card flex flex-wrap items-center gap-4 p-4">
              <Gift className="text-[var(--accent-2)]" />
              <div className="min-w-0 flex-1">
                <b className="block">{activeCampaign.name} is live</b>
                <span className="text-xs text-[var(--muted)]">Open the app every day this week and earn “{STORE_BY_ID[activeCampaign.rewardItemId]?.name}” free.</span>
                <div className="progress mt-2"><span style={{ width: `${Math.min(100, (state.holiday.openDays.length / activeCampaign.requiredDays) * 100)}%` }} /></div>
              </div>
              <span className="tabular text-sm font-bold">{Math.min(state.holiday.openDays.length, activeCampaign.requiredDays)}/{activeCampaign.requiredDays} days{state.holiday.claimed.includes(activeCampaign.id) ? " · claimed" : ""}</span>
            </div>
          )}
          {groups.map((g) => {
            const items = STORE_ITEMS.filter((i) => g.kinds.includes(i.kind) && sellable(i));
            return (
              <section key={g.title}>
                <div className="mb-3"><h3 className="display text-xl">{g.title}</h3><p className="text-xs text-[var(--muted)]">{g.blurb}</p></div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {items.map((item) => <ItemCard key={item.id} item={item} owned={owns(item.id)} onOpen={() => { engine.click("soft"); setPreview(item); }} />)}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {tab === "community" && (
        <div className="mt-6">
          <div className="card relative mb-6 flex flex-wrap items-center gap-4 p-4">
            <WandSparkles className="text-[var(--accent)]" />
            <div className="min-w-0 flex-1"><b className="block">Sound synthesis sandbox</b><span className="text-xs text-[var(--muted)]">Describe a place. Prompts pass through moderation before generation; results are private until you share them.</span></div>
            <button className="btn-primary" onClick={() => setCreatorOpen(true)}><Sparkles size={16} /> Create sound</button>
            <Tip id="create" text="Type a place like “rain on a canvas tent” and we'll synthesize it." className="-top-10 right-0 w-56" />
          </div>
          <CommunityGrid onPack={(item) => setPreview(item)} />
        </div>
      )}

      {tab === "packs" && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {STORE_ITEMS.filter((i) => i.kind === "sound_pack").map((item) => {
            const owned = ownsPack(item.packId!); const packSounds = SOUNDS.filter((s) => s.packId === item.packId);
            return (
              <button key={item.id} className="pack-card" onClick={() => setPreview(item)}>
                <Art art={COVER_ART[item.cover ?? "missing"]} className="h-24 w-24 shrink-0" />
                <span className="min-w-0 flex-1 text-left">
                  <b className="block">{item.name}</b>
                  <span className="block text-xs text-[var(--muted)]">{packSounds.length} loops · {packSounds.filter((s) => !s.is_premium).length} free for everyone</span>
                  <span className="mt-2 inline-flex items-center gap-2 text-sm font-bold">{owned ? <><Check size={14} /> Owned</> : <><Price cents={item.priceCents} /> · preview</>}</span>
                </span>
              </button>
            );
          })}
          <p className="text-xs text-[var(--muted)] sm:col-span-2"><ShieldCheck size={12} className="mr-1 inline" /> Rule of three: any pack we sell keeps at least three of its loops free on the Sounds page.</p>
        </div>
      )}

      <PreviewModal item={preview} onClose={() => setPreview(null)} />
      <CreatorSheet open={creatorOpen} onClose={() => setCreatorOpen(false)} />
    </div>
  );
}

function ItemCard({ item, owned, onOpen }: { item: StoreItem; owned: boolean; onOpen: () => void }) {
  return (
    <motion.button whileTap={{ scale: 0.96 }} onClick={onOpen} className={`item-card ${owned ? "owned" : ""}`} aria-label={`${item.name}, ${owned ? "owned" : formatPrice(item.priceCents)}`}>
      <span className="item-stage">
        {item.cover ? <Art art={COVER_ART[item.cover]} className="h-full w-full" rounded="rounded-2xl" /> : item.species ? <PetSprite species={item.species} mode="idle" facing="right" /> : item.sprite ? <FurnitureSprite sprite={item.sprite} tint={item.tint} /> : item.interiorId ? <Art art={INTERIOR_ART[item.interiorId]} className="h-full w-full" rounded="rounded-2xl" /> : item.kind === "wallcover" ? <WallSwatch tint={item.tint ?? "#7fa088"} pattern={item.pattern ?? "solid"} /> : item.themeId ? <ThemeSwatch id={item.themeId} /> : null}
      </span>
      <span className="flex items-start justify-between gap-2 px-1 pt-2 text-left"><span className="min-w-0"><b className="block truncate text-sm">{item.name}</b><span className="block truncate text-[11px] text-[var(--muted)]">{item.blurb}</span></span>{owned ? <Check size={16} className="shrink-0 text-[var(--accent)]" /> : <Price cents={item.priceCents} />}</span>
    </motion.button>
  );
}

function ThemeSwatch({ id }: { id: string }) {
  const t = THEME_BY_ID[id]; if (!t) return null;
  return <span className="theme-swatch" style={{ background: `linear-gradient(135deg, ${t.swatches[0]} 0 40%, ${t.swatches[1]} 40% 70%, ${t.swatches[2]} 70%)` }} />;
}

function WallSwatch({ tint, pattern }: { tint: string; pattern: string }) {
  const overlay =
    pattern === "stars" ? "radial-gradient(circle at 25% 30%, rgba(255,255,255,.8) 0 1.5px, transparent 2px), radial-gradient(circle at 70% 65%, rgba(255,255,255,.6) 0 1px, transparent 1.6px)"
    : pattern === "dots" ? "radial-gradient(circle at 50% 50%, rgba(255,255,255,.45) 0 2.4px, transparent 3px)"
    : pattern === "stripes" ? "repeating-linear-gradient(90deg, rgba(255,255,255,.18) 0 6px, transparent 6px 12px)"
    : pattern === "hearts" ? "radial-gradient(circle at 35% 40%, rgba(255,255,255,.5) 0 2px, transparent 2.6px), radial-gradient(circle at 65% 40%, rgba(255,255,255,.5) 0 2px, transparent 2.6px)"
    : "none";
  return <span className="theme-swatch" style={{ background: tint, backgroundImage: overlay, backgroundSize: pattern === "solid" ? undefined : "16px 16px" }} />;
}

function PreviewModal({ item, onClose }: { item: StoreItem | null; onClose: () => void }) {
  const { purchase, owns, ownsPack, previewTheme, engine, notify } = useApp();
  useEffect(() => {
    if (!item) return;
    if (item.kind === "theme" && item.themeId) previewTheme(item.themeId);
    if (item.kind === "interior" && item.themeId) previewTheme(item.themeId);
    if (item.kind === "sound_pack" && item.packId) { const sample = SOUNDS.find((s) => s.packId === item.packId && s.is_premium); if (sample) engine.preview(sample.id, sample.family, 10); }
    return () => { previewTheme(null); engine.stopPreview(); };
  }, [engine, item, previewTheme]);
  if (!item) return null;
  const owned = owns(item.id) || (item.kind === "sound_pack" && !!item.packId && ownsPack(item.packId));
  return (
    <Modal open={Boolean(item)} onClose={onClose} label={`Preview ${item.name}`}>
      <p className="kicker">Live preview</p>
      <h3 className="display text-2xl">{item.name}</h3>
      <div className="preview-stage">
        {item.cover && item.kind !== "sound_pack" && <Art art={COVER_ART[item.cover]} className="h-full w-full" rounded="rounded-2xl" />}
        {item.kind === "sound_pack" && item.cover && <><Art art={COVER_ART[item.cover]} className="h-full w-full" rounded="rounded-2xl" /><span className="preview-tag"><Play size={11} fill="currentColor" /> playing a premium loop</span></>}
        {item.species && <span className="w-40"><PetSprite species={item.species} mode="wander" facing="right" /></span>}
        {item.sprite && !item.cover && <span className="w-44"><FurnitureSprite sprite={item.sprite} tint={item.tint} /></span>}
        {item.interiorId && <Art art={INTERIOR_ART[item.interiorId]} className="h-full w-full" rounded="rounded-2xl" />}
        {item.kind === "wallcover" && <div className="text-center"><WallSwatch tint={item.tint ?? "#7fa088"} pattern={item.pattern ?? "solid"} /><p className="mt-2 text-xs text-[var(--muted)]">Applies to the whole wall from the Room menu.</p></div>}
        {item.kind === "theme" && item.themeId && <div className="text-center"><ThemeSwatch id={item.themeId} /><p className="mt-2 text-xs text-[var(--muted)]">The whole app is wearing this theme right now.</p></div>}
      </div>
      <p className="mt-3 text-sm text-[var(--muted)]">{item.blurb}</p>
      {item.bundle && <p className="mt-2 text-xs text-[var(--muted)]">Includes: {item.bundle.map((b) => STORE_BY_ID[b]?.name).filter(Boolean).join(", ")}</p>}
      <div className="mt-5 grid grid-cols-2 gap-3">
        <button className="btn-ghost" onClick={onClose}>Close</button>
        {owned ? <button className="btn-primary" onClick={() => { notify("Already in your account"); onClose(); }}><Check size={16} /> Owned</button> : <button className="btn-primary" onClick={() => { onClose(); purchase(item); }}>{item.priceCents === 0 ? "Add free item" : `Buy · ${formatPrice(item.priceCents)}`}</button>}
      </div>
    </Modal>
  );
}

function CommunityGrid({ onPack }: { onPack: (item: StoreItem) => void }) {
  const { state, toggleSound, engine, canPlay, ownsPack } = useApp();
  const merged = useMemo<GridEntry[]>(() => {
    const community = [...state.communitySounds, ...SOUNDS.filter((s) => s.packId === "community")].map((s) => ({ key: s.id, sound: s }));
    const official = SOUNDS.filter((s) => !s.is_premium && s.packId !== "community" && !s.mature).map((s) => ({ key: s.id, sound: s }));
    const packs = STORE_ITEMS.filter((i) => i.kind === "sound_pack").map((i) => ({ key: i.id, item: i }));
    const out: GridEntry[] = []; let c = 0, o = 0, p = 0;
    while (c < community.length || o < official.length || p < packs.length) {
      if (c < community.length) out.push(community[c++]);
      if (o < official.length) out.push(official[o++]);
      if (c < community.length) out.push(community[c++]);
      if (p < packs.length && out.length % 5 === 0) out.push(packs[p++]);
      if (o < official.length) out.push(official[o++]);
    }
    return out;
  }, [state.communitySounds]);
  const [count, setCount] = useState(12);
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current; if (!el) return;
    const io = new IntersectionObserver((entries) => { if (entries[0].isIntersecting) setCount((c) => Math.min(merged.length, c + 12)); }, { rootMargin: "300px" });
    io.observe(el); return () => io.disconnect();
  }, [merged.length]);
  const active = new Set(state.mix.tracks.map((t) => t.soundId));
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {merged.slice(0, count).map((entry) => entry.sound ? (
          <button key={entry.key} className={`sound-card ${active.has(entry.sound.id) ? "on" : ""}`} onClick={() => { const r = toggleSound(entry.sound!); if (r === "locked") engine.preview(entry.sound!.id, entry.sound!.family, 6); }}>
            <Art art={COVER_ART[entry.sound.cover]} className="aspect-[0.9] w-full" rounded="rounded-[20px]" />
            <span className="sound-card-shade" />
            <span className="sound-card-meta"><span className="block truncate text-sm font-extrabold">{entry.sound.title}</span><span className="block text-[11px] opacity-75">{entry.sound.packId === "community" ? "community · free" : "official · free"}</span></span>
            <span className={`sound-badge ${active.has(entry.sound.id) ? "on" : !canPlay(entry.sound).ok ? "locked" : ""}`}>{active.has(entry.sound.id) ? <Check size={14} strokeWidth={3} /> : <Play size={13} fill="currentColor" className="ml-0.5" />}</span>
          </button>
        ) : (
          <button key={entry.key} className="sound-card premium" onClick={() => onPack(entry.item!)}>
            <Art art={COVER_ART[entry.item!.cover ?? "missing"]} className="aspect-[0.9] w-full" rounded="rounded-[20px]" />
            <span className="sound-card-shade" />
            <span className="sound-card-meta"><span className="block truncate text-sm font-extrabold">{entry.item!.name}</span><span className="block text-[11px] opacity-75">developer pack · {ownsPack(entry.item!.packId!) ? "owned" : "$1.00"}</span></span>
            <span className="sound-badge locked">{ownsPack(entry.item!.packId!) ? <Check size={14} strokeWidth={3} /> : <Lock size={13} />}</span>
          </button>
        ))}
      </div>
      <div ref={sentinel} className="py-6 text-center text-xs text-[var(--muted)]">{count >= merged.length ? "You've reached the end of tonight's grid." : "Loading more…"}</div>
    </>
  );
}

/* ---------- Creator Library: sanitize → moderate → generate → private preview → share ---------- */
const BLOCKED = /(<\s*script|javascript:|on\w+\s*=|drop\s+table|insert\s+into|select\s+\*|union\s+select|\{\{|\$\{)/i;
const PROFANITY = /\b(fuck|shit|bitch|asshole|cunt|nigg|fag)\w*/i;
const sanitize = (raw: string) => raw.replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim().slice(0, 280);

function CreatorSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addCommunitySound, engine, notify, toggleSound, setTab } = useApp();
  const [prompt, setPrompt] = useState("");
  const [phase, setPhase] = useState<"idle" | "moderating" | "generating" | "ready" | "blocked">("idle");
  const [result, setResult] = useState<SoundDef | null>(null);
  const [share, setShare] = useState(false);
  const clean = sanitize(prompt);
  const run = () => {
    if (!clean) return;
    setPhase("moderating"); setResult(null);
    window.setTimeout(() => {
      if (BLOCKED.test(clean) || PROFANITY.test(clean)) { setPhase("blocked"); return; }
      setPhase("generating");
      window.setTimeout(() => {
        const family = familyFromPrompt(clean);
        const title = clean.split(" ").slice(0, 5).join(" ");
        const sound: SoundDef = { id: `community/${slug(title)}-${Date.now().toString(36)}`, packId: "community", title: title[0].toUpperCase() + title.slice(1), family, is_premium: false, mature: false, audioFile: `audio/community/${slug(title)}.m4a`, cover: "missing", tags: ["community", "generated", family] };
        setResult(sound); setPhase("ready"); engine.preview(sound.id, sound.family, 12);
      }, 1800);
    }, 1100);
  };
  const keep = () => {
    if (!result) return;
    addCommunitySound(result); engine.stopPreview();
    notify(share ? "Saved and queued for community review." : "Saved to your Sounds page (Community filter).", "success");
    toggleSound(result); onClose(); setTab("sounds"); setPrompt(""); setPhase("idle"); setResult(null);
  };
  return (
    <Sheet open={open} onClose={() => { engine.stopPreview(); onClose(); }} title="Create a sound" kicker="Creator library">
      <label className="kicker">Describe a place</label>
      <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} maxLength={280} placeholder="Rain on a canvas tent beside a slow river, far-off thunder…" className="input mt-2 min-h-28 resize-none" aria-label="Sound prompt" />
      <div className="mt-2 flex items-center justify-between text-xs text-[var(--muted)]"><span>{clean.length}/280 · sanitized on the server before generation</span><label className="flex items-center gap-2"><input type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)} /> share with community</label></div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button className="btn-primary" disabled={!clean || phase === "moderating" || phase === "generating"} onClick={run}><Sparkles size={16} />{phase === "moderating" ? "Moderating…" : phase === "generating" ? "Generating…" : "Generate"}</button>
        {phase === "ready" && result && <button className="btn-ghost" onClick={keep}><Check size={16} /> Keep & add to mix</button>}
      </div>
      <ol className="pipeline mt-5">
        {[["Sanitize", "strip control chars, trim to 280"], ["Moderate", "OpenAI moderation + injection/profanity filters"], ["Generate", "server-side text-to-audio provider"], ["Private preview", "only you can hear it"], ["Share (optional)", "human review before it goes public"]].map(([t, d], i) => {
          const stepDone = phase === "ready" ? i <= 3 : phase === "generating" ? i <= 1 : phase === "moderating" ? i <= 0 : false;
          return <li key={t} className={stepDone ? "done" : ""}><span className="dot" /><span><b>{t}</b><br /><span className="text-[var(--muted)]">{d}</span></span></li>;
        })}
      </ol>
      {phase === "blocked" && <p className="mt-4 rounded-2xl bg-[var(--danger)]/15 p-3 text-sm text-[var(--danger)]">Blocked by moderation: the prompt contains scripting/SQL patterns or profanity. Nothing was generated or stored.</p>}
      {phase === "ready" && result && <p className="mt-4 text-sm text-[var(--muted)]">Previewing “{result.title}” (synth family: {result.family}). A real provider would return a file at <code>{result.audioFile}</code>.</p>}
    </Sheet>
  );
}

