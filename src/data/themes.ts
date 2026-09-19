/*
  Global UI skins. Selecting a theme rewrites CSS variables on <html>, which
  instantly re-skins every screen, sheet, button and the room chrome.
  Themes are unlocked by default, by buying the theme, or by buying an interior
  (interiors come with their matching theme).
*/

export type ThemeId =
  | "rainroom"
  | "amber-cabin"
  | "pastel-garden"
  | "victorian-library"
  | "midnight-train"
  | "castle-stone"
  | "holiday-christmas"
  | "holiday-halloween";

export type Theme = {
  id: ThemeId;
  name: string;
  blurb: string;
  unlockedByDefault: boolean;
  swatches: [string, string, string];
  tokens: Record<string, string>;
};

const make = (
  id: ThemeId,
  name: string,
  blurb: string,
  unlockedByDefault: boolean,
  t: { bg: string; bg2: string; surface: string; surface2: string; text: string; accent: string; accentInk: string; accent2: string; glow: string },
): Theme => ({
  id,
  name,
  blurb,
  unlockedByDefault,
  swatches: [t.bg, t.accent, t.accent2],
  tokens: {
    "--bg": t.bg,
    "--bg-2": t.bg2,
    "--surface": t.surface,
    "--surface-2": t.surface2,
    "--text": t.text,
    "--accent": t.accent,
    "--accent-ink": t.accentInk,
    "--accent-2": t.accent2,
    "--glow": t.glow,
  },
});

export const THEMES: Theme[] = [
  make("rainroom", "Rainroom", "Deep teal night with sage and butter.", true, {
    bg: "#0b1213", bg2: "#111b1c", surface: "#152122", surface2: "#1d2c2d", text: "#f5f1e4",
    accent: "#cfe3c4", accentInk: "#13221a", accent2: "#f2c9a0", glow: "rgba(207,227,196,.28)",
  }),
  make("amber-cabin", "Amber Cabin", "Warm timber, ember orange and cream.", false, {
    bg: "#140d09", bg2: "#1d130c", surface: "#251a11", surface2: "#312317", text: "#fff1da",
    accent: "#f0b46b", accentInk: "#2a1706", accent2: "#d97a55", glow: "rgba(240,180,107,.3)",
  }),
  make("pastel-garden", "Pastel Garden", "Dusty plum with rose and mint blooms.", false, {
    bg: "#151219", bg2: "#1d1823", surface: "#241d2c", surface2: "#2e2537", text: "#fff5ee",
    accent: "#f2b8c6", accentInk: "#3a1a26", accent2: "#a9dcb8", glow: "rgba(242,184,198,.3)",
  }),
  make("victorian-library", "Victorian Library", "Oxblood leather, ink and brass.", false, {
    bg: "#110d10", bg2: "#1a1215", surface: "#22171b", surface2: "#2c1f24", text: "#f3e8d2",
    accent: "#d8b26e", accentInk: "#2b1d08", accent2: "#a9536a", glow: "rgba(216,178,110,.3)",
  }),
  make("midnight-train", "Midnight Train", "Navy velvet with periwinkle lamps.", false, {
    bg: "#090c17", bg2: "#0f1424", surface: "#141b30", surface2: "#1c2540", text: "#e9eeff",
    accent: "#b3c9f2", accentInk: "#101a33", accent2: "#f0a9a0", glow: "rgba(179,201,242,.3)",
  }),
  make("castle-stone", "Castle Stone", "Moonlit slate with lavender candlelight.", false, {
    bg: "#0f1014", bg2: "#16171d", surface: "#1d1e26", surface2: "#272833", text: "#f2effa",
    accent: "#cdbdf0", accentInk: "#201738", accent2: "#f2d29a", glow: "rgba(205,189,240,.3)",
  }),
  make("holiday-christmas", "Christmas Eve", "Pine green, cranberry and snow.", false, {
    bg: "#0a1410", bg2: "#0f1c16", surface: "#14241c", surface2: "#1c3026", text: "#fbf7ec",
    accent: "#f5e6c8", accentInk: "#2a1b0e", accent2: "#e2626a", glow: "rgba(226,98,106,.28)",
  }),
  make("holiday-halloween", "Halloween Night", "Plum dusk and pumpkin glow.", false, {
    bg: "#120b18", bg2: "#1a1022", surface: "#22152d", surface2: "#2d1d3a", text: "#fbf2ff",
    accent: "#f7a35c", accentInk: "#2f1500", accent2: "#b48cf2", glow: "rgba(247,163,92,.3)",
  }),
];

export const THEME_BY_ID: Record<string, Theme> = Object.fromEntries(THEMES.map((t) => [t.id, t]));

export function applyThemeTokens(theme: Theme) {
  const root = document.documentElement;
  Object.entries(theme.tokens).forEach(([key, value]) => root.style.setProperty(key, value));
  root.dataset.theme = theme.id;
}
