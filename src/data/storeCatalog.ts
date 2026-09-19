import type { CoverKey } from "./art";
import type { ThemeId } from "./themes";

export type Species = "cat" | "dog" | "fox" | "red-panda" | "squirrel" | "raccoon" | "pig";

/* Placement zones. Every decor item declares where it may live; placement is
   unrestricted inside that architectural zone (posters anywhere on the wall,
   fans anywhere on the ceiling, rugs anywhere on the floor…). */
export type Zone = "floor" | "wall" | "ceiling" | "wallcover";

export type SpriteKey =
  | "rug" | "carpet" | "mat" | "plant" | "lamp" | "tea-table" | "sofa" | "armchair" | "bookshelf" | "fireplace" | "desk" | "bed" | "kitchen"
  | "pillow" | "blanket" | "aquarium" | "fishbowl"
  | "poster" | "banner" | "shelf-wall" | "curtain" | "wreath"
  | "ceiling-light" | "ceiling-fan" | "string-lights"
  | "xmas-tree" | "gift-pile" | "pumpkin" | "ghost-lamp" | "harvest-basket" | "heart-garland" | "rose-vase";

export type Behavior = "seat" | "bed" | "appliance" | "light" | "tank" | "decor" | "shelf" | "softspot";
export type Pattern = "solid" | "stars" | "stripes" | "dots" | "hearts";

export type StoreKind =
  | "remove_ads" | "sound_pack" | "pet" | "aquarium" | "furniture" | "decor" | "wallcover" | "interior" | "theme" | "holiday";

export type StoreItem = {
  id: string;
  kind: StoreKind;
  name: string;
  blurb: string;
  priceCents: number;
  category: "top" | "room" | "sounds";
  zone?: Zone;
  cover?: CoverKey;
  sprite?: SpriteKey;
  behavior?: Behavior;
  tint?: string;             // recolors the sprite so one sprite = many themed items
  pattern?: Pattern;         // wallcovers only
  species?: Species;
  interiorId?: string;
  themeId?: ThemeId;
  packId?: string;
  bundle?: string[];
  holidayId?: string;
};

const room = (item: Omit<StoreItem, "category">): StoreItem => ({ ...item, category: "room" });
const floorItem = (id: string, sprite: SpriteKey, name: string, blurb: string, priceCents: number, behavior: Behavior = "decor", tint?: string): StoreItem =>
  room({ id, kind: "furniture", sprite, behavior, name, blurb, priceCents, zone: "floor", tint });
const wallItem = (id: string, sprite: SpriteKey, name: string, blurb: string, priceCents: number, tint?: string, behavior: Behavior = "decor"): StoreItem =>
  room({ id, kind: "decor", sprite, behavior, name, blurb, priceCents, zone: "wall", tint });
const ceilingItem = (id: string, sprite: SpriteKey, name: string, blurb: string, priceCents: number, tint?: string): StoreItem =>
  room({ id, kind: "decor", sprite, behavior: "light", name, blurb, priceCents, zone: "ceiling", tint });
const cover = (id: string, name: string, blurb: string, priceCents: number, pattern: Pattern, tint: string): StoreItem =>
  room({ id, kind: "wallcover", name, blurb, priceCents, zone: "wallcover", pattern, tint });

export const STORE_ITEMS: StoreItem[] = [
  {
    id: "remove_ads", kind: "remove_ads", category: "top", name: "Remove all ads — forever", priceCents: 500,
    blurb: "One $5.00 pass. The TV becomes cozy ambient art, or you can remove it from your room.",
  },

  /* ---- Pets ($1.00) — never craftable, never duplicated ---- */
  room({ id: "pet-cat", kind: "pet", species: "cat", name: "Rainy-day cat", priceCents: 100, zone: "floor", blurb: "Curls up on pillows, beds and warm laps of light." }),
  room({ id: "pet-red-panda", kind: "pet", species: "red-panda", name: "Red panda", priceCents: 100, zone: "floor", blurb: "Climbs wall shelves and dozes up high." }),
  room({ id: "pet-squirrel", kind: "pet", species: "squirrel", name: "Squirrel", priceCents: 100, zone: "floor", blurb: "Investigates lamps and hides acorns under rugs." }),
  room({ id: "pet-dog", kind: "pet", species: "dog", name: "Sleepy dog", priceCents: 100, zone: "floor", blurb: "Claims every mat and blanket as a nap spot." }),
  room({ id: "pet-fox", kind: "pet", species: "fox", name: "Fox", priceCents: 100, zone: "floor", blurb: "Watches the fire and the TV with equal devotion." }),
  room({ id: "pet-raccoon", kind: "pet", species: "raccoon", name: "Raccoon", priceCents: 100, zone: "floor", blurb: "Fiddles with every appliance you own." }),
  room({ id: "pet-pig", kind: "pet", species: "pig", name: "Baby pig", priceCents: 100, zone: "floor", blurb: "Trots, snuffles carpets, flops into bedding." }),
  room({ id: "tank-aquarium", kind: "aquarium", sprite: "aquarium", behavior: "tank", name: "Amber aquarium", priceCents: 100, zone: "floor", blurb: "Three fish that never leave the tank." }),
  room({ id: "tank-fishbowl", kind: "aquarium", sprite: "fishbowl", behavior: "tank", name: "Fish bowl", priceCents: 100, zone: "floor", blurb: "One round goldfish, one round bowl." }),

  /* ---- Starter items (free) ---- */
  floorItem("furniture-rug", "rug", "Woven rug", "Starter item. Pets love it.", 0),
  floorItem("furniture-plant", "plant", "Monstera", "Starter item. Thrives in dim light.", 0),
  floorItem("furniture-lamp", "lamp", "Mushroom lamp", "Starter item. Warm 2700K glow.", 0, "light"),
  floorItem("furniture-tea-table", "tea-table", "Tea table", "Starter item. Midnight tea headquarters.", 0, "appliance"),
  wallItem("decor-poster-moon", "poster", "Moon poster", "Starter item. A quiet crescent for your wall.", 0),

  /* ---- Furniture & soft things ($1.00) ---- */
  floorItem("furniture-sofa", "sofa", "Sage sofa", "Seats two. Cats claim it instantly.", 100, "seat"),
  floorItem("furniture-armchair", "armchair", "Reading chair", "Perfectly armchair-shaped.", 100, "seat"),
  floorItem("furniture-bookshelf", "bookshelf", "Bookshelf", "Raccoons will reorganize it.", 100, "appliance"),
  floorItem("furniture-fireplace", "fireplace", "Stone fireplace", "Animated flames. Foxes adore it.", 100, "appliance"),
  floorItem("furniture-desk", "desk", "Writing desk", "Letters get written here.", 100, "appliance"),
  floorItem("furniture-bed", "bed", "Quilted bed", "The main event. Pets agree.", 100, "bed", "#b3c9f2"),
  floorItem("furniture-kitchen", "kitchen", "Cozy kitchenette", "The kettle whistles at random.", 100, "appliance"),
  floorItem("soft-pillow", "pillow", "Floor pillow", "Cats consider this a five-star hotel.", 100, "softspot", "#f6b8c6"),
  floorItem("soft-blanket", "blanket", "Folded blanket", "A nap magnet for small animals.", 100, "softspot", "#cfe3c4"),
  floorItem("floor-carpet", "carpet", "Big round carpet", "Anchors the whole room.", 100, "decor", "#e8c9a0"),
  floorItem("floor-mat", "mat", "Little mat", "For muddy paws and morning stretches.", 100, "decor", "#a9d6b6"),

  /* ---- Wall decor ($1.00) ---- */
  wallItem("wall-shelf", "shelf-wall", "Wall shelf", "Red pandas climb it. That's the point.", 100, undefined, "shelf"),
  wallItem("wall-banner", "banner", "Flag banner", "A gentle little celebration.", 100, "#f2c9a0"),
  wallItem("wall-poster-forest", "poster", "Forest poster", "A pine forest to stare into.", 100, "#8fc3a0"),
  wallItem("wall-curtain", "curtain", "Window curtains", "Softens the rain-light.", 100, "#b3c9f2"),
  wallItem("wall-wreath", "wreath", "Leafy wreath", "Round, green, correct.", 100, "#6fbf7f"),

  /* ---- Ceiling decor ($1.00) ---- */
  ceilingItem("ceiling-pendant", "ceiling-light", "Pendant light", "Hangs anywhere on the ceiling.", 100, "#ffe08a"),
  ceilingItem("ceiling-fan", "ceiling-fan", "Ceiling fan", "Spins at a very unhurried pace.", 100),
  ceilingItem("ceiling-strings", "string-lights", "String lights", "Instant golden hour.", 100, "#ffe08a"),

  /* ---- Wall paint & wallpaper ($1.00) ---- */
  cover("paint-sage", "Sage wall paint", "Repaints the whole wall in calm green.", 100, "solid", "#7fa88a"),
  cover("paint-dusk", "Dusk wall paint", "A deep, sleepy blue-grey.", 100, "solid", "#5f6f8f"),
  cover("paper-stars", "Starry wallpaper", "Tiny stars over midnight blue.", 100, "stars", "#3c4a72"),
  cover("paper-stripes", "Striped wallpaper", "Soft bakery stripes.", 100, "stripes", "#e8b9a0"),
  cover("paper-dots", "Dotty wallpaper", "Polka dots, extremely polite.", 100, "dots", "#8fa9a0"),

  /* ---- House interiors ($1.00, unlock their UI theme) ---- */
  room({ id: "interior-log-cabin", kind: "interior", interiorId: "log-cabin", themeId: "amber-cabin", name: "Log cabin room", priceCents: 100, blurb: "Timber walls and snowfall. Unlocks the Amber Cabin app theme." }),
  room({ id: "interior-apartment", kind: "interior", interiorId: "apartment", themeId: "pastel-garden", name: "City apartment room", priceCents: 100, blurb: "Rainy skyline window. Unlocks Pastel Garden." }),
  room({ id: "interior-train", kind: "interior", interiorId: "train", themeId: "midnight-train", name: "Night train room", priceCents: 100, blurb: "A sleeper car forever between stations. Unlocks Midnight Train." }),
  room({ id: "interior-castle", kind: "interior", interiorId: "castle", themeId: "castle-stone", name: "Castle chamber room", priceCents: 100, blurb: "Moonlit stone and candle glow. Unlocks Castle Stone." }),

  /* ---- UI theme packs ($1.00) — now full decor bundles, not just colors ---- */
  room({
    id: "theme-victorian-library", kind: "theme", themeId: "victorian-library", name: "Victorian Library set", priceCents: 100,
    blurb: "The UI theme plus curtains, carpet, shelf, pendant, poster and bedding to match.",
    bundle: ["tb-vic-curtain", "tb-vic-carpet", "tb-vic-shelf", "tb-vic-pendant", "tb-vic-poster", "tb-vic-pillow", "tb-vic-blanket", "tb-vic-paint"],
  }),
  room({
    id: "theme-pastel-garden", kind: "theme", themeId: "pastel-garden", name: "Pastel Garden set", priceCents: 100,
    blurb: "The UI theme plus blossom wallpaper, curtains, carpet, strings and soft things.",
    bundle: ["tb-pg-paper", "tb-pg-curtain", "tb-pg-carpet", "tb-pg-strings", "tb-pg-poster", "tb-pg-pillow", "tb-pg-blanket", "tb-pg-mat"],
  }),

  /* ---- Holiday sets ($1.00 bundles): enough to redecorate the entire room ---- */
  room({
    id: "holiday-christmas", kind: "holiday", holidayId: "christmas", cover: "holiday-christmas", name: "Christmas set", priceCents: 100,
    blurb: "Full redecoration: pine paint, snowy wallpaper, tree, gifts, wreath, garland banner, strings, bedding, rug, mat, pillow, blanket and the Christmas Eve theme.",
    bundle: ["hb-xm-paint", "hb-xm-paper", "decor-xmas-tree", "decor-gift-pile", "hb-xm-wreath", "hb-xm-banner", "hb-xm-strings", "hb-xm-pendant", "hb-xm-bed", "hb-xm-rug", "hb-xm-mat", "hb-xm-pillow", "hb-xm-blanket", "hb-xm-poster", "theme-holiday-christmas"],
  }),
  room({
    id: "holiday-halloween", kind: "holiday", holidayId: "halloween", cover: "holiday-halloween", name: "Halloween set", priceCents: 100,
    blurb: "Full redecoration: plum paint, bat-star wallpaper, pumpkins, ghost lamp, banner, strings, curtains, bedding, rug, pillow, blanket and the Halloween Night theme.",
    bundle: ["hb-hw-paint", "hb-hw-paper", "decor-pumpkin", "decor-ghost-lamp", "hb-hw-banner", "hb-hw-strings", "hb-hw-curtain", "hb-hw-bed", "hb-hw-rug", "hb-hw-mat", "hb-hw-pillow", "hb-hw-blanket", "hb-hw-poster", "theme-holiday-halloween"],
  }),
  room({
    id: "holiday-thanksgiving", kind: "holiday", holidayId: "thanksgiving", cover: "holiday-thanksgiving", name: "Thanksgiving set", priceCents: 100,
    blurb: "Full redecoration: amber paint, dotty wallpaper, harvest basket, autumn wreath, banner, pendant, bedding, carpet, mat, pillow and blanket.",
    bundle: ["hb-tg-paint", "hb-tg-paper", "decor-harvest-basket", "hb-tg-wreath", "hb-tg-banner", "hb-tg-pendant", "hb-tg-bed", "hb-tg-carpet", "hb-tg-mat", "hb-tg-pillow", "hb-tg-blanket", "hb-tg-poster"],
  }),
  room({
    id: "holiday-valentine", kind: "holiday", holidayId: "valentine", cover: "holiday-valentine", name: "Valentine set", priceCents: 100,
    blurb: "Full redecoration: blush paint, heart wallpaper, garland, roses, banner, strings, curtains, bedding, rug, pillow and blanket.",
    bundle: ["hb-vd-paint", "hb-vd-paper", "decor-heart-garland", "decor-rose-vase", "hb-vd-banner", "hb-vd-strings", "hb-vd-curtain", "hb-vd-bed", "hb-vd-rug", "hb-vd-pillow", "hb-vd-blanket", "hb-vd-poster"],
  }),

  /* ---- Bundle members (granted through sets & holiday rewards, never sold alone) ---- */
  /* hero holiday sprites */
  floorItem("decor-xmas-tree", "xmas-tree", "Christmas tree", "Twinkling lights.", 0, "light"),
  floorItem("decor-gift-pile", "gift-pile", "Gift pile", "Do not shake.", 0),
  floorItem("decor-pumpkin", "pumpkin", "Carved pumpkin", "Friendly face.", 0, "light"),
  floorItem("decor-ghost-lamp", "ghost-lamp", "Ghost lamp", "Boo, softly.", 0, "light"),
  floorItem("decor-harvest-basket", "harvest-basket", "Harvest basket", "Pumpkins and corn.", 0),
  wallItem("decor-heart-garland", "heart-garland", "Heart garland", "Pink paper hearts.", 0),
  floorItem("decor-rose-vase", "rose-vase", "Rose vase", "Three roses.", 0),
  /* christmas */
  cover("hb-xm-paint", "Pine wall paint", "Deep evergreen.", 0, "solid", "#3f6b4f"),
  cover("hb-xm-paper", "Snowfall wallpaper", "Stars like falling snow.", 0, "stars", "#2f4d3d"),
  wallItem("hb-xm-wreath", "wreath", "Holly wreath", "With a red bow.", 0, "#4f8f5f"),
  wallItem("hb-xm-banner", "banner", "Garland banner", "Pine and cranberry flags.", 0, "#e2626a"),
  ceilingItem("hb-xm-strings", "string-lights", "Warm string lights", "Golden holiday glow.", 0, "#ffe08a"),
  ceilingItem("hb-xm-pendant", "ceiling-light", "Brass pendant", "Candle-warm light.", 0, "#f2c9a0"),
  floorItem("hb-xm-bed", "bed", "Cranberry bedding", "The bed, in holiday dress.", 0, "bed", "#e2626a"),
  floorItem("hb-xm-rug", "rug", "Cranberry rug", "Warm underfoot.", 0, "decor", "#c25a5f"),
  floorItem("hb-xm-mat", "mat", "Evergreen mat", "For snowy paws.", 0, "decor", "#5f9c6f"),
  floorItem("hb-xm-pillow", "pillow", "Holiday pillow", "Extremely nappable.", 0, "softspot", "#e2626a"),
  floorItem("hb-xm-blanket", "blanket", "Snow blanket", "Cream knit.", 0, "softspot", "#f5e6c8"),
  wallItem("hb-xm-poster", "poster", "Winter poster", "A pine in snow.", 0, "#9fc3ad"),
  /* halloween */
  cover("hb-hw-paint", "Plum wall paint", "Twilight purple.", 0, "solid", "#5a4470"),
  cover("hb-hw-paper", "Bat-star wallpaper", "Purple night, tiny stars.", 0, "stars", "#3a2a52"),
  wallItem("hb-hw-banner", "banner", "Pumpkin banner", "Orange and black flags.", 0, "#f7a35c"),
  ceilingItem("hb-hw-strings", "string-lights", "Ember string lights", "Pumpkin-glow orange.", 0, "#f7a35c"),
  wallItem("hb-hw-curtain", "curtain", "Midnight curtains", "For dramatic reveals.", 0, "#4a3a62"),
  floorItem("hb-hw-bed", "bed", "Midnight bedding", "Sleep spookily.", 0, "bed", "#8b6fd6"),
  floorItem("hb-hw-rug", "rug", "Plum rug", "Soft as a shadow.", 0, "decor", "#7a5f9c"),
  floorItem("hb-hw-mat", "mat", "Black cat mat", "For black cat paws.", 0, "decor", "#3b3540"),
  floorItem("hb-hw-pillow", "pillow", "Pumpkin pillow", "Round and orange.", 0, "softspot", "#f7a35c"),
  floorItem("hb-hw-blanket", "blanket", "Cobweb blanket", "Lavender knit.", 0, "softspot", "#b48cf2"),
  wallItem("hb-hw-poster", "poster", "Spooky poster", "A friendly ghost portrait.", 0, "#b48cf2"),
  /* thanksgiving */
  cover("hb-tg-paint", "Amber wall paint", "Baked-pie warm.", 0, "solid", "#a5713f"),
  cover("hb-tg-paper", "Harvest wallpaper", "Warm dots like falling leaves.", 0, "dots", "#8f6a45"),
  wallItem("hb-tg-wreath", "wreath", "Autumn wreath", "Maple and wheat.", 0, "#d98a4a"),
  wallItem("hb-tg-banner", "banner", "Autumn banner", "Rust and gold flags.", 0, "#d98a4a"),
  ceilingItem("hb-tg-pendant", "ceiling-light", "Lantern pendant", "Harvest-supper light.", 0, "#f2c9a0"),
  floorItem("hb-tg-bed", "bed", "Harvest bedding", "Pumpkin-spice quilt.", 0, "bed", "#d98a4a"),
  floorItem("hb-tg-carpet", "carpet", "Maple carpet", "The big autumn round.", 0, "decor", "#c98f5a"),
  floorItem("hb-tg-mat", "mat", "Wheat mat", "Crunchy-looking, soft-feeling.", 0, "decor", "#e0b086"),
  floorItem("hb-tg-pillow", "pillow", "Corn pillow", "Butter yellow.", 0, "softspot", "#ffe08a"),
  floorItem("hb-tg-blanket", "blanket", "Orchard blanket", "Deep rust knit.", 0, "softspot", "#b86a3f"),
  wallItem("hb-tg-poster", "poster", "Orchard poster", "A tree letting go of its leaves.", 0, "#d98a4a"),
  /* valentine */
  cover("hb-vd-paint", "Blush wall paint", "The gentlest pink.", 0, "solid", "#c98a96"),
  cover("hb-vd-paper", "Heart wallpaper", "Tiny hearts on rose.", 0, "hearts", "#b06a7c"),
  wallItem("hb-vd-banner", "banner", "Rose banner", "Pink and cream flags.", 0, "#f6b8c6"),
  ceilingItem("hb-vd-strings", "string-lights", "Rose string lights", "A soft pink dusk.", 0, "#f6b8c6"),
  wallItem("hb-vd-curtain", "curtain", "Rose curtains", "Blushing softly.", 0, "#f2b8be"),
  floorItem("hb-vd-bed", "bed", "Rose bedding", "For synchronized napping.", 0, "bed", "#f2b8c6"),
  floorItem("hb-vd-rug", "rug", "Rose rug", "Petal soft.", 0, "decor", "#e8a2a8"),
  floorItem("hb-vd-pillow", "pillow", "Heart pillow", "The classic.", 0, "softspot", "#e2626a"),
  floorItem("hb-vd-blanket", "blanket", "Sweetheart blanket", "Cream and rose knit.", 0, "softspot", "#fbe3e8"),
  wallItem("hb-vd-poster", "poster", "Love letter poster", "Sealed with wax.", 0, "#f6b8c6"),
  /* theme bundles */
  cover("tb-vic-paint", "Oxblood wall paint", "Library-deep red-brown.", 0, "solid", "#6a3a42"),
  wallItem("tb-vic-curtain", "curtain", "Velvet curtains", "Heavy, dignified, dusty.", 0, "#8a4a56"),
  floorItem("tb-vic-carpet", "carpet", "Parlor carpet", "With invisible tea stains.", 0, "decor", "#8a5a4a"),
  wallItem("tb-vic-shelf", "shelf-wall", "Brass wall shelf", "For first editions.", 0, "#c8a46a", "shelf"),
  ceilingItem("tb-vic-pendant", "ceiling-light", "Brass pendant", "Warm reading light.", 0, "#d8b26e"),
  wallItem("tb-vic-poster", "poster", "Botanical print", "Framed and faded.", 0, "#a9536a"),
  floorItem("tb-vic-pillow", "pillow", "Velvet pillow", "Oxblood, naturally.", 0, "softspot", "#8a4a56"),
  floorItem("tb-vic-blanket", "blanket", "Tartan blanket", "Scratchy in a good way.", 0, "softspot", "#a9536a"),
  cover("tb-pg-paper", "Blossom wallpaper", "Mint dots like petals.", 0, "dots", "#7fa08a"),
  wallItem("tb-pg-curtain", "curtain", "Petal curtains", "Rose-pink gauze.", 0, "#f2b8c6"),
  floorItem("tb-pg-carpet", "carpet", "Garden carpet", "Fresh mint round.", 0, "decor", "#a9dcb8"),
  ceilingItem("tb-pg-strings", "string-lights", "Petal string lights", "Pink fireflies.", 0, "#f2b8c6"),
  wallItem("tb-pg-poster", "poster", "Garden poster", "Tulips at dusk.", 0, "#a9dcb8"),
  floorItem("tb-pg-pillow", "pillow", "Blossom pillow", "Petal pink.", 0, "softspot", "#f2b8c6"),
  floorItem("tb-pg-blanket", "blanket", "Meadow blanket", "Mint knit.", 0, "softspot", "#a9dcb8"),
  floorItem("tb-pg-mat", "mat", "Clover mat", "Lucky by default.", 0, "decor", "#8fc3a0"),
  /* theme unlock tokens */
  room({ id: "theme-holiday-christmas", kind: "theme", themeId: "holiday-christmas", name: "Christmas Eve theme", priceCents: 0, blurb: "Pine, cranberry, snow." }),
  room({ id: "theme-holiday-halloween", kind: "theme", themeId: "holiday-halloween", name: "Halloween Night theme", priceCents: 0, blurb: "Plum and pumpkin." }),

  /* ---- Sound packs ($1.00) ---- */
  { id: "pack-campfire", kind: "sound_pack", packId: "campfire", category: "sounds", cover: "fire", name: "Campfire & Interiors pack", priceCents: 100, blurb: "16 loops. 3 are already free." },
  { id: "pack-weather", kind: "sound_pack", packId: "weather", category: "sounds", cover: "rain", name: "Wind, Weather & Storms pack", priceCents: 100, blurb: "25 loops. 3 are already free." },
  { id: "pack-transit", kind: "sound_pack", packId: "transit", category: "sounds", cover: "transit", name: "Vehicles & Transit pack", priceCents: 100, blurb: "44 loops. 3 are already free." },
  { id: "pack-nature", kind: "sound_pack", packId: "nature", category: "sounds", cover: "water", name: "Nature, Water & Animals pack", priceCents: 100, blurb: "20 loops. 3 are already free." },
  { id: "pack-cafes", kind: "sound_pack", packId: "cafes", category: "sounds", cover: "cafe", name: "Cafes & Aesthetics pack", priceCents: 100, blurb: "32 loops. 3 are already free." },
  { id: "pack-hobbies", kind: "sound_pack", packId: "hobbies", category: "sounds", cover: "chimes", name: "Chimes & Hobbies pack", priceCents: 100, blurb: "38 loops. 3 are already free." },
];

export const STORE_BY_ID: Record<string, StoreItem> = Object.fromEntries(STORE_ITEMS.map((i) => [i.id, i]));
export const STARTER_INVENTORY = ["furniture-rug", "furniture-plant", "furniture-lamp", "furniture-tea-table", "decor-poster-moon"];

/* Items that live in the room menu (placeable). Pets are placeable but NOT craftable. */
export const PLACEABLE_KINDS: StoreKind[] = ["pet", "aquarium", "furniture", "decor", "wallcover"];
export const isCraftable = (item: StoreItem) => PLACEABLE_KINDS.includes(item.kind) && item.kind !== "pet";

export type HolidayCampaign = { id: string; name: string; setItemId: string; rewardItemId: string; requiredDays: number };
export const HOLIDAY_CAMPAIGNS: HolidayCampaign[] = [
  { id: "christmas", name: "Christmas week", setItemId: "holiday-christmas", rewardItemId: "decor-gift-pile", requiredDays: 7 },
  { id: "halloween", name: "Halloween week", setItemId: "holiday-halloween", rewardItemId: "decor-pumpkin", requiredDays: 7 },
  { id: "thanksgiving", name: "Thanksgiving week", setItemId: "holiday-thanksgiving", rewardItemId: "hb-tg-pillow", requiredDays: 7 },
  { id: "valentine", name: "Valentine week", setItemId: "holiday-valentine", rewardItemId: "decor-heart-garland", requiredDays: 7 },
];

export const formatPrice = (cents: number) => (cents === 0 ? "Free" : `$${(cents / 100).toFixed(2)}`);
