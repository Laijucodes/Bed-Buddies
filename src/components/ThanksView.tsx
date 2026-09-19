import { motion } from "framer-motion";
import { Coffee, HandCoins, MessageSquareHeart, Send } from "lucide-react";
import { useState } from "react";
import { APP_CONFIG, KO_FI_CONFIGURED } from "../config/appConfig";
import { useApp } from "../state/store";
import { Chip, FoldedHands } from "./ui";

const DONATIONS = [100, 300, 500, 1000];

export function ThanksView() {
  const { adsRemoved, submitFeedback, notify, confirm, updateSettings, state } = useApp();
  const [text, setText] = useState("");
  const [amount, setAmount] = useState(300);

  const send = () => {
    const clean = text.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 600);
    if (!clean) { notify("Write a feature idea first", "error"); return; }
    submitFeedback(clean); setText(""); notify("Thank you — your idea was saved for the developer.", "success");
  };

  return (
    <div className="mx-auto max-w-3xl px-5 pb-40 pt-28 text-center md:px-10">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", damping: 14 }} className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-[28px] bg-[var(--accent)] text-[var(--accent-ink)] shadow-[0_18px_40px_var(--glow)]">
        <FoldedHands size={40} />
      </motion.div>
      <p className="kicker">Developer note</p>
      <h1 className="display text-5xl sm:text-6xl">Thank you!</h1>
      {adsRemoved && (
        <div className="card mx-auto mt-6 max-w-xl p-5 text-left">
          <div className="flex items-start gap-3"><FoldedHands size={22} className="mt-0.5 shrink-0 text-[var(--accent)]" /><div><b className="block">You removed ads. That genuinely helps.</b><p className="mt-1 text-sm text-[var(--muted)]">Your TV can stay as cozy ambient art, become silent static, or leave the room entirely.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(["ambient", "static", "removed"] as const).map((m) => <Chip key={m} active={state.settings.tvMode === m} onClick={() => updateSettings({ tvMode: m })}>{m === "ambient" ? "Ambient loop" : m === "static" ? "Silent static" : "Remove TV"}</Chip>)}
            </div></div></div>
        </div>
      )}
      <p className="display mx-auto mt-8 max-w-2xl text-xl leading-9 text-[var(--text)]/85 sm:text-2xl">
        Thank you for downloading the app! This is my first app. I hate how most sleep apps paywall or trap features, so I made my own with all the features I've always wanted and kept it free with optional things as well as ways to support me. I hope you love this app as much as I do—if not, recommend features to me.
      </p>

      <div className="card mx-auto mt-10 max-w-xl p-5 text-left">
        <div className="mb-2 flex items-center gap-2"><MessageSquareHeart size={18} className="text-[var(--accent)]" /><b>Recommend a feature</b></div>
        <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={600} placeholder="I'd love a sound of…" className="input min-h-24 resize-none" aria-label="Feature recommendation" />
        <div className="mt-3 flex items-center justify-between"><span className="text-xs text-[var(--muted)]">{text.length}/600 · moderated before it reaches the inbox</span><button className="btn-primary !py-2" onClick={send}><Send size={15} /> Send</button></div>
      </div>

      <div className="card mx-auto mt-4 max-w-xl p-5 text-left">
        <div className="mb-2 flex items-center gap-2"><HandCoins size={18} className="text-[var(--accent-2)]" /><b>Donate (optional, flexible)</b></div>
        <p className="text-xs text-[var(--muted)]">Everything stays free either way. Pick any amount.</p>
        <div className="mt-3 flex flex-wrap gap-2">{DONATIONS.map((c) => <Chip key={c} active={amount === c} onClick={() => setAmount(c)}>${(c / 100).toFixed(2)}</Chip>)}<Chip active={!DONATIONS.includes(amount)} onClick={() => setAmount(750)}>Custom</Chip></div>
        <button className="btn-ghost mt-4 w-full" onClick={() => confirm({ title: `Donate $${(amount / 100).toFixed(2)}?`, body: "Donations in the store build run through the platform's tipping flow. This preview only simulates it.", price: `$${(amount / 100).toFixed(2)}`, confirmLabel: "Donate", onConfirm: () => notify("Thank you so much. 🙏", "success") })}>Donate ${(amount / 100).toFixed(2)}</button>
        <button
          className="btn-ghost mt-2 w-full !border-[#f2c9a0]/40"
          onClick={() => {
            if (KO_FI_CONFIGURED) window.open(APP_CONFIG.gateways.koFi, "_blank", "noopener");
            else notify("Ko-fi isn't linked yet — admin: set the URL in src/config/appConfig.ts", "info");
          }}
        >
          <Coffee size={16} /> Buy me a Ko-fi {KO_FI_CONFIGURED ? "" : "· (link coming soon)"}
        </button>
      </div>
      {state.feedback.length > 0 && <p className="mt-6 text-xs text-[var(--muted)]">{state.feedback.length} idea{state.feedback.length === 1 ? "" : "s"} saved on this device for the developer inbox.</p>}
    </div>
  );
}
