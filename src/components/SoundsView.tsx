import { motion } from "framer-motion";
import { Check, Lock, Play, Search, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { COVER_ART, HERO_ART } from "../data/art";
import { PACK_BY_ID, SOUNDS, SOUND_PACKS, type SoundDef } from "../data/soundCatalog";
import { STORE_ITEMS } from "../data/storeCatalog";
import { useApp } from "../state/store";
import { Art, Chip, SectionTitle, Tip } from "./ui";

type Filter = "all" | "free" | "owned" | "community" | "vocal";

export function SoundsView() {
  const app = useApp();
  const { state, toggleSound, ownsPack, canPlay, launchFlyer, notify, engine, confirm, purchase, playing, togglePlay, markTip, updateSettings } = app;
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [pack, setPack] = useState<string>("all");
  const active = new Set(state.mix.tracks.map((t) => t.soundId));

  const list = useMemo(() => {
    const all: SoundDef[] = [...state.communitySounds, ...SOUNDS];
    const q = query.trim().toLowerCase();
    return all.filter((s) => {
      if (s.mature && !state.settings.matureContent && filter !== "vocal") return false;
      if (filter === "free" && s.is_premium) return false;
      if (filter === "owned" && s.is_premium && !ownsPack(s.packId)) return false;
      if (filter === "community" && s.packId !== "community") return false;
      if (filter === "vocal" && !s.mature) return false;
      if (pack !== "all" && s.packId !== pack) return false;
      if (q && !`${s.title} ${s.tags.join(" ")} ${PACK_BY_ID[s.packId]?.title ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [filter, ownsPack, pack, query, state.communitySounds, state.settings.matureContent]);

  const onCard = (sound: SoundDef, el: HTMLElement) => {
    const result = toggleSound(sound);
    if (result === "added") {
      markTip("card-tap");
      const r = el.getBoundingClientRect();
      launchFlyer({ x: r.left, y: r.top, w: r.width, h: r.height }, COVER_ART[sound.cover]);
    } else if (result === "locked") {
      const packItem = STORE_ITEMS.find((i) => i.kind === "sound_pack" && i.packId === sound.packId);
      engine.preview(sound.id, sound.family, 8);
      confirm({
        title: `${sound.title} is in the ${PACK_BY_ID[sound.packId]?.title ?? "premium"} pack`,
        body: "You're hearing an 8-second preview. The whole pack is $1.00 and unlocks every premium loop in it. Three loops from this pack are already free.",
        price: "$1.00", confirmLabel: "Buy the pack",
        onConfirm: () => { engine.stopPreview(); if (packItem) purchase(packItem); },
      });
    } else if (result === "mature") {
      confirm({ title: "Vocal ASMR is opt-in", body: "These loops contain intimate sleepy voices and breathing. Confirm you are 18 or older to enable them in Settings → Content.", confirmLabel: "I'm 18+, enable", onConfirm: () => { updateSettings({ matureContent: true }); notify("Vocal ASMR enabled. You can turn it off in Settings."); } });
    }
  };

  return (
    <div className="pb-44">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0"><Art art={HERO_ART} rounded="rounded-none" className="h-full w-full" /></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)]/40 to-black/30" />
        <div className="relative mx-auto flex min-h-[54vh] max-w-6xl flex-col justify-end px-5 pb-8 pt-28 md:px-10">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <p className="kicker text-[var(--accent)]">Tonight's atmosphere</p>
            <h1 className="display text-5xl leading-[0.95] sm:text-7xl">Bed Buddies<br /><span className="text-[var(--accent-2)]">sounds like home.</span></h1>
            <p className="mt-4 max-w-md text-sm leading-6 text-[var(--text)]/75">Layer cozy loops into a mix folder, save your favorites, decorate your room with your buddies. Every pack keeps three loops free — always.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button className="btn-primary" onClick={togglePlay}><Play size={16} fill="currentColor" />{playing ? "Pause the room" : "Play my mix"}</button>
              <button className="btn-ghost" onClick={() => app.setTab("store")}><Sparkles size={16} /> Create a sound</button>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pt-8 md:px-10">
        <SectionTitle kicker={`${list.length} loops`} title="Choose what feels good" action={
          <label className="search"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="rain, train, cafe…" aria-label="Search sounds" /></label>
        } />
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
          {([["all", "All"], ["free", "Free"], ["owned", "Owned"], ["community", "Community"], ["vocal", "Vocal 18+"]] as [Filter, string][]).map(([id, label]) => <Chip key={id} active={filter === id} onClick={() => setFilter(id)}>{label}</Chip>)}
        </div>
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          <Chip active={pack === "all"} onClick={() => setPack("all")}>Every pack</Chip>
          {SOUND_PACKS.filter((p) => !p.mature || state.settings.matureContent).map((p) => <Chip key={p.id} active={pack === p.id} onClick={() => setPack(p.id)}>{p.short}{p.priceCents > 0 && !ownsPack(p.id) ? <Lock size={11} className="ml-1 inline opacity-60" /> : null}</Chip>)}
        </div>

        <div className="relative">
          <Tip id="card-tap" text="Tap a card — it pops into your mix folder below." className="-top-3 left-0 w-56" />
        </div>

        {list.length === 0 ? (
          <div className="card p-8 text-center text-sm text-[var(--muted)]">Nothing matches. Try “rain”, “cafe” or clear the filters.</div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 md:gap-4">
            {list.map((sound, i) => {
              const on = active.has(sound.id); const locked = !canPlay(sound).ok;
              return (
                <motion.button
                  key={sound.id} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: Math.min(i, 8) * 0.04 }}
                  whileTap={{ scale: 0.95 }} onClick={(e) => onCard(sound, e.currentTarget)}
                  className={`sound-card ${on ? "on" : ""}`} aria-pressed={on} aria-label={`${sound.title}${locked ? ", premium" : ""}`}
                >
                  <Art art={COVER_ART[sound.cover]} className="aspect-[0.9] w-full" rounded="rounded-[20px]" />
                  <span className="sound-card-shade" />
                  <span className="sound-card-meta">
                    <span className="block truncate text-sm font-extrabold">{sound.title}</span>
                    <span className="block text-[11px] opacity-75">{PACK_BY_ID[sound.packId]?.short ?? "Community"}{sound.is_premium ? " · pack" : " · free"}</span>
                  </span>
                  <span className={`sound-badge ${on ? "on" : locked ? "locked" : ""}`}>{on ? <Check size={14} strokeWidth={3} /> : locked ? <Lock size={13} /> : <Play size={13} fill="currentColor" className="ml-0.5" />}</span>
                </motion.button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
