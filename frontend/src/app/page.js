"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ExternalLink,
  Copy,
  Check,
  Globe,
  Rocket,
  ArrowRight,
} from "lucide-react";

const NEW_URL = "https://lakshmish-cricket-events.vercel.app";
const COUNTDOWN_SECONDS = 8;

/* ─── lightweight floating dots (mobile-optimized, only 6) ─── */
function FloatingDots() {
  const dots = useMemo(
    () => [
      { x: "10%", y: "15%", size: 4, dur: 6, delay: 0 },
      { x: "85%", y: "10%", size: 3, dur: 8, delay: 1 },
      { x: "20%", y: "75%", size: 5, dur: 7, delay: 0.5 },
      { x: "75%", y: "65%", size: 3, dur: 9, delay: 2 },
      { x: "50%", y: "30%", size: 4, dur: 7, delay: 1.5 },
      { x: "60%", y: "85%", size: 3, dur: 8, delay: 0.8 },
    ],
    []
  );

  return (
    <div className="fixed inset-0 pointer-events-none z-[1] overflow-hidden">
      {dots.map((d, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-indigo-400/20"
          style={{ left: d.x, top: d.y, width: d.size, height: d.size }}
          animate={{ y: [0, -20, 0], opacity: [0.3, 0.6, 0.3] }}
          transition={{
            duration: d.dur,
            repeat: Infinity,
            delay: d.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

/* ─── main component ─── */
export default function WeveMovedPage() {
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (countdown <= 0) {
      window.location.href = NEW_URL;
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(NEW_URL);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = NEW_URL;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const fadeIn = {
    hidden: { opacity: 0, y: 12 },
    show: (i) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] },
    }),
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-[#070b1e] text-slate-50 font-sans antialiased overflow-hidden flex flex-col items-center pt-[11vh] px-4 pb-[env(safe-area-inset-bottom,16px)] select-none">
      {/* ── background ── */}
      <div className="absolute inset-0 z-0 bg-[#070b1e]">
        {/* single soft gradient orb — GPU-friendly */}
        <div
          className="absolute top-[-20%] left-[-10%] w-[120vw] h-[60vh] opacity-35"
          style={{
            background:
              "radial-gradient(ellipse at 40% 30%, rgba(99,102,241,0.25) 0%, rgba(124,58,237,0.1) 40%, transparent 70%)",
          }}
        />
        <div
          className="absolute bottom-[-10%] right-[-10%] w-[80vw] h-[40vh] opacity-25"
          style={{
            background:
              "radial-gradient(ellipse at 60% 70%, rgba(168,85,247,0.18) 0%, transparent 70%)",
          }}
        />
      </div>

      <FloatingDots />

      {/* ── content wrapper ── */}
      <motion.div
        initial="hidden"
        animate="show"
        className="w-[94%] max-w-[420px] flex flex-col items-center z-10"
      >
        {/* ── badge & title group ── */}
        <motion.div
          custom={0}
          variants={fadeIn}
          className="flex flex-col items-center gap-1 mb-3.5 text-center"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-indigo-400/20 bg-indigo-500/10 backdrop-blur-sm">
            <span className="text-[13px] sm:text-[14px]">🏏</span>
            <span className="text-[13px] sm:text-[14px] font-bold tracking-wider uppercase text-indigo-300">
              Lakshmish Cricket Events
            </span>
          </div>
          <h1 className="flex items-center gap-2.5 text-[32px] sm:text-[36px] font-black tracking-tight mt-1">
            <Rocket className="w-8 h-8 text-indigo-400 shrink-0" />
            <span className="bg-gradient-to-r from-white via-indigo-100 to-purple-200 bg-clip-text text-transparent">
              We've Moved!
            </span>
          </h1>
        </motion.div>

        {/* ── single unified glass card ── */}
        <motion.div
          custom={1}
          variants={fadeIn}
          className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl p-4.5 shadow-[0_8px_32px_rgba(0,0,0,0.37)]"
        >
          {/* kannada */}
          <div className="mb-3.5">
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="text-xl">📢</span>
              <h2 className="text-[19px] sm:text-[20px] font-bold text-indigo-200">
                ಪ್ರಿಯ ಬಳಕೆದಾರರೇ,
              </h2>
            </div>
            <div className="space-y-1.5 text-[17px] sm:text-[18px] leading-relaxed text-slate-300 pl-7.5">
              <p>
                <strong className="text-white font-semibold">
                  Lakshmish Cricket Events
                </strong>{" "}
                ಹೊಸ ವೆಬ್‌ಸೈಟ್‌ಗೆ ಸ್ಥಳಾಂತರಗೊಂಡಿದೆ.
              </p>
              <p>
                ಉತ್ತಮ ಅನುಭವಕ್ಕಾಗಿ ದಯವಿಟ್ಟು ಭೇಟಿ ನೀಡಿ.
              </p>
            </div>
          </div>

          {/* divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-3.5" />

          {/* english */}
          <div className="mb-3.5">
            <p className="text-[17px] sm:text-[18px] text-slate-350 leading-relaxed pl-7.5">
              <strong className="text-white font-semibold">
                Lakshmish Cricket Events
              </strong>{" "}
              has moved to a new website with improved performance and new features.
            </p>
          </div>

          {/* divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-3.5" />

          {/* URL box inside the card */}
          <a
            href={NEW_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-2 p-3 rounded-xl border border-indigo-400/15 bg-indigo-500/[0.04] active:bg-indigo-500/[0.1] transition-all"
          >
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-indigo-400" />
              <span className="text-[13px] sm:text-[14px] font-semibold text-slate-400 uppercase tracking-wider">
                New Address
              </span>
            </div>
            <span className="text-[15px] sm:text-[16px] font-mono font-bold text-indigo-300 flex items-center gap-1">
              {NEW_URL.replace("https://", "")}
              <ExternalLink className="w-3.5 h-3.5 text-indigo-400/60 shrink-0" />
            </span>
          </a>
        </motion.div>

        {/* ── countdown pill ── */}
        <motion.div
          custom={2}
          variants={fadeIn}
          className="mt-3.5 flex items-center justify-center"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-indigo-400/20 bg-indigo-500/10 backdrop-blur-sm">
            <div className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
            <span className="text-[14px] sm:text-[15px] font-bold text-indigo-300">
              {countdown > 0
                ? `Auto-redirecting in ${countdown}s`
                : "Redirecting now..."}
            </span>
          </div>
        </motion.div>

        {/* ── action buttons ── */}
        <motion.div
          custom={3}
          variants={fadeIn}
          className="w-full mt-4 flex flex-col gap-3"
        >
          {/* primary */}
          <a
            href={NEW_URL}
            className="relative flex items-center justify-center gap-2 w-full h-[52px] rounded-2xl font-bold text-white text-[18px] sm:text-[19px] overflow-hidden active:scale-[0.97] transition-transform"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl" />
            <div className="absolute inset-0 rounded-2xl shadow-[0_4px_16px_rgba(99,102,241,0.3)]" />
            <span className="relative flex items-center gap-1.5">
              <Rocket className="w-5 h-5" />
              ಹೊಸ ವೆಬ್‌ಸೈಟ್‌ಗೆ ಭೇಟಿ ನೀಡಿ
              <ArrowRight className="w-5 h-5" />
            </span>
          </a>

          {/* secondary */}
          <button
            onClick={handleCopy}
            className="flex items-center justify-center gap-2 w-full h-[48px] rounded-2xl font-bold text-[17px] sm:text-[18px] border border-white/10 bg-white/[0.04] text-slate-300 active:scale-[0.97] active:bg-white/[0.08] transition-all"
          >
            <AnimatePresence mode="wait">
              {copied ? (
                <motion.span
                  key="done"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="flex items-center gap-2 text-emerald-400"
                >
                  <Check className="w-4 h-4" />
                  Copied!
                </motion.span>
              ) : (
                <motion.span
                  key="copy"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copy Website Link
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </motion.div>

        {/* ── footer ── */}
        <motion.div
          custom={4}
          variants={fadeIn}
          className="mt-4 text-center space-y-0.5"
        >
          <p className="text-[13px] sm:text-[14px] text-slate-500">
            🏏 Lakshmish Cricket Events
          </p>
          <p className="text-[11px] sm:text-[12px] text-slate-600">
            See you on our new website! ❤️
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
