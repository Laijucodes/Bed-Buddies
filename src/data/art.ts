/*
  Art registry.
  Every image is looked up by path. If a file is missing (or you delete one to
  replace it later) the UI automatically renders a "missing art" placeholder
  tile instead of breaking. To swap art: drop a new file at the same path.

  Cover grids: one image contains four covers (2 x 2). `quadrant` picks one:
  0 = top-left, 1 = top-right, 2 = bottom-left, 3 = bottom-right.
*/

const files = import.meta.glob<string>("../assets/art/**/*.{jpg,jpeg,png}", {
  eager: true,
  import: "default",
});

const art = (path: string): string => files[`../assets/art/${path}`] ?? "";

export type Quadrant = 0 | 1 | 2 | 3;
export type ArtRef = { src: string; quadrant?: Quadrant; label: string };

export const HERO_ART: ArtRef = { src: art("hero.jpg"), label: "Cozy bedroom at night" };

export const INTERIOR_ART: Record<string, ArtRef> = {
  rainroom: { src: art("interiors/rainroom.jpg"), label: "Rainroom" },
  "log-cabin": { src: art("interiors/log-cabin.jpg"), label: "Log cabin" },
  apartment: { src: art("interiors/apartment.jpg"), label: "Cozy apartment" },
  train: { src: art("interiors/train.jpg"), label: "Night train" },
  castle: { src: art("interiors/castle.jpg"), label: "Castle chamber" },
};

export type CoverKey =
  | "fire"
  | "rain"
  | "cafe"
  | "transit"
  | "water"
  | "chimes"
  | "library"
  | "workshop"
  | "city-rain"
  | "hail"
  | "coast"
  | "voice"
  | "holiday-christmas"
  | "holiday-halloween"
  | "holiday-thanksgiving"
  | "holiday-valentine"
  | "missing";

export const COVER_ART: Record<CoverKey, ArtRef> = {
  fire: { src: art("covers/grid-a.jpg"), quadrant: 0, label: "Campfire by a tent" },
  rain: { src: art("covers/grid-a.jpg"), quadrant: 1, label: "Rain on a tin roof" },
  cafe: { src: art("covers/grid-a.jpg"), quadrant: 2, label: "Cat cafe" },
  transit: { src: art("covers/grid-a.jpg"), quadrant: 3, label: "Train station at night" },
  water: { src: art("covers/grid-b.jpg"), quadrant: 0, label: "Forest creek" },
  chimes: { src: art("covers/grid-b.jpg"), quadrant: 1, label: "Wind chimes" },
  library: { src: art("covers/grid-b.jpg"), quadrant: 2, label: "Victorian library" },
  workshop: { src: art("covers/grid-b.jpg"), quadrant: 3, label: "Workshop bench" },
  "city-rain": { src: art("covers/grid-c.jpg"), quadrant: 0, label: "City rain window" },
  hail: { src: art("covers/grid-c.jpg"), quadrant: 1, label: "Greenhouse in hail" },
  coast: { src: art("covers/grid-c.jpg"), quadrant: 2, label: "Lighthouse coast" },
  voice: { src: art("covers/grid-c.jpg"), quadrant: 3, label: "Sleepy pillow" },
  "holiday-christmas": { src: art("covers/holiday-grid.jpg"), quadrant: 0, label: "Christmas set" },
  "holiday-halloween": { src: art("covers/holiday-grid.jpg"), quadrant: 1, label: "Halloween set" },
  "holiday-thanksgiving": { src: art("covers/holiday-grid.jpg"), quadrant: 2, label: "Thanksgiving set" },
  "holiday-valentine": { src: art("covers/holiday-grid.jpg"), quadrant: 3, label: "Valentine set" },
  missing: { src: "", label: "Art missing" },
};
