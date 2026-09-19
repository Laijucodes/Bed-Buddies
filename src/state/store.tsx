import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import { FLAT_MASTER_EQ, HushAudioEngine, type TrackEq } from "../audio/engine";
import type { ArtRef } from "../data/art";
import { SOUND_BY_ID, type SoundDef } from "../data/soundCatalog";
import { HOLIDAY_CAMPAIGNS, STARTER_INVENTORY, STORE_BY_ID, type StoreItem } from "../data/storeCatalog";
import { THEMES, THEME_BY_ID, applyThemeTokens, type Theme } from "../data/themes";

/* ------------------------------------------------------------------ types */
export type Tab = "sounds" | "favorites" | "room" | "store" | "thanks";
export type MixTrack = { soundId: string; volume: number; eq: TrackEq };
export type FavoriteMix = { id: string; name: string; tracks: MixTrack[]; masterEq: number[]; createdAt: number };
export type PlacedItem = { uid: string; itemId: string; u: number; v: number };
export type AvatarConfig = { skin: string; hair: string; hairColor: string; expression: string; top: string; topColor: string; bottom: string; bottomColor: string; accessory: string | null };
export type AlarmSettings = { enabled: boolean; time: string; snoozeMinutes: number; snoozeOptions: number[]; shakeToDismiss: boolean; weather: boolean; forceSpeaker: boolean; lastRungDay: string | null };
export type TvMode = "ads" | "ambient" | "static" | "removed";
export type Settings = { themeId: string; tipsEnabled: boolean; haptics: boolean; matureContent: boolean; tvMode: TvMode; sleepTimerMinutes: number; alarm: AlarmSettings };
export type PetCare = { bond: number; lastCare: number; fed: number; brushed: number; petted: number };
export type Account = { id: string; email: string; displayName: string; createdAt: number };
export type HolidayState = { campaignId: string | null; openDays: string[]; claimed: string[] };
export type ThermalLevel = "nominal" | "fair" | "serious" | "critical";
export type AppState = {
  version: number; owner: string;
  settings: Settings; tipsSeen: string[];
  mix: { tracks: MixTrack[]; masterEq: number[] };
  favorites: FavoriteMix[]; entitlements: string[]; inventory: string[];
  room: { interiorId: string; placed: PlacedItem[]; wallCover: string | null };
  avatar: AvatarConfig; communitySounds: SoundDef[]; holiday: HolidayState; feedback: string[];
  petCare: Record<string, PetCare>; profilePhoto: string | null;
};
export type Toast = { id: number; message: string; tone: "info" | "success" | "error" };
export type ConfirmOptions = { title: string; body?: string; price?: string; confirmLabel?: string; danger?: boolean; onConfirm: () => void };
export type Flyer = { id: number; from: { x: number; y: number; w: number; h: number }; art: ArtRef };
export type Weather = { temp: number; label: string } | null;
export type ToggleResult = "added" | "removed" | "locked" | "mature" | "full";

const STATE_PREFIX = "bedbuddies.v4.";
const ACCOUNTS_KEY = "bedbuddies.accounts";
const SESSION_KEY = "bedbuddies.session";

export const DEFAULT_AVATAR: AvatarConfig = { skin: "#ecc4a4", hair: "bob", hairColor: "#5a3a25", expression: "smile", top: "hoodie", topColor: "#cfe3c4", bottom: "jeans", bottomColor: "#5f6f8f", accessory: null };

const defaultState = (owner: string): AppState => ({
  version: 3, owner,
  settings: {
    themeId: "rainroom", tipsEnabled: true, haptics: true, matureContent: false, tvMode: "ads", sleepTimerMinutes: 60,
    alarm: { enabled: false, time: "07:00", snoozeMinutes: 10, snoozeOptions: [5, 10, 15, 20, 30], shakeToDismiss: true, weather: true, forceSpeaker: true, lastRungDay: null },
  },
  tipsSeen: [],
  mix: { tracks: [{ soundId: "campfire/campfire", volume: 0.55, eq: [0, 0, 0] }, { soundId: "weather/wind-swept-landscape", volume: 0.4, eq: [0, 0, 0] }], masterEq: [...FLAT_MASTER_EQ] },
  favorites: [], entitlements: [], inventory: [...STARTER_INVENTORY],
  room: {
    interiorId: "rainroom", wallCover: null,
    placed: [
      { uid: "p-rug", itemId: "furniture-rug", u: 0.46, v: 0.78 },
      { uid: "p-plant", itemId: "furniture-plant", u: 0.09, v: 0.72 },
      { uid: "p-lamp", itemId: "furniture-lamp", u: 0.9, v: 0.74 },
      { uid: "p-tea", itemId: "furniture-tea-table", u: 0.62, v: 0.86 },
      { uid: "p-poster", itemId: "decor-poster-moon", u: 0.72, v: 0.32 },
    ],
  },
  avatar: DEFAULT_AVATAR, communitySounds: [], holiday: { campaignId: null, openDays: [], claimed: [] }, feedback: [],
  petCare: {}, profilePhoto: null,
});

const loadState = (owner: string): AppState => {
  try {
    const raw = localStorage.getItem(STATE_PREFIX + owner);
    if (!raw) return defaultState(owner);
    const parsed = JSON.parse(raw) as Partial<AppState>;
    const base = defaultState(owner);
    return { ...base, ...parsed, owner, room: { ...base.room, ...(parsed.room ?? {}) }, settings: { ...base.settings, ...(parsed.settings ?? {}), alarm: { ...base.settings.alarm, ...(parsed.settings?.alarm ?? {}) } } };
  } catch { return defaultState(owner); }
};
const saveState = (state: AppState) => localStorage.setItem(STATE_PREFIX + state.owner, JSON.stringify(state));

type StoredAccount = Account & { hash: string };
const readAccounts = (): StoredAccount[] => { try { return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? "[]") as StoredAccount[]; } catch { return []; } };
const hashPassword = async (password: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${password}:bedbuddies-web-preview`));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
};
const uid = () => (typeof crypto.randomUUID === "function" ? crypto.randomUUID() : Math.random().toString(36).slice(2));
const today = () => new Date().toISOString().slice(0, 10);

const WEATHER_LABELS: Record<number, string> = { 0: "clear skies", 1: "mostly clear", 2: "partly cloudy", 3: "overcast", 45: "fog", 48: "icy fog", 51: "light drizzle", 53: "drizzle", 55: "heavy drizzle", 61: "light rain", 63: "rain", 65: "heavy rain", 71: "light snow", 73: "snow", 75: "heavy snow", 80: "rain showers", 81: "showers", 82: "heavy showers", 95: "thunderstorms" };

/* ------------------------------------------------------------------ api */
export type AppApi = {
  state: AppState; tab: Tab; setTab: (t: Tab) => void; engine: HushAudioEngine;
  playing: boolean; elapsed: number; play: () => Promise<void>; pause: () => Promise<void>; togglePlay: () => void; seek: (delta: number) => void;
  resolveSound: (id: string) => SoundDef | undefined; canPlay: (s: SoundDef) => { ok: boolean; reason?: "locked" | "mature" };
  toggleSound: (s: SoundDef) => ToggleResult; setTrackVolume: (id: string, v: number) => void; setTrackEq: (id: string, band: number, db: number) => void;
  setMasterEq: (bands: number[]) => void; removeTrack: (id: string) => void; clearMix: () => void;
  ownsPack: (packId: string) => boolean; owns: (itemId: string) => boolean; adsRemoved: boolean;
  saveFavorite: (name: string) => void; deleteFavorite: (id: string) => void; loadFavorite: (f: FavoriteMix) => void; currentFavoriteId: string | null;
  toasts: Toast[]; notify: (message: string, tone?: Toast["tone"]) => void;
  confirmState: ConfirmOptions | null; confirm: (o: ConfirmOptions) => void; closeConfirm: () => void;
  haptic: (ms?: number) => void; tipVisible: (id: string) => boolean; markTip: (id: string) => void;
  updateSettings: (patch: Partial<Settings>) => void; updateAlarm: (patch: Partial<AlarmSettings>) => void; unlockedThemes: Theme[]; theme: Theme; previewTheme: (id: string | null) => void;
  purchase: (item: StoreItem) => void; grant: (item: StoreItem) => void;
  placeItem: (itemId: string, u: number, v: number) => void; moveItem: (id: string, u: number, v: number) => void; returnItem: (id: string) => void; setInterior: (id: string) => void;
  setWallCover: (itemId: string | null) => void; carePet: (itemId: string, kind: "pet" | "feed" | "brush") => void; setProfilePhoto: (dataUrl: string | null) => void;
  setAvatar: (patch: Partial<AvatarConfig>) => void;
  account: Account | null; register: (email: string, password: string, name: string) => Promise<string | null>; login: (email: string, password: string) => Promise<string | null>; logout: () => void;
  activeCampaign: (typeof HOLIDAY_CAMPAIGNS)[number] | null; setCampaign: (id: string | null) => void; simulateDay: () => void;
  addCommunitySound: (s: SoundDef) => void; submitFeedback: (text: string) => void;
  sleepEndsAt: number | null; startSleepTimer: (minutes: number) => void; cancelSleepTimer: () => void;
  thermal: ThermalLevel; setThermal: (t: ThermalLevel) => void;
  blackout: boolean; setBlackout: (v: boolean) => void;
  alarmRinging: boolean; snoozedUntil: number | null; ringAlarm: () => void; dismissAlarm: () => void; snoozeAlarm: (minutes: number) => void; weather: Weather;
  flyers: Flyer[]; launchFlyer: (from: Flyer["from"], art: ArtRef) => void; removeFlyer: (id: number) => void; folderRef: MutableRefObject<HTMLElement | null>;
};

const AppContext = createContext<AppApi | null>(null);
export const useApp = () => { const v = useContext(AppContext); if (!v) throw new Error("useApp outside provider"); return v; };

export function AppProvider({ children }: { children: ReactNode }) {
  const engineRef = useRef<HushAudioEngine | null>(null);
  if (!engineRef.current) engineRef.current = new HushAudioEngine();
  const engine = engineRef.current;

  const [account, setAccount] = useState<Account | null>(() => {
    const id = localStorage.getItem(SESSION_KEY); if (!id) return null;
    const found = readAccounts().find((a) => a.id === id); return found ? { id: found.id, email: found.email, displayName: found.displayName, createdAt: found.createdAt } : null;
  });
  const owner = account?.id ?? "guest";
  const [state, setState] = useState<AppState>(() => loadState(owner));
  const stateRef = useRef(state); stateRef.current = state;
  const [tab, setTab] = useState<Tab>("sounds");
  const [playing, setPlaying] = useState(false); const playingRef = useRef(false); playingRef.current = playing;
  const [elapsed, setElapsed] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmOptions | null>(null);
  const [sleepEndsAt, setSleepEndsAt] = useState<number | null>(null); const fadingRef = useRef(false);
  const [thermal, setThermalState] = useState<ThermalLevel>("nominal");
  const [blackout, setBlackout] = useState(false);
  const [alarmRinging, setAlarmRinging] = useState(false); const [snoozedUntil, setSnoozedUntil] = useState<number | null>(null); const [weather, setWeather] = useState<Weather>(null);
  const [flyers, setFlyers] = useState<Flyer[]>([]);
  const folderRef = useRef<HTMLElement | null>(null);
  const previewThemeRef = useRef<string | null>(null);

  /* ---- persistence: only save state that belongs to the current owner ---- */
  useEffect(() => { if (state.owner !== owner) setState(loadState(owner)); }, [owner, state.owner]);
  useEffect(() => { if (state.owner === owner) saveState(state); }, [state, owner]);

  const notify = useCallback((message: string, tone: Toast["tone"] = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, message, tone }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3400);
  }, []);
  const haptic = useCallback((ms = 18) => { if (stateRef.current.settings.haptics) navigator.vibrate?.(ms); }, []);
  const patch = useCallback((fn: (s: AppState) => AppState) => setState((s) => fn(s)), []);

  /* ---- theme + motion ---- */
  const unlockedThemes = useMemo(() => THEMES.filter((t) => t.unlockedByDefault || state.inventory.includes(`theme.${t.id}`)), [state.inventory]);
  const theme = useMemo(() => unlockedThemes.find((t) => t.id === state.settings.themeId) ?? THEMES[0], [unlockedThemes, state.settings.themeId]);
  useEffect(() => { if (!previewThemeRef.current) applyThemeTokens(theme); }, [theme]);
  const previewTheme = useCallback((id: string | null) => {
    previewThemeRef.current = id;
    applyThemeTokens(id ? THEME_BY_ID[id] ?? theme : theme);
  }, [theme]);

  /* ---- sounds / transport ---- */
  const resolveSound = useCallback((id: string) => SOUND_BY_ID[id] ?? stateRef.current.communitySounds.find((s) => s.id === id), []);
  const ownsPack = useCallback((packId: string) => stateRef.current.entitlements.includes(`pack.${packId}`), []);
  const owns = useCallback((itemId: string) => stateRef.current.inventory.includes(itemId) || stateRef.current.entitlements.includes(itemId), []);
  const canPlay = useCallback((s: SoundDef) => {
    if (s.mature && !stateRef.current.settings.matureContent) return { ok: false, reason: "mature" as const };
    if (s.is_premium && !ownsPack(s.packId)) return { ok: false, reason: "locked" as const };
    return { ok: true };
  }, [ownsPack]);

  const play = useCallback(async () => {
    const s = stateRef.current;
    if (!s.mix.tracks.length) { notify("Tap a few sounds to build a mix first", "error"); return; }
    if (thermal === "serious" || thermal === "critical") { notify("Audio is paused while the device cools down", "error"); return; }
    await engine.resume();
    engine.setMasterEq(s.mix.masterEq);
    s.mix.tracks.forEach((t) => { const sound = resolveSound(t.soundId); if (sound && !engine.has(t.soundId)) engine.start(t.soundId, sound.family, t.volume, t.eq); });
    setPlaying(true);
  }, [engine, notify, resolveSound, thermal]);
  const pause = useCallback(async () => { await engine.pause(); setPlaying(false); }, [engine]);
  const togglePlay = useCallback(() => { engine.click("tap"); haptic(10); if (playingRef.current) void pause(); else void play(); }, [engine, haptic, pause, play]);
  const seek = useCallback((delta: number) => setElapsed((e) => Math.max(0, e + delta)), []);
  useEffect(() => { if (!playing) return; const id = window.setInterval(() => setElapsed((e) => e + 1), 1000); return () => window.clearInterval(id); }, [playing]);

  const toggleSound = useCallback((sound: SoundDef): ToggleResult => {
    const s = stateRef.current;
    if (s.mix.tracks.some((t) => t.soundId === sound.id)) {
      engine.stop(sound.id); engine.click("pop"); haptic(8);
      patch((p) => ({ ...p, mix: { ...p.mix, tracks: p.mix.tracks.filter((t) => t.soundId !== sound.id) } }));
      return "removed";
    }
    const check = canPlay(sound);
    if (!check.ok) { engine.click("lock"); return check.reason!; }
    if (s.mix.tracks.length >= 8) { notify("A mix holds up to 8 layers", "error"); return "full"; }
    const track: MixTrack = { soundId: sound.id, volume: 0.6, eq: [0, 0, 0] };
    patch((p) => ({ ...p, mix: { ...p.mix, tracks: [...p.mix.tracks, track] } }));
    engine.click("tap"); haptic(12);
    if (playingRef.current) engine.start(sound.id, sound.family, track.volume, track.eq);
    return "added";
  }, [canPlay, engine, haptic, notify, patch]);

  const setTrackVolume = useCallback((id: string, v: number) => { engine.setVolume(id, v); patch((p) => ({ ...p, mix: { ...p.mix, tracks: p.mix.tracks.map((t) => (t.soundId === id ? { ...t, volume: v } : t)) } })); }, [engine, patch]);
  const setTrackEq = useCallback((id: string, band: number, db: number) => { engine.setTrackEq(id, band, db); patch((p) => ({ ...p, mix: { ...p.mix, tracks: p.mix.tracks.map((t) => (t.soundId === id ? { ...t, eq: t.eq.map((g, i) => (i === band ? db : g)) as TrackEq } : t)) } })); }, [engine, patch]);
  const setMasterEq = useCallback((bands: number[]) => { engine.setMasterEq(bands); patch((p) => ({ ...p, mix: { ...p.mix, masterEq: bands } })); }, [engine, patch]);
  const removeTrack = useCallback((id: string) => { engine.stop(id); engine.click("pop"); patch((p) => ({ ...p, mix: { ...p.mix, tracks: p.mix.tracks.filter((t) => t.soundId !== id) } })); }, [engine, patch]);
  const clearMix = useCallback(() => { engine.stopAll(); patch((p) => ({ ...p, mix: { ...p.mix, tracks: [] } })); setPlaying(false); }, [engine, patch]);

  /* ---- favorites ---- */
  const signature = (tracks: MixTrack[]) => tracks.map((t) => t.soundId).sort().join("|");
  const currentFavoriteId = useMemo(() => { const sig = signature(state.mix.tracks); return state.favorites.find((f) => signature(f.tracks) === sig)?.id ?? null; }, [state.favorites, state.mix.tracks]);
  const saveFavorite = useCallback((name: string) => {
    const s = stateRef.current; if (!s.mix.tracks.length) { notify("Add sounds before saving a favorite", "error"); return; }
    const fav: FavoriteMix = { id: uid(), name: name.trim().slice(0, 40) || "Night mix", tracks: s.mix.tracks.map((t) => ({ ...t })), masterEq: [...s.mix.masterEq], createdAt: Date.now() };
    patch((p) => ({ ...p, favorites: [fav, ...p.favorites.filter((f) => signature(f.tracks) !== signature(fav.tracks))] }));
    engine.click("soft"); haptic(20); notify(`Saved “${fav.name}” to Favorites`, "success");
  }, [engine, haptic, notify, patch]);
  const deleteFavorite = useCallback((id: string) => patch((p) => ({ ...p, favorites: p.favorites.filter((f) => f.id !== id) })), [patch]);
  const loadFavorite = useCallback((f: FavoriteMix) => {
    engine.stopAll(300);
    patch((p) => ({ ...p, mix: { tracks: f.tracks.map((t) => ({ ...t })), masterEq: [...f.masterEq] } }));
    setElapsed(0); setTab("sounds");
    window.setTimeout(() => { void play(); }, 380);
  }, [engine, patch, play]);

  /* ---- settings / tips ---- */
  const updateSettings = useCallback((s: Partial<Settings>) => patch((p) => ({ ...p, settings: { ...p.settings, ...s } })), [patch]);
  const updateAlarm = useCallback((a: Partial<AlarmSettings>) => patch((p) => ({ ...p, settings: { ...p.settings, alarm: { ...p.settings.alarm, ...a } } })), [patch]);
  const tipVisible = useCallback((id: string) => state.settings.tipsEnabled && !state.tipsSeen.includes(id), [state.settings.tipsEnabled, state.tipsSeen]);
  const markTip = useCallback((id: string) => patch((p) => (p.tipsSeen.includes(id) ? p : { ...p, tipsSeen: [...p.tipsSeen, id] })), [patch]);

  /* ---- store: grant + instant inventory hooks ---- */
  const grant = useCallback((item: StoreItem) => {
    patch((p) => {
      const inv = new Set(p.inventory); const ent = new Set(p.entitlements); let settings = p.settings;
      const add = (it: StoreItem) => {
        switch (it.kind) {
          case "remove_ads": ent.add("remove_ads"); if (settings.tvMode === "ads") settings = { ...settings, tvMode: "ambient" }; break;
          case "sound_pack": if (it.packId) ent.add(`pack.${it.packId}`); break;
          case "interior": inv.add(it.id); if (it.themeId) inv.add(`theme.${it.themeId}`); break;
          case "theme": if (it.themeId) inv.add(`theme.${it.themeId}`); inv.add(it.id); break;
          default: inv.add(it.id);
        }
        (it.bundle ?? []).forEach((id) => { const sub = STORE_BY_ID[id]; if (sub) add(sub); }); // sets fan out to every member
      };
      add(item);
      return { ...p, inventory: [...inv], entitlements: [...ent], settings };
    });
    const where: Record<StoreItem["kind"], string> = {
      remove_ads: "Ads are gone forever. Thank you 🙏 — pick your TV style in Settings.",
      sound_pack: "Unlocked — the loops are live on your Sounds page.",
      pet: "Added to your Room menu. Open it to place your new friend.",
      aquarium: "Added to your Room menu. Open it to place the tank.",
      furniture: "Added to your Room menu — craft as many as you like.",
      decor: "Added to your Room menu — craft as many as you like.",
      wallcover: "Added to your Room menu — apply it from the Walls tab.",
      interior: "Interior added to your Room menu and its theme unlocked in Settings.",
      theme: "Theme set unlocked — decor in your Room menu, colors under Settings → Theme.",
      holiday: "Holiday set added: a full redecoration kit is waiting in your Room menu.",
    };
    engine.click("soft"); haptic(25);
    notify(where[item.kind], "success");
  }, [engine, haptic, notify, patch]);

  const purchase = useCallback((item: StoreItem) => {
    if (owns(item.id) || (item.kind === "sound_pack" && item.packId && ownsPack(item.packId)) || (item.kind === "remove_ads" && stateRef.current.entitlements.includes("remove_ads"))) { notify("You already own this", "info"); return; }
    const freeItem = item.priceCents === 0;
    setConfirmState({
      title: freeItem ? `Add “${item.name}”?` : `Buy “${item.name}”?`,
      body: freeItem ? "This free item will be added to your account right away." : "Payment is simulated in this web preview. The store build opens Apple / Google Play checkout, then the server verifies the receipt before unlocking.",
      price: freeItem ? "Free" : `$${(item.priceCents / 100).toFixed(2)}`,
      confirmLabel: freeItem ? "Add for free" : `Confirm purchase`,
      onConfirm: () => grant(item),
    });
  }, [grant, notify, owns, ownsPack]);

  /* ---- room ---- */
  const placeItem = useCallback((itemId: string, u: number, v: number) => patch((p) => ({ ...p, room: { ...p.room, placed: [...p.room.placed, { uid: uid(), itemId, u, v }] } })), [patch]);
  const moveItem = useCallback((id: string, u: number, v: number) => patch((p) => ({ ...p, room: { ...p.room, placed: p.room.placed.map((it) => (it.uid === id ? { ...it, u, v } : it)) } })), [patch]);
  const returnItem = useCallback((id: string) => patch((p) => ({ ...p, room: { ...p.room, placed: p.room.placed.filter((it) => it.uid !== id) } })), [patch]);
  const setInterior = useCallback((id: string) => patch((p) => ({ ...p, room: { ...p.room, interiorId: id } })), [patch]);
  const setWallCover = useCallback((itemId: string | null) => patch((p) => ({ ...p, room: { ...p.room, wallCover: itemId } })), [patch]);
  const setAvatar = useCallback((a: Partial<AvatarConfig>) => patch((p) => ({ ...p, avatar: { ...p.avatar, ...a } })), [patch]);
  const setProfilePhoto = useCallback((dataUrl: string | null) => { patch((p) => ({ ...p, profilePhoto: dataUrl })); if (dataUrl) notify("Profile picture updated", "success"); }, [notify, patch]);

  /* ---- therapeutic pet care (no punishment, no urgency — bonds only grow) ---- */
  const carePet = useCallback((itemId: string, kind: "pet" | "feed" | "brush") => {
    patch((p) => {
      const prev = p.petCare[itemId] ?? { bond: 0, lastCare: 0, fed: 0, brushed: 0, petted: 0 };
      const care: PetCare = {
        bond: Math.min(999, prev.bond + 1),
        lastCare: Date.now(),
        fed: prev.fed + (kind === "feed" ? 1 : 0),
        brushed: prev.brushed + (kind === "brush" ? 1 : 0),
        petted: prev.petted + (kind === "pet" ? 1 : 0),
      };
      return { ...p, petCare: { ...p.petCare, [itemId]: care } };
    });
    engine.click("soft");
  }, [engine, patch]);

  /* ---- accounts (local preview auth; production uses Supabase Auth) ---- */
  const register = useCallback(async (email: string, password: string, name: string) => {
    const clean = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) return "Enter a valid email";
    if (password.length < 8) return "Password needs at least 8 characters";
    const accounts = readAccounts();
    if (accounts.some((a) => a.email === clean)) return "That email already has an account";
    const acc: StoredAccount = { id: uid(), email: clean, displayName: name.trim() || "Night listener", createdAt: Date.now(), hash: await hashPassword(password) };
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify([...accounts, acc]));
    saveState({ ...stateRef.current, owner: acc.id });
    localStorage.setItem(SESSION_KEY, acc.id);
    setAccount({ id: acc.id, email: acc.email, displayName: acc.displayName, createdAt: acc.createdAt });
    notify(`Welcome, ${acc.displayName}. Your progress moved to your account.`, "success");
    return null;
  }, [notify]);
  const login = useCallback(async (email: string, password: string) => {
    const clean = email.trim().toLowerCase();
    const found = readAccounts().find((a) => a.email === clean);
    if (!found || found.hash !== (await hashPassword(password))) return "Email or password is incorrect";
    localStorage.setItem(SESSION_KEY, found.id);
    setAccount({ id: found.id, email: found.email, displayName: found.displayName, createdAt: found.createdAt });
    notify(`Welcome back, ${found.displayName}`, "success");
    return null;
  }, [notify]);
  const logout = useCallback(() => { localStorage.removeItem(SESSION_KEY); setAccount(null); engine.stopAll(); setPlaying(false); notify("Signed out. Guest progress is kept on this device."); }, [engine, notify]);

  /* ---- holiday campaigns ---- */
  const activeCampaign = useMemo(() => HOLIDAY_CAMPAIGNS.find((c) => c.id === state.holiday.campaignId) ?? null, [state.holiday.campaignId]);
  const setCampaign = useCallback((id: string | null) => patch((p) => ({ ...p, holiday: { campaignId: id, openDays: id ? [today()] : [], claimed: p.holiday.claimed } })), [patch]);
  useEffect(() => {
    if (!activeCampaign) return;
    const day = today();
    patch((p) => (p.holiday.openDays.includes(day) ? p : { ...p, holiday: { ...p.holiday, openDays: [...p.holiday.openDays, day] } }));
  }, [activeCampaign, patch]);
  const simulateDay = useCallback(() => patch((p) => ({ ...p, holiday: { ...p.holiday, openDays: [...p.holiday.openDays, `sim-${p.holiday.openDays.length}`] } })), [patch]);
  useEffect(() => {
    if (!activeCampaign) return;
    const done = state.holiday.openDays.length >= activeCampaign.requiredDays && !state.holiday.claimed.includes(activeCampaign.id);
    if (!done) return;
    const reward = STORE_BY_ID[activeCampaign.rewardItemId];
    patch((p) => ({ ...p, holiday: { ...p.holiday, claimed: [...p.holiday.claimed, activeCampaign.id] } }));
    if (reward) { grant(reward); notify(`${activeCampaign.name} streak complete — “${reward.name}” is yours!`, "success"); }
  }, [activeCampaign, grant, notify, patch, state.holiday.claimed, state.holiday.openDays.length]);

  const addCommunitySound = useCallback((s: SoundDef) => patch((p) => ({ ...p, communitySounds: [s, ...p.communitySounds] })), [patch]);
  const submitFeedback = useCallback((text: string) => patch((p) => ({ ...p, feedback: [...p.feedback, text] })), [patch]);

  /* ---- sleep timer ---- */
  const startSleepTimer = useCallback((minutes: number) => { fadingRef.current = false; setSleepEndsAt(Date.now() + minutes * 60_000); updateSettings({ sleepTimerMinutes: minutes }); notify(`Sleep timer set — fading out in ${minutes} min`, "success"); }, [notify, updateSettings]);
  const cancelSleepTimer = useCallback(() => { setSleepEndsAt(null); fadingRef.current = false; if (playingRef.current) void engine.resume(); }, [engine]);
  useEffect(() => {
    if (!sleepEndsAt) return;
    const id = window.setInterval(() => {
      const left = sleepEndsAt - Date.now();
      if (left <= 30_000 && !fadingRef.current && playingRef.current) { fadingRef.current = true; engine.fadeOut(Math.max(1, left / 1000)); }
      if (left <= 0) { void pause(); setSleepEndsAt(null); fadingRef.current = false; notify("Sleep timer finished. Audio released — goodnight."); }
    }, 1000);
    return () => window.clearInterval(id);
  }, [engine, notify, pause, sleepEndsAt]);

  /* ---- thermal fallback ---- */
  const setThermal = useCallback((t: ThermalLevel) => {
    setThermalState(t);
    if ((t === "serious" || t === "critical") && playingRef.current) { void pause(); notify("Thermal protection: audio, TV and animations paused", "error"); }
  }, [notify, pause]);

  /* ---- alarm ---- */
  const ringAlarm = useCallback(() => { engine.startAlarm(); setAlarmRinging(true); navigator.vibrate?.([300, 150, 300]); }, [engine]);
  const dismissAlarm = useCallback(() => {
    engine.stopAlarm(); setAlarmRinging(false); setSnoozedUntil(null);
    updateAlarm({ lastRungDay: today() });
    if (stateRef.current.settings.alarm.weather && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
          const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${pos.coords.latitude.toFixed(3)}&longitude=${pos.coords.longitude.toFixed(3)}&current=temperature_2m,weather_code`);
          const data = (await res.json()) as { current?: { temperature_2m: number; weather_code: number } };
          if (data.current) setWeather({ temp: Math.round(data.current.temperature_2m), label: WEATHER_LABELS[data.current.weather_code] ?? "changing skies" });
        } catch { setWeather(null); }
      }, () => setWeather(null), { timeout: 6000, maximumAge: 600_000 });
    }
  }, [engine, updateAlarm]);
  const snoozeAlarm = useCallback((minutes: number) => { engine.stopAlarm(); setAlarmRinging(false); setSnoozedUntil(Date.now() + minutes * 60_000); updateAlarm({ snoozeMinutes: minutes, lastRungDay: today() }); notify(`Snoozed ${minutes} minutes`); }, [engine, notify, updateAlarm]);
  useEffect(() => {
    const id = window.setInterval(() => {
      const a = stateRef.current.settings.alarm; if (alarmRinging) return;
      if (snoozedUntil && Date.now() >= snoozedUntil) { setSnoozedUntil(null); ringAlarm(); return; }
      if (!a.enabled) return;
      const now = new Date(); const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      if (hhmm === a.time && a.lastRungDay !== today()) ringAlarm();
    }, 5000);
    return () => window.clearInterval(id);
  }, [alarmRinging, ringAlarm, snoozedUntil]);

  /* ---- flyers ---- */
  const launchFlyer = useCallback((from: Flyer["from"], art: ArtRef) => { const id = Date.now() + Math.random(); setFlyers((f) => [...f, { id, from, art }]); }, []);
  const removeFlyer = useCallback((id: number) => setFlyers((f) => f.filter((x) => x.id !== id)), []);

  const adsRemoved = state.entitlements.includes("remove_ads");

  const value: AppApi = {
    state, tab, setTab, engine, playing, elapsed, play, pause, togglePlay, seek, resolveSound, canPlay, toggleSound, setTrackVolume, setTrackEq, setMasterEq, removeTrack, clearMix,
    ownsPack, owns, adsRemoved, saveFavorite, deleteFavorite, loadFavorite, currentFavoriteId, toasts, notify, confirmState, confirm: setConfirmState, closeConfirm: () => setConfirmState(null),
    haptic, tipVisible, markTip, updateSettings, updateAlarm, unlockedThemes, theme, previewTheme, purchase, grant, placeItem, moveItem, returnItem, setInterior, setWallCover, carePet, setProfilePhoto, setAvatar,
    account, register, login, logout, activeCampaign, setCampaign, simulateDay, addCommunitySound, submitFeedback, sleepEndsAt, startSleepTimer, cancelSleepTimer,
    thermal, setThermal, blackout, setBlackout, alarmRinging, snoozedUntil, ringAlarm, dismissAlarm, snoozeAlarm, weather, flyers, launchFlyer, removeFlyer, folderRef,
  };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
