# Bed Buddies — Production Architecture Blueprint

Bed Buddies is a dark-mode-first, isometric cozy-cartoon rain & sleep ASMR app. This repository contains:

| Layer | Where | Status |
|---|---|---|
| Interactive product (web build of the full UX) | `src/` | ✅ runs today — `npm run dev` |
| Master sound manifest with developer free/paid tiering | `src/data/soundCatalog.ts` | ✅ 190+ loops, Rule-of-3 audited |
| Store, pets, furniture, interiors, outfits, holiday campaigns | `src/data/storeCatalog.ts` | ✅ |
| Procedural audio engine (per-track EQ, master EQ, limiter, headroom) | `src/audio/engine.ts` | ✅ stand-in until real recordings are dropped in |
| Cloud schema (Postgres/Supabase) with RLS + Rule-of-3 triggers | `supabase/schema.sql` | ✅ ready to run |
| Native iOS modules (Swift) | `native/ios/Bed BuddiesNative.swift` | ✅ drop into the RN iOS target |
| Native Android modules (Kotlin) | `native/android/Bed BuddiesNative.kt` | ✅ drop into the RN Android target |
| Non-technical setup & store publishing guide | `SETUP_GUIDE.md` | ✅ |

Everything visual in the web build is real and interactive. Things that need a phone or a server (App Store billing, ad SDK video, native alarms that survive process death, real generative-audio providers, real login) are **simulated with the same state transitions and clearly labelled** so the native team can swap the adapter without touching the UI.

---

## 0. Recommended production stack

```
apps/mobile        React Native 0.7x (New Architecture, TurboModules + Fabric), TypeScript, Reanimated 3, Gesture Handler
apps/admin         Next.js 15 (App Router) — owner-only web admin, passkeys (WebAuthn) + TOTP fallback, no service keys in browser
services/api       Supabase Edge Functions (Deno) — purchases, moderation, generation queue, holiday rewards, admin actions
packages/catalog   soundCatalog.ts + storeCatalog.ts (shared by app, admin and import scripts)
packages/audio-dsp Shared DSP parameter model (bands, recipes) used by the JS prototype and native engines
native/ios         Swift: AVAudioEngine graph, gesture recognizers, thermal governor, blackout, alarm, CoreMotion
native/android     Kotlin: Oboe/AAudio graph, MotionEvent detector, thermal listener, overlay blackout, AlarmManager, sensors
supabase/          schema.sql, storage buckets (audio, art, community), RLS policies
```

Why React Native over Flutter here: the app is 80% platform-native concerns (audio sessions, alarms, overlays, IAP, ads) and RN's TurboModule story lets Swift/Kotlin own those while sharing one TypeScript state model with this web prototype.

---

## PHASE 1 — Micro-interaction & gesture architecture

### 1.1 Grid & Mixing Deck (`SoundsView.tsx`, `MixFolder.tsx`)
* Cards are cover-art tiles (quadrant-cropped from 2×2 art sheets, `Art` component). Missing files render a labelled **“missing”** tile so art can be swapped without code changes.
* Tapping a card: `engine.click("tap")` (60 ms sine chirp 660→330 Hz at −30 dBFS), haptic pulse, and a **flyer** clone of the card springs from its rect into the folder (`Flyers` in `App.tsx`, spring damping 22 / stiffness 170). Removing plays a “pop”.
* Locked cards play an 8-second preview through a **separate preview bus** (never un-pauses the main mix) and open the dual-state purchase dialog.

### 1.2 Tooltip micro-animations (`ui.tsx → Tip`)
* Each tip has an id (`folder-hold`, `card-tap`, `heart`, `jiggle`, `chest`, `closet`, `tv`, `create`). Shown once, until dismissed or until the feature is used (`markTip`).
* `variant="hold"` animates a finger that presses and holds with an expanding ring; `tap` animates a press.
* Settings → “Show helpful tips” disables all of them; `tipsSeen` is persisted per account.

### 1.3 Folder gesture state machine
Identical thresholds on all three platforms:

| Constant | Value |
|---|---|
| Tap max duration / travel | 350 ms / 10 pt |
| Long-press arm | 500 ms stationary → haptic (impact medium) |
| Directional threshold after arm | 36 pt |
| Scrub rate | `clamp(1 + dx/220, 0.45, 2.2)` |
| Release seek | `round(dx / 6)` seconds |

* Web: pointer events with pointer capture (`MixFolder.tsx`).
* iOS: `UITapGestureRecognizer` + `UILongPressGestureRecognizer` + `UIPanGestureRecognizer`, tap `require(toFail:)` long-press, pan only allowed while armed (`FolderGestureController`).
* Android: `MotionEvent` state machine with `requestDisallowInterceptTouchEvent` (`FolderGestureDetector`), Compose equivalent noted inline.
* Stationary release opens the context overlay **[Open, Play/Pause, Rewind, Forward, Delete]**.

### 1.4 Folder management & jiggle mode (`MixerSheet`)
* “Open” → sheet listing tracks; tapping a track springs open its volume slider (fluid `setTargetAtTime` ramps, 45 ms).
* Long-press a track (500 ms) → `body.app-jiggle` shakes the whole app for 550 ms, rows keep jiggling, red **X** eject badges appear; “Done” exits.

### 1.5 Favorites (`FavoritesView.tsx`)
* Heart in the mix bar saves the exact state: track ids, volumes, per-track EQ, master EQ. Grid cards show a 2×2 cover collage; single tap = load + play. Heart is filled when the current mix matches a saved one.

### 1.6 Multi-tier parametric EQ (`engine.ts`, `MixFolder → EqualizerSheet`)
* **Per track**: 3 peaking filters at 120 Hz / 1 kHz / 6 kHz, Q 0.9, ±12 dB.
* **Master**: 5 peaking filters at 80 / 250 / 1k / 4k / 10k Hz, Q 0.9, ±12 dB, presets (Sleep soft, Rain detail, Warm fire, Airy).
* All gain changes ramp (`setTargetAtTime`, τ = 30 ms) — no zipper noise.

### 1.7 Algorithmic blending deck (math)
```
per track:   generators → mixIn(loudness) → volume v_i → EQ_i → bus
bus gain:    h = min(1, 0.8 / sqrt(Σ v_i²))          (constant-power headroom, ramped τ=80 ms)
bus → masterEQ(5) → compressor(th −18 dB, knee 12, 2.5:1, 10/250 ms) → limiter(th −3 dB, 20:1, 1/50 ms) → out
loop seams:  equal-power crossfade a=cos(πt/2), b=sin(πt/2), 60–120 ms (native file player)
masking:     8-band Bark energy estimate off the render thread; if two tracks overlap >6 dB in a band,
             apply a slow complementary −1.5 dB max cut to the quieter one (τ = 2 s). Never rotate phase live.
```
Native: AVAudioEngine (`AVAudioUnitEQ` bands + `AVAudioUnitEffect` limiter) on iOS; Oboe→AAudio with a lock-free parameter FIFO on Android. Superpowered SDK is optional; the graph above needs nothing proprietary.

---

## PHASE 2 — Generative sandbox & secure sharing backend

### 2.1 Creator Library (`StoreView → CreatorSheet`)
Pipeline (each step is a visible stage in the UI):
1. **Sanitize** — strip control chars, collapse whitespace, cap 280 chars (client + server).
2. **Moderate** — server: OpenAI `omni-moderation-latest` on the prompt, plus regex gates for scripting/SQL patterns and profanity (`BLOCKED`, `PROFANITY`). Blocked prompts never reach a provider or the DB (logged to `moderation_events`).
3. **Generate** — Edge Function enqueues `generation_jobs` (idempotency key) → worker calls a provider adapter with a server-held key. Adapter interface: `submit / poll / cancel / normalize`. Open providers: Hugging Face Inference Endpoints (`facebook/musicgen-small`, `cvssp/audioldm2`), self-hosted AudioCraft; images: Stable Diffusion XL via HF or a self-hosted worker. Suno/Udio have no public API — do not scrape; keep them behind the same adapter if they ever publish one.
4. **Private preview** — loudness-normalize to −23 LUFS, transcode AAC, store in `community` bucket, `visibility='private'`.
5. **Share (optional)** — `visibility='review'` → human/auto review → `public`.

The web build simulates 2–4 by mapping the prompt to the closest synth family (`familyFromPrompt`).

### 2.2 Community cloud schema
See `supabase/schema.sql`: `community_assets` (string tags `text[]` with GIN index, trigram index on title), `generation_jobs`, `public_search` view merging official + community rows for one keyset-paginated query (`created_at, id`).

### 2.3 Trust & safety layer
* Every user string (prompts, titles, tags, feedback, display names) → sanitizer → moderation endpoint → parameterized SQL only. Tags are NFKC-normalized, lowercased, max 12 tags × 24 chars.
* Rate limits per account + device attestation (App Attest / Play Integrity) on generation and publishing.
* Nothing user-generated is ever rendered as HTML; React text nodes only.

---

## PHASE 3 — Isolated dev panel, tiering, monetization, room engine, thermal

### 3.1 / 3.2 Decoupled zero-trust admin
* Separate Next.js origin (`admin.bedbuddies.app`), separate Supabase auth project role. Sign-in requires **passkeys (WebAuthn)**; TOTP fallback; step-up re-auth for destructive actions.
* Admin UI never holds the service-role key. It calls Edge Functions; each function verifies the JWT, checks `admin_users.role`, validates a per-request nonce, performs the action with the service role, and writes `admin_audit_log`.
* Capabilities: upload stock loops (signed upload URL → ingest worker → loudness/duration/sha256), edit catalog rows, flip `is_premium`, publish packs (Rule-of-3 trigger enforces), delete assets, ban users (`profiles.status`), toggle holiday campaigns.
* Mobile clients cannot spoof any of this: entitlements/inventory are **service-role-only writes** (see RLS), IAP receipts are verified server-side (App Store Server API v2 JWS / Play Developer API + RTDN), and the client re-fetches entitlements after purchase.

### 3.3 Developer-controlled audio tiering
* One file, one decision per line: `free("Title", family)` / `paid("Title", family)` in `src/data/soundCatalog.ts` → `is_premium` column.
* **Rule of 3** enforced three times: `catalogIssues()` in the app’s Developer panel, the admin publish button, and DB triggers (`enforce_rule_of_three`, `protect_free_minimum`).

### 3.4 Monetization, room engine, marketplace
* **Isometric room** (`RoomView.tsx`): floor mapping `x = 50 + (u−v)·40`, `y = 62 + (u+v−1)·22` (% of the 4:3 canvas), depth scale `0.72 + 0.5·(u+v)/2`, z-index from depth. Backdrops are the generated interiors; sprites are vector so they stay crisp on every DPI.
* **TV ad slot**: enlarged TV; the screen area hosts a **muted** placement. Production: AdMob Native Advanced *video* asset (or Unity Ads banner/native) rendered inside the frame with `muted = true`, AdChoices icon visible, no auto-expansion; tapping the TV opens the full ad in a modal the user explicitly chose. Never shown while the blackout overlay is active, never plays audio, frequency-capped, never on the lock screen. After the $5 pass: **Ambient loop / Silent static / Remove TV** (Settings → Television, also offered on the Thank You page).
* **Cozy Sheep**: physics-ish keyframe arc across the strip under the header (a zone with no controls), ≤ 1 leap per 45–85 s, disabled under Reduce Motion / thermal throttling / after purchase. Tap → $5 dialog.
* **Themes**: CSS-variable skins (`themes.ts`) applied instantly app-wide; gear → dropdown lists only unlocked themes; interiors unlock their matching theme.
* **Accounts, closet, character creator**: local preview auth (SHA-256 salted) stands in for Supabase Auth; avatar layers = skin / hair+color / expression / top+color / bottom+color / accessory; paid pieces are store `outfit` items.
* **Instant inventory hooks** (`grant()` in `store.tsx`): sound packs → entitlement → cards unlock immediately; furniture/pets → chest; outfits → closet; interiors → chest + theme; holiday bundles fan out to all three; a toast tells the user exactly where the item went.
* **Store** (`StoreView.tsx`): $5 Remove Ads banner pinned at the very top; tabs Room / Community / Sound packs; every item opens a **live preview** (sprite stage, interior art, temporary theme skin, avatar wearing the item, audible pack preview) → explicit confirm dialog (price shown) → grant. Free items also confirm (“Add free item”). Infinite merged grid (community free loops + $1 dev packs + official free loops) with IntersectionObserver paging.
* **Holiday campaigns**: developer toggles a campaign; daily opens are recorded; 7 distinct days within the week → exactly one reward item, granted once (`holiday_checkin()` SQL function server-side).
* **Thank You tab**: folded-hands icon, the developer message verbatim, Recommend-Feature form (moderated), flexible Donate (Apple/Google tipping products).

### 3.5 Thermal safety & power management
* Web: simulated in Settings → Developer. Native: `ThermalGovernor` (iOS `ProcessInfo.thermalState`, Android `PowerManager.addThermalStatusListener`, battery-temp fallback).
* Policy: **serious** → halt TV ad, freeze pets/sheep/animations, fade & pause audio, drop to 30 fps; **critical** → release everything except the black overlay and the alarm thread; audio resumes only by user action once the state returns to nominal/fair.
* Sleep timer: 30–180 min; 30 s equal-power fade at the end, then `AudioContext.suspend()` / `AVAudioSession.setActive(false)` / stop the foreground service so the device can idle.

---

## PHASE 4 — Background audio during calls, blackout, wake gesture (what the OS actually allows)

| Requirement | iOS | Android |
|---|---|---|
| Sleep loops keep playing while the user is on a call | `.playback` + `.mixWithOthers`, `UIBackgroundModes: audio`. **Cellular calls interrupt all third-party audio** (system-owned); we auto-resume on `.ended/.shouldResume`. FaceTime & VoIP apps that allow mixing → our loop mixes. There is no supported (or App-Review-safe) way to inject audio into another app’s call. | `USAGE_MEDIA` + foreground service + `AudioFocusRequest(GAIN, willPauseWhenDucked=false)`. Telephony holds focus during GSM calls (transient loss → resume). VoIP apps decide duck vs pause. Focus “bypass” does not exist in public APIs and breaks calls. |
| 100% black screen for sleeping couples | `BlackoutController`: extra `UIWindow` at `.alert+1`, `#000000`, `UIScreen.main.brightness = 0`, restore on wake/background. Camera of the *call* app continues only if it supports PiP with camera (FaceTime does). | `BlackoutOverlay`: `TYPE_APPLICATION_OVERLAY` true-black view **over the call app** (which stays resumed, camera streaming), `WRITE_SETTINGS` brightness 0 with save/restore. |
| Wake gesture | Swipe up ≥ 48 pt on the overlay (system shade gesture can’t be intercepted). | Swipe up ≥ 48 dp on the overlay; shade area is never covered by app overlays. |

The web build ships the same overlay with swipe-up wake and `Esc`.

---

## PHASE 5 — Critical alarm & sensors

* **Silent switch / DND**: iOS app audio in `.playback` ignores the switch and Focus, so the alarm fires **in-process** from the already-running background audio session (`AlarmEngine.ring`). Fallback local notification uses **Critical Alerts** only if Apple grants the entitlement (request via Account → Additional Capabilities). Android: `USAGE_ALARM` stream + channel with `setBypassDnd(true)`; DND’s default “Alarms” exception lets it through; if disabled, request `ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS` and set the alarm priority category. Exact scheduling via `setAlarmClock` + `USE_EXACT_ALARM`/`SCHEDULE_EXACT_ALARM`, `RECEIVE_BOOT_COMPLETED` re-schedules after reboot, `USE_FULL_SCREEN_INTENT` for the ringing screen.
* **Speaker routing with Bluetooth connected**: iOS `.playAndRecord` + `.defaultToSpeaker` without Bluetooth options + `overrideOutputAudioPort(.speaker)`; Android `MediaPlayer.setPreferredDevice(TYPE_BUILTIN_SPEAKER)`.
* **Shake-to-dismiss**: 40–50 Hz accelerometer, gravity removed, count *direction reversals* above 1.15 g; +9 progress per reversal, −0.3/sample decay; 100 = dismissed (`ShakeDismissMonitor`, `ShakeDetector`, and the web `AlarmOverlay` via `DeviceMotionEvent`).
* **Snooze array**: `[5, 10, 15, 20, 30]` minutes, user-editable default; snoozing records the day so the same minute cannot re-trigger.
* **Weather on dismissal**: Open-Meteo (no key) with coarse location; shown as a morning toast.

---

## UI state routing (single source of truth: `state/store.tsx`)

```
AppState (persisted per account: bedbuddies.v3.<accountId|guest>)
├─ settings { themeId, tipsEnabled, haptics, reduceMotion, matureContent, tvMode, sleepTimerMinutes, alarm{…} }
├─ tipsSeen[]                         ├─ favorites[] {tracks, masterEq}
├─ mix { tracks[{soundId, volume, eq[3]}], masterEq[5] }
├─ entitlements[] ('remove_ads' | 'pack.<id>')   ├─ inventory[] (item ids, 'theme.<id>')
├─ room { interiorId, placed[{uid,itemId,u,v}] } ├─ avatar {…}
├─ communitySounds[] (user-generated SoundDefs)  ├─ holiday { campaignId, openDays[], claimed[] }
└─ feedback[]
Transient: tab, playing, elapsed, toasts, confirm dialog, flyers, sleepEndsAt, thermal, blackout, alarmRinging, snoozedUntil, weather
Tabs: sounds | favorites | room | store | thanks   ·   Sheets: settings, mixer, eq, chest, closet, creator   ·   Modals: context menu, confirm, preview, TV
```

---

## Security checklist (pentest-driven)
* No secrets in the client; provider/store keys only in Edge Function env.
* RLS denies every write to `entitlements` and `user_inventory`; `room_items` insert requires ownership of the item.
* Receipt validation server-side; entitlement refresh after purchase; restore-purchases always visible.
* Idempotency keys on generation and purchases; rate limits; App Attest / Play Integrity on sensitive calls.
* Admin: passkeys, step-up auth, audit log, IP allow-list optional, no shared sessions with the consumer app.
* Content: mature vocal pack off by default behind an 18+ confirmation; all strings moderated; nothing rendered as HTML.
* Privacy: coarse location only after alarm dismissal, never stored; motion sensors only while the alarm screen is up.
