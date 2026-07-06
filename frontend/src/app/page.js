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

/* ─── countdown ring ─── */
function CountdownRing({ count, total }) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const progress = ((total - count) / total) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="96" height="96" className="-rotate-90">
        <circle
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="5"
        />
        <motion.circle
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          stroke="url(#cg)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animate={{ strokeDashoffset: progress }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        />
        <defs>
          <linearGradient id="cg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#c084fc" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.span
            key={count}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="text-3xl font-black bg-gradient-to-br from-white to-indigo-200 bg-clip-text text-transparent"
          >
            {count}
          </motion.span>
        </AnimatePresence>
      </div>
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
    hidden: { opacity: 0, y: 16 },
    show: (i) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] },
    }),
  };

  return (
    <div className="fixed inset-0 overflow-y-auto overflow-x-hidden z-[9999]">
      {/* ── background ── */}
      <div className="fixed inset-0 z-0 bg-[#070b1e]">
        {/* single soft gradient orb — GPU-friendly */}
        <div
          className="absolute top-[-30%] left-[-20%] w-[140vw] h-[80vh] opacity-40"
          style={{
            background:
              "radial-gradient(ellipse at 40% 30%, rgba(99,102,241,0.35) 0%, rgba(124,58,237,0.15) 40%, transparent 70%)",
          }}
        />
        <div
          className="absolute bottom-[-10%] right-[-10%] w-[80vw] h-[50vh] opacity-30"
          style={{
            background:
              "radial-gradient(ellipse at 60% 70%, rgba(168,85,247,0.25) 0%, transparent 70%)",
          }}
        />
      </div>

      <FloatingDots />

      {/* ── content wrapper — centers card on desktop ── */}
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4 py-6 pb-[env(safe-area-inset-bottom,16px)]">
        <motion.div
          initial="hidden"
          animate="show"
          className="w-full max-w-[460px] flex flex-col items-center"
        >
          {/* ── badge ── */}
          <motion.div custom={0} variants={fadeIn}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-indigo-400/15 bg-indigo-500/8 backdrop-blur-sm mb-5">
              <span className="text-base">🏏</span>
              <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-indigo-300">
                Lakshmish Cricket Events
              </span>
            </div>
          </motion.div>

          {/* ── heading ── */}
          <motion.h1
            custom={1}
            variants={fadeIn}
            className="flex items-center gap-2.5 text-[28px] sm:text-4xl font-black tracking-tight mb-6"
          >
            <Rocket className="w-7 h-7 sm:w-8 sm:h-8 text-indigo-400 shrink-0" />
            <span className="bg-gradient-to-r from-white via-indigo-100 to-purple-200 bg-clip-text text-transparent">
              We've Moved!
            </span>
          </motion.h1>

          {/* ── glass card ── */}
          <motion.div
            custom={2}
            variants={fadeIn}
            className="w-full rounded-[20px] border border-white/[0.07] bg-white/[0.04] backdrop-blur-xl p-5 sm:p-6 shadow-[0_8px_40px_rgba(0,0,0,0.3),0_0_60px_rgba(99,102,241,0.06)]"
          >
            {/* kannada */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2.5">
                <span className="text-xl">📢</span>
                <h2 className="text-base sm:text-lg font-bold text-indigo-200">
                  ಪ್ರಿಯ ಬಳಕೆದಾರರೇ,
                </h2>
              </div>
              <div className="space-y-2 text-[13px] sm:text-sm leading-relaxed text-slate-300 pl-8">
                <p>
                  <strong className="text-white font-semibold">
                    Lakshmish Cricket Events
                  </strong>{" "}
                  ಈಗ ಹೊಸ ವೆಬ್‌ಸೈಟ್‌ಗೆ ಸ್ಥಳಾಂತರಗೊಂಡಿದೆ.
                </p>
                <p>
                  ಇನ್ನಷ್ಟು ವೇಗ, ಹೊಸ ವೈಶಿಷ್ಟ್ಯಗಳು ಹಾಗೂ ಉತ್ತಮ ಅನುಭವಕ್ಕಾಗಿ
                  ದಯವಿಟ್ಟು ನಮ್ಮ ಹೊಸ ವೆಬ್‌ಸೈಟ್‌ಗೆ ಭೇಟಿ ನೀಡಿ.
                </p>
              </div>
            </div>

            {/* divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-4" />

            {/* english */}
            <div className="mb-1">
              <p className="text-[13px] sm:text-sm text-slate-400 leading-relaxed">
                <span className="text-slate-200 font-medium">Dear Users,</span>
                <br />
                <strong className="text-white font-semibold">
                  Lakshmish Cricket Events
                </strong>{" "}
                has moved to a new website with improved performance and exciting
                new features.
              </p>
            </div>
          </motion.div>

          {/* ── new website URL card ── */}
          <motion.a
            custom={3}
            variants={fadeIn}
            href={NEW_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full mt-4 rounded-2xl border border-indigo-400/15 bg-gradient-to-br from-indigo-500/[0.07] to-purple-500/[0.04] backdrop-blur-lg p-4 flex flex-col items-center gap-2 active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-1.5 text-indigo-300">
              <Globe className="w-4 h-4" />
              <span className="text-[11px] font-bold tracking-wider uppercase">
                New Website
              </span>
            </div>
            <span className="text-[13px] sm:text-sm font-mono font-semibold text-white/90 text-center break-all leading-snug flex items-center gap-1.5">
              {NEW_URL.replace("https://", "")}
              <ExternalLink className="w-3.5 h-3.5 text-indigo-400/60 shrink-0" />
            </span>
          </motion.a>

          {/* ── countdown ── */}
          <motion.div
            custom={4}
            variants={fadeIn}
            className="mt-6 flex flex-col items-center gap-2"
          >
            <p className="text-[11px] sm:text-xs text-slate-500 tracking-wide uppercase font-medium">
              {countdown > 0
                ? `Redirecting in ${countdown}s...`
                : "Redirecting now..."}
            </p>
            {countdown > 0 ? (
              <CountdownRing count={countdown} total={COUNTDOWN_SECONDS} />
            ) : (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-24 h-24 flex items-center justify-center"
              >
                <div className="w-6 h-6 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
              </motion.div>
            )}
          </motion.div>

          {/* ── buttons ── */}
          <motion.div
            custom={5}
            variants={fadeIn}
            className="w-full mt-6 flex flex-col gap-3"
          >
            {/* primary */}
            <a
              href={NEW_URL}
              className="relative flex items-center justify-center gap-2.5 w-full h-[52px] rounded-2xl font-semibold text-white text-[15px] overflow-hidden active:scale-[0.97] transition-transform"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl" />
              <div className="absolute inset-0 rounded-2xl shadow-[0_4px_20px_rgba(99,102,241,0.35)]" />
              <span className="relative flex items-center gap-2">
                <Rocket className="w-4 h-4" />
                ಹೊಸ ವೆಬ್‌ಸೈಟ್‌ಗೆ ಭೇಟಿ ನೀಡಿ
                <ArrowRight className="w-4 h-4" />
              </span>
            </a>

            {/* secondary */}
            <button
              onClick={handleCopy}
              className="flex items-center justify-center gap-2 w-full h-[48px] rounded-2xl font-semibold text-[14px] border border-white/10 bg-white/[0.04] text-slate-300 active:scale-[0.97] active:bg-white/[0.08] transition-all"
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
            custom={6}
            variants={fadeIn}
            className="mt-6 text-center space-y-0.5"
          >
            <p className="text-[12px] sm:text-[13px] text-slate-500">
              🏏 Thank you for being part of the{" "}
              <strong className="text-slate-400">
                Lakshmish Cricket Events
              </strong>{" "}
              family.
            </p>
            <p className="text-[11px] text-slate-600">
              See you on our new website! ❤️
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
