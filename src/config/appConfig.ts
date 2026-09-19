/*
  ============================================================
  BED BUDDIES — APP CONFIGURATION (developer / administrator)
  ============================================================
  This file is the ONLY place the administrator needs to touch
  for identity, feature flags and payment/donation links.

  HOW TO CHANGE THE KO-FI LINK (non-technical steps):
    1. Open this file in Visual Studio Code: src/config/appConfig.ts
    2. Replace the text between the quotes on the koFi line below
       with your real page, e.g. "https://ko-fi.com/yourname"
    3. Save (Ctrl/Cmd+S), then in the terminal run:  npm run build
    4. Upload the new dist/index.html (or ship an app update).
  A mirror copy for the backend lives at /config/gateways.json —
  keep both in sync (the mobile build reads this file; server
  receipts/donation webhooks read the JSON).
*/

export const APP_CONFIG = {
  appName: "Bed Buddies",
  tagline: "a softer night",
  previousWorkingTitle: "Hushroom",

  features: {
    /*
      DEVELOPER-ONLY SWITCH — not exposed in user settings.
      false = character creator, avatars and closet UI are fully
      removed from the consumer app. Profile pictures, sign-up and
      login remain active. Flip to true only for internal builds.
    */
    characterCreator: false,
  },

  gateways: {
    // ⬇️ REPLACE THIS PLACEHOLDER WHEN THE PROJECT IS READY ⬇️
    koFi: "Put link here",
  },
} as const;

export const KO_FI_CONFIGURED = APP_CONFIG.gateways.koFi.startsWith("http");
