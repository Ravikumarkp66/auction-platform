"use client";

import { useState, useEffect, useCallback } from "react";
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
  const dots = [
    { x: "10%", y: "15%", size: 4, dur: 6, delay: 0 },
    { x: "85%", y: "10%", size: 3, dur: 8, delay: 1 },
    { x: "20%", y: "75%", size: 5, dur: 7, delay: 0.5 },
    { x: "75%", y: "65%", size: 3, dur: 9, delay: 2 },
    { x: "50%", y: "30%", size: 4, dur: 7, delay: 1.5 },
    { x: "60%", y: "85%", size: 3, dur: 8, delay: 0.8 },
  ];

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
    hidden: { opacity: 0, y: 10 },
    show: (i) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.35, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] },
    }),
  };

  return (
    <div className="min-h-screen w-full bg-[#070b1e] text-slate-50 font-sans antialiased overflow-hidden flex flex-col justify-start pt-12 px-5 pb-6 select-none relative z-10">
      {/* ── background ── */}
      <div className="absolute inset-0 z-0 bg-[#070b1e] pointer-events-none">
        <div
          className="absolute top-0 left-0 w-full h-[50vh] opacity-35"
          style={{
            background:
              "radial-gradient(circle at top, rgba(99,102,241,0.2) 0%, rgba(124,58,237,0.05) 50%, transparent 100%)",
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
      <div className="w-[94vw] max-w-[420px] mx-auto flex flex-col items-center z-10 flex-grow justify-between">
        
        {/* Top Content Block */}
        <div className="w-full flex flex-col items-stretch text-left">
          
          {/* Logo Badge */}
          <motion.div
            custom={0}
            variants={fadeIn}
            initial="hidden"
            animate="show"
            className="flex items-center gap-2 mb-2"
          >
            <span className="text-[22px]">🏏</span>
            <span className="text-[14px] font-black tracking-wider uppercase text-indigo-400">
              Lakshmish Cricket Events
            </span>
          </motion.div>

          {/* Heading */}
          <motion.h1
            custom={1}
            variants={fadeIn}
            initial="hidden"
            animate="show"
            className="flex items-center gap-3 text-[38px] font-black tracking-tight mb-5 leading-none"
          >
            <Rocket className="w-9 h-9 text-indigo-400 shrink-0" />
            <span className="bg-gradient-to-r from-white via-indigo-100 to-purple-200 bg-clip-text text-transparent">
              We've Moved!
            </span>
          </motion.h1>

          {/* Kannada Message */}
          <motion.div
            custom={2}
            variants={fadeIn}
            initial="hidden"
            animate="show"
            className="mb-4"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xl">📢</span>
              <h2 className="text-[20px] font-bold text-indigo-200">
                ಪ್ರಿಯ ಬಳಕೆದಾರರೇ,
              </h2>
            </div>
            <p className="text-[18px] leading-relaxed text-slate-200 font-medium">
              <strong className="text-white font-bold">Lakshmish Cricket Events</strong> ಹೊಸ ವೆಬ್‌ಸೈಟ್‌ಗೆ ಸ್ಥಳಾಂತರಗೊಂಡಿದೆ. ಉತ್ತಮ ಅನುಭವಕ್ಕಾಗಿ ದಯವಿಟ್ಟು ಭೇಟಿ ನೀಡಿ.
            </p>
          </motion.div>

          {/* English Message */}
          <motion.div
            custom={3}
            variants={fadeIn}
            initial="hidden"
            animate="show"
            className="mb-5"
          >
            <p className="text-[16px] leading-relaxed text-slate-350 font-medium">
              <strong className="text-white font-bold">Lakshmish Cricket Events</strong> has moved to a new website with improved performance and new features.
            </p>
          </motion.div>

          {/* Website Address Block with Divider lines */}
          <motion.div
            custom={4}
            variants={fadeIn}
            initial="hidden"
            animate="show"
            className="border-t border-b border-white/10 py-4 mb-4 w-full"
          >
            <a
              href={NEW_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col gap-1.5 w-full bg-white/[0.03] active:bg-white/[0.08] p-3.5 rounded-xl border border-white/5 transition-all"
            >
              <div className="flex items-center gap-1.5 text-indigo-300">
                <Globe className="w-4 h-4" />
                <span className="text-[12px] font-bold tracking-wider uppercase">
                  New Website Address
                </span>
              </div>
              <span className="text-[18px] font-mono font-bold text-white flex items-center justify-between gap-1.5 break-all">
                {NEW_URL.replace("https://", "")}
                <ExternalLink className="w-4.5 h-4.5 text-indigo-400 shrink-0" />
              </span>
            </a>
          </motion.div>

          {/* Countdown & Redirect Progress Section */}
          <motion.div
            custom={5}
            variants={fadeIn}
            initial="hidden"
            animate="show"
            className="flex flex-col items-center justify-center my-2 text-center"
          >
            {/* Huge Number */}
            <span className="text-[76px] font-black leading-none bg-gradient-to-b from-white via-indigo-100 to-indigo-300 bg-clip-text text-transparent">
              {countdown}
            </span>
            <span className="text-[14px] font-bold tracking-wide uppercase text-indigo-300 mt-1">
              {countdown > 0 ? "Redirecting to new site..." : "Redirecting now..."}
            </span>

            {/* Progress Bar */}
            <div className="w-[180px] h-2 bg-white/10 rounded-full overflow-hidden mt-3 relative">
              <motion.div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                initial={{ width: "100%" }}
                animate={{ width: `${(countdown / COUNTDOWN_SECONDS) * 100}%` }}
                transition={{ duration: 1, ease: "linear" }}
              />
            </div>
          </motion.div>

        </div>

        {/* Bottom Actions Block */}
        <motion.div
          custom={6}
          variants={fadeIn}
          initial="hidden"
          animate="show"
          className="w-full flex flex-col gap-3 mt-4"
        >
          {/* primary */}
          <a
            href={NEW_URL}
            className="relative flex items-center justify-center gap-2.5 w-full h-[56px] rounded-2xl font-bold text-white text-[19px] overflow-hidden active:scale-[0.98] transition-transform"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl" />
            <div className="absolute inset-0 rounded-2xl shadow-[0_4px_16px_rgba(99,102,241,0.35)]" />
            <span className="relative flex items-center gap-1.5">
              <Rocket className="w-5.5 h-5.5" />
              ಹೊಸ ವೆಬ್‌ಸೈಟ್‌ಗೆ ಭೇಟಿ ನೀಡಿ
              <ArrowRight className="w-5.5 h-5.5" />
            </span>
          </a>

          {/* secondary */}
          <button
            onClick={handleCopy}
            className="flex items-center justify-center gap-2 w-full h-[48px] rounded-2xl font-bold text-[17px] border border-white/10 bg-white/[0.04] text-slate-300 active:scale-[0.98] active:bg-white/[0.08] transition-all"
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
                  Copy Link
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </motion.div>
      </div>
    </div>
  );
}
