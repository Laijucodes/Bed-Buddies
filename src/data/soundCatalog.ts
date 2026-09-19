/*
  ================================================================
  HUSHROOM MASTER SOUND MANIFEST  (developer-controlled audio tiering)
  ================================================================

  HOW TO DECIDE WHAT IS FREE:
    free("Title", "family")  -> is_premium = false  (playable by everyone)
    paid("Title", "family")  -> is_premium = true   (needs the pack purchase)

  RULE OF 3:
    Every pack that is SOLD (priceCents > 0) must contain at least three
    free() sounds. `catalogIssues()` reports violations; the Developer
    panel in Settings shows them, and the server schema enforces the same
    rule with a trigger before a pack can be published.

  AUDIO FILES:
    Each sound gets `audioFile` = "audio/<pack>/<slug>.m4a". Real recordings
    are not bundled in this web build; the audio engine synthesizes a
    procedural stand-in from the `family` recipe so everything is playable
    today. Drop the real file at that path and switch the engine's source
    strategy (see docs) when you have recordings.
*/

import type { CoverKey } from "./art";

export type Family =
  | "rain-soft" | "rain-heavy" | "rain-tin" | "rain-glass" | "rain-car" | "rain-city" | "rain-forest" | "attic-rain" | "diner-rain" | "bus-rain" | "station-rain"
  | "thunder-soft" | "thunder-harsh" | "hail" | "snow" | "hurricane"
  | "wind" | "wind-howl" | "wind-desert"
  | "fire" | "fire-night" | "fire-forge" | "bothy" | "cauldron"
  | "creek" | "waterfall" | "ocean" | "lake" | "hot-spring" | "underwater" | "drips" | "pool"
  | "cafe" | "pub" | "crowd" | "kitchen" | "radio" | "arcade" | "club" | "town" | "city" | "mall" | "ballroom" | "caravan" | "whisper"
  | "engine-car" | "engine-motorcycle" | "engine-train" | "train-blizzard" | "steam" | "station" | "airplane" | "ship" | "submarine" | "space" | "carriage"
  | "hum" | "fan" | "static" | "servers" | "printing" | "laundromat" | "bowling"
  | "chimes-metal" | "chimes-bamboo" | "chimes-bones" | "bells" | "creak"
  | "birds" | "crickets" | "farm" | "horses" | "monkeys" | "greenhouse"
  | "room-tone" | "office" | "workshop" | "anvil" | "clock" | "library" | "writing" | "church" | "gym" | "tailor" | "cellar"
  | "voice-talk-f" | "voice-talk-m" | "voice-breath-f" | "voice-breath-m";

export type SoundDef = {
  id: string;
  packId: string;
  title: string;
  family: Family;
  is_premium: boolean;
  mature: boolean;
  audioFile: string;
  cover: CoverKey;
  tags: string[];
};

export type SoundPack = {
  id: string;
  title: string;
  short: string;
  blurb: string;
  priceCents: number;
  productId: string | null;
  cover: CoverKey;
  mature: boolean;
  sounds: SoundDef[];
};

type Draft = { title: string; family: Family; premium: boolean; mature?: boolean; tags?: string[] };

const free = (title: string, family: Family, tags: string[] = []): Draft => ({ title, family, premium: false, tags });
const paid = (title: string, family: Family, tags: string[] = []): Draft => ({ title, family, premium: true, tags });
const matureFree = (title: string, family: Family, tags: string[] = []): Draft => ({ title, family, premium: false, mature: true, tags });

export const slug = (value: string) =>
  value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const FAMILY_COVER: Record<Family, CoverKey> = {
  "rain-soft": "rain", "rain-heavy": "rain", "rain-tin": "rain", "rain-glass": "city-rain", "rain-car": "city-rain", "rain-city": "city-rain", "rain-forest": "water", "attic-rain": "rain", "diner-rain": "city-rain", "bus-rain": "city-rain", "station-rain": "transit",
  "thunder-soft": "rain", "thunder-harsh": "hail", hail: "hail", snow: "hail", hurricane: "hail",
  wind: "chimes", "wind-howl": "coast", "wind-desert": "chimes",
  fire: "fire", "fire-night": "fire", "fire-forge": "workshop", bothy: "fire", cauldron: "fire",
  creek: "water", waterfall: "water", ocean: "coast", lake: "water", "hot-spring": "water", underwater: "coast", drips: "water", pool: "water",
  cafe: "cafe", pub: "cafe", crowd: "cafe", kitchen: "cafe", radio: "cafe", arcade: "workshop", club: "cafe", town: "cafe", city: "city-rain", mall: "cafe", ballroom: "library", caravan: "chimes", whisper: "voice",
  "engine-car": "transit", "engine-motorcycle": "transit", "engine-train": "transit", "train-blizzard": "transit", steam: "transit", station: "transit", airplane: "transit", ship: "coast", submarine: "coast", space: "transit", carriage: "transit",
  hum: "workshop", fan: "workshop", static: "workshop", servers: "workshop", printing: "workshop", laundromat: "workshop", bowling: "cafe",
  "chimes-metal": "chimes", "chimes-bamboo": "chimes", "chimes-bones": "chimes", bells: "chimes", creak: "chimes",
  birds: "water", crickets: "chimes", farm: "water", horses: "water", monkeys: "water", greenhouse: "hail",
  "room-tone": "library", office: "library", workshop: "workshop", anvil: "workshop", clock: "workshop", library: "library", writing: "library", church: "library", gym: "workshop", tailor: "workshop", cellar: "library",
  "voice-talk-f": "voice", "voice-talk-m": "voice", "voice-breath-f": "voice", "voice-breath-m": "voice",
};

function definePack(
  meta: { id: string; title: string; short: string; blurb: string; priceCents: number; cover: CoverKey; mature?: boolean },
  drafts: Draft[],
): SoundPack {
  return {
    ...meta,
    mature: meta.mature ?? false,
    productId: meta.priceCents > 0 ? `hushroom.pack.${meta.id}` : null,
    sounds: drafts.map((d) => ({
      id: `${meta.id}/${slug(d.title)}`,
      packId: meta.id,
      title: d.title,
      family: d.family,
      is_premium: d.premium,
      mature: d.mature ?? false,
      audioFile: `audio/${meta.id}/${slug(d.title)}.m4a`,
      cover: FAMILY_COVER[d.family],
      tags: [...(d.tags ?? []), d.family.split("-")[0], meta.short.toLowerCase()],
    })),
  };
}

export const SOUND_PACKS: SoundPack[] = [
  definePack({ id: "campfire", title: "Campfire & Interiors", short: "Campfire", blurb: "Crackling fires, cabins and warm rooms.", priceCents: 100, cover: "fire" }, [
    free("Campfire", "fire", ["fire", "outdoors"]),
    free("Campfire by a tent at night", "fire-night", ["fire", "tent", "night"]),
    free("Fireplace in a cabin", "fire", ["fire", "cabin"]),
    paid("Indoor fireplace", "fire", ["fire", "indoor"]),
    paid("Dark cabin rain", "attic-rain", ["cabin", "rain"]),
    paid("Cabin in the woods", "crickets", ["cabin", "forest"]),
    paid("Cabin by a stream", "creek", ["cabin", "stream"]),
    paid("Cabin in the rain", "rain-soft", ["cabin", "rain"]),
    paid("Cabin on a sea cliff", "ocean", ["cabin", "sea"]),
    paid("Attics & lofts", "creak", ["attic", "wood"]),
    paid("Boiler room & basement", "hum", ["boiler", "basement"]),
    paid("Kitchen during a holiday feast", "kitchen", ["kitchen", "holiday"]),
    paid("Garage while a parent works", "workshop", ["garage", "tools"]),
    paid("Blacksmith's forge, winter evening", "fire-forge", ["forge", "winter"]),
    paid("Witch's cottage potion brew", "cauldron", ["witch", "bubbles"]),
    paid("Scottish Highlands bothy", "bothy", ["stone", "wind", "fire"]),
  ]),

  definePack({ id: "weather", title: "Wind, Weather & Storms", short: "Weather", blurb: "Wind, roofs in rain, thunder and hail.", priceCents: 100, cover: "rain" }, [
    free("Wind-swept landscape", "wind", ["wind"]),
    free("Wind-swept plateau", "wind-howl", ["wind"]),
    free("Wind-swept plains", "wind", ["wind", "grass"]),
    paid("Windy beach", "ocean", ["wind", "beach"]),
    paid("Clay roof with rain", "rain-soft", ["roof", "rain"]),
    paid("Lone tree in the wind", "wind", ["tree", "wind"]),
    paid("Ancient Asian clay roof", "rain-soft", ["roof", "rain"]),
    paid("Tin roof with rain", "rain-tin", ["roof", "rain", "metal"]),
    paid("Rain chain", "drips", ["rain", "drips"]),
    paid("Heavy downpour", "rain-heavy", ["rain", "storm"]),
    paid("Monsoon", "rain-heavy", ["rain", "monsoon"]),
    paid("Harsh thunder", "thunder-harsh", ["thunder", "storm"]),
    paid("Rumbling thunder", "thunder-soft", ["thunder", "low"]),
    paid("Rainforest rainfall", "rain-forest", ["rain", "rainforest"]),
    paid("Wind rustling through trees", "wind", ["wind", "leaves"]),
    paid("Greenhouse dome in a hailstorm", "hail", ["hail", "glass"]),
    paid("Hailstorm", "hail", ["hail"]),
    paid("Tornado (distant)", "wind-howl", ["tornado", "storm"]),
    paid("Hurricane", "hurricane", ["storm", "wind", "rain"]),
    paid("Howling, whistling windows", "wind-howl", ["wind", "window"]),
    paid("Greenhouses & conservatories", "greenhouse", ["plants", "drips"]),
    paid("Desert canyons", "wind-desert", ["desert", "wind"]),
    paid("Monasteries & stone cathedrals", "church", ["stone", "echo"]),
    paid("Victorian London attic, smoggy rainstorm", "attic-rain", ["attic", "rain", "victorian"]),
    paid("Victorian conservatory, autumn frost", "greenhouse", ["frost", "glass"]),
  ]),

  definePack({ id: "transit", title: "Vehicles, Transit & Public Spaces", short: "Transit", blurb: "Trains, cars in rain, stations and quiet halls.", priceCents: 100, cover: "transit" }, [
    free("Inside a train", "engine-train", ["train"]),
    free("Train station", "station", ["train", "station"]),
    free("Night city rain", "rain-city", ["city", "rain", "night"]),
    paid("Motor of a motorcycle", "engine-motorcycle", ["engine"]),
    paid("Motorcycle cruising", "engine-motorcycle", ["road"]),
    paid("Office", "office", ["office"]),
    paid("Business cubicle", "office", ["office"]),
    paid("Airport interior", "crowd", ["airport"]),
    paid("Airplane interior", "airplane", ["plane", "cabin"]),
    paid("Train through a tunnel", "engine-train", ["train", "tunnel"]),
    paid("Train interior", "engine-train", ["train"]),
    paid("Van interior in rain", "rain-car", ["van", "rain"]),
    paid("Car interior in rain", "rain-car", ["car", "rain"]),
    paid("RV in rain", "rain-car", ["rv", "rain"]),
    paid("Skoolie in rain", "bus-rain", ["bus", "rain"]),
    paid("Car glass roof rain", "rain-glass", ["car", "glass", "rain"]),
    paid("Glass roof rain", "rain-glass", ["glass", "rain"]),
    paid("City street rain", "rain-city", ["city", "rain"]),
    paid("Moving car in rain", "rain-car", ["car", "rain", "drive"]),
    paid("Highway", "engine-car", ["highway", "cars"]),
    paid("Overpass", "engine-car", ["overpass", "cars"]),
    paid("Laundromat, morning", "laundromat", ["laundry"]),
    paid("Laundromat, night", "laundromat", ["laundry", "night"]),
    paid("Laundromat at 3 AM", "laundromat", ["laundry", "night"]),
    paid("Undersea submarine", "submarine", ["submarine", "ocean"]),
    paid("Space station cabin", "space", ["space", "hum"]),
    paid("Horse-drawn carriage", "carriage", ["horse", "carriage"]),
    paid("Server room & data center", "servers", ["servers", "fans"]),
    paid("Hydroponic lab", "greenhouse", ["lab", "drips"]),
    paid("Vintage steamboat engine room", "steam", ["steam", "engine"]),
    paid("Ferry cabin", "ship", ["ferry", "water"]),
    paid("Sub-deck crew quarters", "ship", ["ship", "quarters"]),
    paid("1990s video rental store", "hum", ["retro", "store"]),
    paid("Midnight printing press", "printing", ["press", "rhythm"]),
    paid("Empty video arcade", "arcade", ["arcade", "retro"]),
    paid("Bowling alley lounge", "bowling", ["bowling", "lounge"]),
    paid("Late-night roller rink", "club", ["rink", "music"]),
    paid("1990s department store office", "office", ["retro", "office"]),
    paid("All-night diner in a rainstorm", "diner-rain", ["diner", "rain"]),
    paid("Back of a school bus, rainy field trip", "bus-rain", ["bus", "rain"]),
    paid("Community gym after hours", "gym", ["gym", "empty"]),
    paid("Indoor pool building", "pool", ["pool", "echo"]),
    paid("Cargo bay of a cyberpunk smuggler ship", "space", ["scifi", "hum"]),
    paid("Rainy night, rural Japanese station (1970s)", "station-rain", ["japan", "rain", "train"]),
  ]),

  definePack({ id: "nature", title: "Nature, Water & Animals", short: "Nature", blurb: "Creeks, waterfalls, farms and shorelines.", priceCents: 100, cover: "water" }, [
    free("Creek in a forest", "creek", ["creek", "forest"]),
    free("Rain on leaves", "rain-forest", ["rain", "leaves"]),
    free("Waterfall in the rainforest", "waterfall", ["waterfall", "rainforest"]),
    paid("Farmland with animals", "farm", ["farm", "animals"]),
    paid("Farm animals", "farm", ["farm"]),
    paid("Horses grazing", "horses", ["horses", "grass"]),
    paid("Camping by a waterfall, tarp tent", "waterfall", ["tent", "waterfall"]),
    paid("Farmland with chickens", "farm", ["farm", "chickens"]),
    paid("Farmland with quail", "farm", ["farm", "quail"]),
    paid("Beach front", "ocean", ["beach", "waves"]),
    paid("Summer cottage", "birds", ["cottage", "summer"]),
    paid("Songbirds", "birds", ["birds"]),
    paid("Giant creek, forest rain", "creek", ["creek", "rain"]),
    paid("Canvas tent rain", "rain-soft", ["tent", "rain"]),
    paid("Sail boat", "ship", ["sail", "waves"]),
    paid("Lake docks & houseboats", "lake", ["lake", "dock"]),
    paid("Coastal lighthouse", "ocean", ["coast", "lighthouse"]),
    paid("Hot spring", "hot-spring", ["spring", "water"]),
    paid("Hot spring with monkeys", "monkeys", ["spring", "monkeys"]),
    paid("Ancient desert oasis caravan tent", "wind-desert", ["desert", "tent"]),
  ]),

  definePack({ id: "cafes", title: "Cafes & Aesthetics", short: "Cafes", blurb: "Animal cafes, pubs, towns and far-away rooms.", priceCents: 100, cover: "cafe" }, [
    free("Cat cafe", "cafe", ["cafe", "cat"]),
    free("Fox cafe", "cafe", ["cafe", "fox"]),
    free("Late night bar", "pub", ["bar", "night"]),
    paid("Squirrel cafe", "cafe", ["cafe", "squirrel"]),
    paid("Otter cafe", "cafe", ["cafe", "otter"]),
    paid("Red panda cafe", "cafe", ["cafe", "red panda"]),
    paid("Pig cafe", "cafe", ["cafe", "pig"]),
    paid("Dog cafe", "cafe", ["cafe", "dog"]),
    paid("Victorian pub", "pub", ["pub", "victorian"]),
    paid("Japanese town", "town", ["japan", "town"]),
    paid("Japanese city", "city", ["japan", "city"]),
    paid("British town", "town", ["britain", "town"]),
    paid("British city", "city", ["britain", "city"]),
    paid("Victorian London", "carriage", ["london", "victorian"]),
    paid("Russian winter dacha", "snow", ["russia", "snow"]),
    paid("Scottish moor", "wind-howl", ["scotland", "wind"]),
    paid("Italian piazza evening", "town", ["italy", "piazza"]),
    paid("French corner cafe", "cafe", ["france", "cafe"]),
    paid("Australian bush morning", "birds", ["australia", "birds"]),
    paid("19th-century train coach in a blizzard", "train-blizzard", ["train", "snow"]),
    paid("Underground wine cellar, rural France", "cellar", ["cellar", "drips"]),
    paid("1930s airship crew quarters", "hum", ["airship", "hum"]),
    paid("1950s radio control room at 4 AM", "radio", ["radio", "retro"]),
    paid("Ocean liner grand ballroom at 2 AM", "ballroom", ["ship", "ballroom"]),
    paid("1980s electronics repair shop", "workshop", ["retro", "electronics"]),
    paid("Treehouse canopy, tropical monsoon", "rain-forest", ["treehouse", "monsoon"]),
    paid("Mountain fire lookout in a lightning storm", "thunder-harsh", ["mountain", "storm"]),
    paid("Glass-bottomed underwater room", "underwater", ["underwater", "glass"]),
    paid("Covered hammock on a screened boat deck", "lake", ["hammock", "boat"]),
    paid("Low-volume French radio in a foggy room", "radio", ["radio", "fog"]),
    paid("Muffled parental whispers next door", "whisper", ["whispers", "muffled"]),
    paid("Traveling caravan, sparse music and talk", "caravan", ["caravan", "music"]),
  ]),

  definePack({ id: "hobbies", title: "Chimes & Hobbies", short: "Hobbies", blurb: "Chimes, creaks, libraries and workbenches.", priceCents: 100, cover: "chimes" }, [
    free("Bamboo wind chimes", "chimes-bamboo", ["chimes", "bamboo"]),
    free("Wind chimes", "chimes-metal", ["chimes"]),
    free("Victorian library", "library", ["library", "victorian"]),
    paid("Bone wind chimes", "chimes-bones", ["chimes", "bones"]),
    paid("Bell chimes", "bells", ["bells"]),
    paid("Antique clock repair shop", "clock", ["clocks", "ticking"]),
    paid("Grain silo during rain", "rain-tin", ["silo", "rain"]),
    paid("Hay loft", "crickets", ["hay", "barn"]),
    paid("Brewery fermentation cellar", "cauldron", ["brewery", "bubbles"]),
    paid("Creaking swing", "creak", ["creak", "swing"]),
    paid("Creaking fence", "creak", ["creak", "fence"]),
    paid("Creaking floorboards & building", "creak", ["creak", "wood"]),
    paid("Creaking floor", "creak", ["creak", "floor"]),
    paid("Creaking building", "creak", ["creak", "building"]),
    paid("Abandoned mall concourse", "mall", ["mall", "empty"]),
    paid("Deep space observatory dome", "space", ["space", "dome"]),
    paid("Subterranean metro maintenance siding", "drips", ["metro", "tunnel"]),
    paid("Sleeping in front of a console TV", "static", ["tv", "static"]),
    paid("Screened-in porch, summer night", "crickets", ["porch", "crickets"]),
    paid("Backseat of a 1990s station wagon", "engine-car", ["car", "retro"]),
    paid("Back of a medieval wagon", "carriage", ["wagon", "medieval"]),
    paid("Victorian letter writing", "writing", ["writing", "pen"]),
    paid("Blacksmith workshop", "anvil", ["blacksmith", "anvil"]),
    paid("Blacksmith working the anvil", "anvil", ["blacksmith", "anvil"]),
    paid("Workshop", "workshop", ["workshop", "tools"]),
    paid("Art studios & workshops", "workshop", ["art", "studio"]),
    paid("Old schoolhouse", "clock", ["school", "clock"]),
    paid("Green rooms & backstage", "crowd", ["backstage", "muffled"]),
    paid("Muted club", "club", ["club", "muted"]),
    paid("Archival vaults", "room-tone", ["archive", "quiet"]),
    paid("Vintage tailor shop fitting", "tailor", ["tailor", "scissors"]),
    paid("Retro apothecary & herbalist", "cauldron", ["apothecary", "glass"]),
    paid("Bespoke suit fitting", "tailor", ["tailor", "stylist"]),
    paid("Fountain pen restoration shop", "writing", ["pen", "workbench"]),
    paid("Vintage paint mixing hobbyist", "workshop", ["paint", "stir"]),
    paid("Late-night library book repair", "library", ["library", "pages"]),
    paid("Map & art conservation lab", "library", ["conservation", "quiet"]),
    paid("Antique watchmaker's workbench", "clock", ["watchmaker", "ticking"]),
  ]),

  definePack({ id: "vocal", title: "Vocal ASMR", short: "Vocal", blurb: "Soft sleepy voices and breathing. Opt-in, 18+.", priceCents: 0, cover: "voice", mature: true }, [
    matureFree("Soft female sleepy talk", "voice-talk-f", ["voice", "sleepy"]),
    matureFree("Soft male deep husky sleepy talk", "voice-talk-m", ["voice", "sleepy"]),
    matureFree("Soft female sleepy breathing", "voice-breath-f", ["breathing", "sleepy"]),
    matureFree("Soft male deep husky sleepy breathing", "voice-breath-m", ["breathing", "sleepy"]),
  ]),

  definePack({ id: "community", title: "Community loops", short: "Community", blurb: "Free loops shared by listeners.", priceCents: 0, cover: "city-rain" }, [
    free("Tin porch rain by moss", "rain-tin", ["community"]),
    free("Library radiator by wren", "hum", ["community"]),
    free("Night ferry by juno", "ship", ["community"]),
    free("Attic thunder by pip", "thunder-soft", ["community"]),
    free("Bakery before dawn by ember", "kitchen", ["community"]),
    free("Mountain wind by sol", "wind-howl", ["community"]),
    free("Greenhouse drip by fern", "greenhouse", ["community"]),
    free("Sleeper car by ada", "engine-train", ["community"]),
    free("Tide pools by kai", "ocean", ["community"]),
    free("Cat cafe closing by mina", "cafe", ["community"]),
    free("Study hall by theo", "library", ["community"]),
    free("Rooftop rain by ivy", "rain-city", ["community"]),
  ]),
];

export const SOUNDS: SoundDef[] = SOUND_PACKS.flatMap((p) => p.sounds);
export const SOUND_BY_ID: Record<string, SoundDef> = Object.fromEntries(SOUNDS.map((s) => [s.id, s]));
export const PACK_BY_ID: Record<string, SoundPack> = Object.fromEntries(SOUND_PACKS.map((p) => [p.id, p]));

/* Rule-of-3 audit. Empty array = catalog is publishable. */
export function catalogIssues(): string[] {
  const issues: string[] = [];
  for (const pack of SOUND_PACKS) {
    if (pack.priceCents <= 0) continue;
    const freeCount = pack.sounds.filter((s) => !s.is_premium).length;
    if (freeCount < 3) issues.push(`${pack.title}: only ${freeCount} free sound(s); needs 3.`);
  }
  return issues;
}

export const CATALOG_STATS = {
  packs: SOUND_PACKS.length,
  sounds: SOUNDS.length,
  free: SOUNDS.filter((s) => !s.is_premium).length,
  premium: SOUNDS.filter((s) => s.is_premium).length,
};

/* Maps a free-text prompt to the closest synth family (Creator Library). */
export function familyFromPrompt(prompt: string): Family {
  const p = prompt.toLowerCase();
  const rules: [RegExp, Family][] = [
    [/thunder|storm|lightning/, "thunder-soft"], [/hail/, "hail"], [/snow|blizzard/, "snow"],
    [/tin|metal roof/, "rain-tin"], [/car|van|bus/, "rain-car"], [/city|street|neon/, "rain-city"],
    [/rain|drizzle|shower/, "rain-soft"], [/fire|camp|hearth|ember/, "fire"], [/forge|anvil|smith/, "anvil"],
    [/wind|breeze|gale/, "wind"], [/wave|ocean|sea|beach|coast/, "ocean"], [/creek|stream|river|brook/, "creek"],
    [/waterfall/, "waterfall"], [/lake|dock|boat/, "lake"], [/underwater|submarine/, "underwater"],
    [/cafe|coffee|bakery/, "cafe"], [/pub|bar|tavern/, "pub"], [/kitchen|cook/, "kitchen"], [/train|rail/, "engine-train"],
    [/plane|airport|flight/, "airplane"], [/space|station|ship/, "space"], [/library|book|page/, "library"],
    [/office|type|keyboard/, "office"], [/clock|tick|watch/, "clock"], [/chime/, "chimes-metal"], [/bell/, "bells"],
    [/creak|wood|attic/, "creak"], [/bird|morning|garden/, "birds"], [/cricket|night|porch/, "crickets"],
    [/farm|chicken|goat|cow/, "farm"], [/cat|purr/, "cafe"], [/fan|hum|server/, "hum"], [/static|tv/, "static"],
  ];
  for (const [re, fam] of rules) if (re.test(p)) return fam;
  return "room-tone";
}
