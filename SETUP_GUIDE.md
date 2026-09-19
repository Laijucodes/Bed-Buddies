# Bed Buddies — Setup, Testing & Publishing Guide (no coding experience needed)

This guide walks you from “I have this folder” to “my app is in the App Store and Google Play”. Follow it top to bottom. Every step says **what to click** and **what you should see**. Nothing here requires you to write code; where a developer *is* needed, it says so plainly.

---

## Part A — Try the app on your computer today (15 minutes)

1. **Install Node.js (the engine that runs the project).**
   Go to <https://nodejs.org>, click the big **LTS** download, run the installer, keep all defaults.
2. **Install Visual Studio Code (a free editor).**
   <https://code.visualstudio.com> → Download → install → open it.
3. **Open the project folder.** In VS Code: *File → Open Folder…* → pick the `hushroom` folder.
4. **Open the built-in terminal.** *Terminal → New Terminal.* A text box appears at the bottom.
5. **Type these two lines, pressing Enter after each:**
   ```
   npm install
   npm run dev
   ```
   You will see a line like `Local: http://localhost:5173/`. Hold **Ctrl** (Windows) or **Cmd** (Mac) and click it. The app opens in your browser.
6. **Click anywhere once** (browsers require a first click before sound can play), then press **Play my mix**.

### What to test (checklist)
- **Sounds tab:** tap cards → they pop into the folder at the bottom and start layering. Search “rain”, filter *Free / Owned / Community*.
- **Mix folder:** tap = play/pause. **Hold** it ½ s → it pulses; drag **left** = rewind, drag **right** = fast-forward; hold without moving → menu (Open, Play/Pause, Rewind, Forward, Delete).
- **Open panel:** tap a track for its volume slider; **hold** a track → everything jiggles and red X badges appear.
- **EQ button (sliders icon):** *Whole mix* has 5 bands; pick a track chip for its own 3 bands.
- **Heart:** name the mix → it appears in **Favorites**; tap a favorite to recall and play it.
- **Room tab:** the TV shows a muted ad; tap it. Tap the **chest** → tap an item → tap the floor to place it → drag it around. Tap the **wardrobe** (or your avatar) → change hair, skin, expression, clothes. Buy a pet in the store and watch it wander, nap on furniture, and visit the TV.
- **Store tab:** the **$5 Remove all ads** banner is pinned at the top. Every item shows a live preview, then a confirmation before it is added. Buy an interior → the room and the whole app’s colors change; the new theme appears under the ⚙️ gear.
- **Community tab in the store:** press **Create sound**, type “rain on a canvas tent”, watch the moderation → generation steps, then *Keep & add to mix*. Try typing `<script>` to see it blocked.
- **⚙️ Settings:** theme dropdown (only unlocked themes), tips on/off, haptics, reduce motion, sleep timer (30 min – 3 h), Vocal ASMR (18+) switch, alarm (set a time one minute ahead, press *Test alarm now*, hold the button or shake your phone if you opened it on a phone), and the **Developer panel** to simulate overheating (audio/TV/pets stop) and to turn on a holiday campaign.
- **Moon button (top right):** true-black blackout; swipe **up** to wake (or press Esc).
- **Thank you tab:** the developer note, feature-idea form and donate buttons.

Nothing you buy in this preview costs money — purchases are simulated so you can test every flow.

### Testing on your phone (same Wi-Fi)
In the terminal, stop the app (Ctrl+C) and run `npm run dev -- --host`. You’ll see a second address like `http://192.168.1.20:5173/` — open it in your phone’s browser. Haptics, shake-to-dismiss and the sheep’s leap all work there. **Add to Home Screen** for a full-screen feel.

### Making a shareable single file
`npm run build` creates `dist/index.html` — one file (≈3.4 MB, art included) you can e-mail or drop on any web host (Netlify Drop, Vercel, GitHub Pages) to let friends test.

---

## Part B — Swapping in your real assets (no code needed)

| What | Where | How |
|---|---|---|
| Room interiors | `src/assets/art/interiors/` | Replace `rainroom.jpg`, `log-cabin.jpg`, `apartment.jpg`, `train.jpg`, `castle.jpg` with your own (square, ≥1024 px). Missing = a “missing” tile, never a crash. |
| Sound covers | `src/assets/art/covers/grid-a.jpg …` | Each file is a 2×2 sheet of four covers. Keep the same layout or point a cover at a new file in `src/data/art.ts` (one line each). |
| Hero image | `src/assets/art/hero.jpg` | Any wide image. |
| **Which sounds are free** | `src/data/soundCatalog.ts` | Change `paid(` to `free(` (or back) on any line. Every sold pack must keep at least three `free(` lines — the Developer panel tells you if you broke the rule. |
| Prices / new items | `src/data/storeCatalog.ts` | Change `priceCents: 100` (that’s $1.00), add lines by copying an existing one. |
| Themes / colors | `src/data/themes.ts` | Edit hex colors. |
| Real recordings | `audio/<pack>/<slug>.m4a` | Each sound already has its file path listed in the manifest (e.g. `audio/campfire/campfire.m4a`). When you have recordings, a developer switches the engine from “synthesize” to “play file” (one adapter function). |

---

## Part C — Going to the app stores (the honest, complete path)

You will need one developer to turn this web build into the phone app using the blueprint in `docs/ARCHITECTURE.md` and the native files in `native/`. Budget roughly 8–14 weeks for a small team. Everything below is what **you** do as the owner.

### C1. Legal & accounts (do these first — they take days to approve)
1. **Apple Developer Program** — <https://developer.apple.com/programs/enroll/> — US $99/year. Sign in with an Apple ID, choose *Individual* (or *Organization* if you have a registered company + D-U-N-S number), verify identity, pay. Approval: 1–3 days.
2. **Google Play Console** — <https://play.google.com/console/signup> — one-time US $25. Verify identity (ID document + sometimes proof of address). New personal accounts must run a **closed test with at least 12 testers for 14 days** before they may publish to production — plan for it.
3. **Supabase** (backend & database) — <https://supabase.com> — free tier to start. Create a project, open *SQL Editor*, paste `supabase/schema.sql`, click *Run*.
4. **AdMob** (ads in the TV) — <https://admob.google.com> — free. Create the app, make **one Native Advanced ad unit** named “TV placement”. Your developer sets it to *muted, no autoplay-with-sound*.
5. **OpenAI account** (moderation of user text) — free moderation endpoint; put the key in Supabase *Edge Function secrets*, never in the app.
6. **Privacy policy & terms** — required by both stores. A generator such as Termly or iubenda works; it must mention: audio processing on device, optional coarse location for weather, motion sensor for alarm, AdMob, purchases, account deletion.
7. **Bank & tax** — in App Store Connect (*Agreements, Tax, and Banking*) and Play Console (*Payments profile*). Paid items and donations cannot go live until these are complete.

### C2. Products to create in each store (names must match the code)
| Product | Type | Price | Apple / Google product ID |
|---|---|---|---|
| Remove all ads | Non-consumable / one-time | $4.99 (stores round $5.00 to tier) | `hushroom.remove_ads` |
| Each sound pack (6) | Non-consumable | $0.99 | `hushroom.pack.campfire`, `…weather`, `…transit`, `…nature`, `…cafes`, `…hobbies` |
| Each room item / theme / interior / outfit / holiday set | Non-consumable | $0.99 | `hushroom.item.<id>` |
| Donations | Consumable | $0.99 / $2.99 / $4.99 / $9.99 | `hushroom.tip.1`, `.3`, `.5`, `.10` |

Both stores require digital goods to use **their** billing (Stripe/PayPal are not allowed for in-app digital items). Donations count as digital goods too.

### C3. Store listing (you can prepare these now)
- App name **Bed Buddies**, subtitle “Cozy rain & sleep sounds”.
- Screenshots: Sounds, Room (with pets), Store, Favorites, Alarm — iPhone 6.7" and 6.5", iPad 12.9", Android phone + 7" tablet.
- Age rating: 12+/Teen if the Vocal ASMR pack ships (it is off by default and behind an 18+ confirmation); otherwise 4+/Everyone.
- Apple *App Privacy* and Google *Data safety* answers: purchases (linked to account), coarse location (not linked, not stored), motion (on device only), device identifiers for ads (AdMob), user content (prompts/feedback, moderated).
- **Review notes** — copy this: “Alarm plays through the app’s audio session. Background audio is used for sleep loops. The TV in the room shows muted native ads only when tapped-to-expand. Vocal content is opt-in 18+. No hidden features.”

### C4. Permissions you will be asked to justify
- iOS: Background audio, Microphone (only for forcing the alarm to the speaker while Bluetooth is connected), Location when-in-use (weather), Motion (shake to dismiss). **Critical Alerts** is optional; apply under developer.apple.com → *Account → Additional Capabilities* and be ready for a “no”.
- Android: Exact alarms, Full-screen intent (alarm screen), Display over other apps + Modify system settings (blackout brightness), Coarse location, Notifications. Play will ask for a short video showing each in use.

### C5. Test, then release
1. Developer sends you **TestFlight** (iOS) and a **closed testing** link (Android). Install on your own phone and run the same checklist as Part A, plus: sleep with it playing overnight, receive a phone call while playing, set the alarm with Bluetooth earbuds connected, put the phone under a pillow for 20 minutes (thermal), buy the $5 pass with a **sandbox** tester account (no real money).
2. Fix, repeat. When crash-free for a week and the 12-tester/14-day Android requirement is met, click **Submit for review** (Apple, usually 1–3 days) and **Send for review / Release to production** (Google, 1–7 days). Start Android at 20% staged rollout.
3. After launch: open the admin dashboard weekly to publish new loops (the Rule-of-3 check will stop you if a pack has fewer than three free sounds), read feature ideas, and toggle holiday campaigns a week before each holiday.

### C6. What must stay honest in your listing
Do **not** claim the app can play over phone calls in other apps, bypass Do Not Disturb without permission, or keep another app’s camera on. The app does everything the platforms allow (background mixing with apps that permit it, alarms that ignore the silent switch, true-black overlay with brightness restore) and explains the rest to users in-app. This is what keeps you approved and keeps refunds low.

---

## Replacing placeholders (administrator checklist)

When the project is confirmed done, these are the only placeholders left to swap:

1. **Ko-fi donation link** (currently `"Put link here"`):
   - Open `src/config/appConfig.ts` in Visual Studio Code.
   - Change the `koFi` line to your page, e.g. `koFi: "https://ko-fi.com/yourname"`.
   - Also update the backend mirror `config/gateways.json` to the same URL.
   - Rebuild: `npm run build` (web) or ship an app update. For a server-side hot-swap without an update:
     `supabase secrets set KO_FI_URL=https://ko-fi.com/yourname` and redeploy the config function.
   - Until it is set, the button politely tells users the link is coming soon (nothing breaks).
2. **Room backdrops** — drop images at `src/assets/art/rooms/rainroom.jpg`, `log-cabin.jpg`, `apartment.jpg`, `train.jpg`, `castle.jpg` (square, ≥1024 px, flat wall + floor strip like `hero.jpg`). The built-in layered CSS scenes are used automatically whenever a file is missing.
3. **Real recordings** — place files at the `audio/<pack>/<slug>.m4a` paths listed in `src/data/soundCatalog.ts`.
4. **Character creator** — intentionally disabled for users. Only the developer can re-enable it via `features.characterCreator` in `src/config/appConfig.ts`; there is no user-facing switch.

## Quick reference — commands
| Goal | Command |
|---|---|
| Run locally | `npm run dev` |
| Run on phone via Wi-Fi | `npm run dev -- --host` |
| Build the single shareable file | `npm run build` → `dist/index.html` |
| Check for mistakes after editing data files | `npx tsc --noEmit` |
