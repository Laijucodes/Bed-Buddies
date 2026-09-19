import { motion } from "framer-motion";
import { Heart, Play, Trash2 } from "lucide-react";
import { COVER_ART } from "../data/art";
import { useApp } from "../state/store";
import { Art, SectionTitle } from "./ui";

export function FavoritesView() {
  const { state, loadFavorite, deleteFavorite, resolveSound, currentFavoriteId, confirm, setTab } = useApp();
  const favorites = state.favorites;

  return (
    <div className="mx-auto max-w-6xl px-5 pb-44 pt-28 md:px-10">
      <SectionTitle kicker={`${favorites.length} saved`} title="Favorites" action={<Heart className="text-[#f27b93]" fill="currentColor" />} />
      {favorites.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-10 text-center">
          <Heart size={28} className="text-[#f27b93]" />
          <p className="display text-xl">No favorites yet</p>
          <p className="max-w-sm text-sm text-[var(--muted)]">Build a mix on the Sounds page, then tap the heart in the mix folder. Every saved mix remembers its volumes and both EQ layers.</p>
          <button className="btn-primary mt-2" onClick={() => setTab("sounds")}>Go mix something</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 md:gap-4">
          {favorites.map((fav, i) => {
            const sounds = fav.tracks.map((t) => resolveSound(t.soundId)).filter(Boolean);
            const isCurrent = currentFavoriteId === fav.id;
            return (
              <motion.div key={fav.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className={`fav-card ${isCurrent ? "current" : ""}`}>
                <button className="block w-full text-left" onClick={() => loadFavorite(fav)} aria-label={`Play ${fav.name}`}>
                  <div className="fav-collage">
                    {sounds.slice(0, 4).map((s) => <Art key={s!.id} art={COVER_ART[s!.cover]} rounded="rounded-none" className="h-full w-full" />)}
                    {sounds.length === 1 && <div className="bg-[var(--surface-2)]" />}
                  </div>
                  <div className="flex items-start justify-between gap-2 p-3">
                    <div className="min-w-0"><b className="block truncate text-sm">{fav.name}</b><span className="block truncate text-[11px] text-[var(--muted)]">{sounds.map((s) => s!.title).join(" · ")}</span></div>
                    <span className="badge-play"><Play size={12} fill="currentColor" className="ml-0.5" /></span>
                  </div>
                </button>
                <button className="fav-delete" aria-label={`Delete ${fav.name}`} onClick={() => confirm({ title: `Delete “${fav.name}”?`, confirmLabel: "Delete", danger: true, onConfirm: () => deleteFavorite(fav.id) })}><Trash2 size={13} /></button>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
