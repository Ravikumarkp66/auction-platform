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
    hidden: { opacity: 0, y: 12 },
    show: (i) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] },
    }),
  };

  return (
    <div className="min-h-screen w-full bg-[#070b1e] text-slate-50 font-sans antialiased overflow-x-hidden flex flex-col justify-start pt-14 px-[2.5vw] pb-8 select-none relative z-10">
      {/* ── background ── */}
      <div className="absolute inset-0 z-0 bg-[#070b1e] pointer-events-none">
        <div
          className="absolute top-0 left-0 w-full h-[60vh] opacity-35"
          style={{
            background:
              "radial-gradient(circle at top, rgba(99,102,241,0.22) 0%, rgba(124,58,237,0.06) 50%, transparent 100%)",
          }}
        />
      </div>

      <FloatingDots />

      {/* ── content wrapper ── */}
      <div className="w-[95vw] mx-auto flex flex-col items-stretch z-10 flex-grow gap-6">
        
        {/* Top Header Group */}
        <div className="w-full flex flex-col items-center text-center mt-2">
          {/* Logo Badge */}
          <motion.div
            custom={0}
            variants={fadeIn}
            initial="hidden"
            animate="show"
            className="flex items-center justify-center gap-2 mb-2"
          >
            <span className="text-[32px]">🏏</span>
          </motion.div>

          {/* Heading */}
          <motion.h1
            custom={1}
            variants={fadeIn}
            initial="hidden"
            animate="show"
            className="text-[42px] font-black tracking-tight leading-tight bg-gradient-to-r from-white via-indigo-100 to-purple-200 bg-clip-text text-transparent mt-1"
          >
            We've Moved!
          </motion.h1>
        </div>

        {/* Message block */}
        <div className="w-full flex flex-col items-stretch gap-5">
          {/* Kannada Message */}
          <motion.div
            custom={2}
            variants={fadeIn}
            initial="hidden"
            animate="show"
            className="text-center px-1"
          >
            <div className="flex flex-col items-center gap-1.5 mb-2.5">
              <span className="text-2xl">📢</span>
              <h2 className="text-[20px] font-bold text-indigo-200">
                ಪ್ರಿಯ ಬಳಕೆದಾರರೇ,
              </h2>
            </div>
            <p className="text-[20px] leading-relaxed text-slate-100 font-extrabold">
              Lakshmish Cricket Events <br />
              ಈಗ ಹೊಸ ವೆಬ್ಸೈಟ್ನಲ್ಲಿ ಲಭ್ಯವಿದೆ.
            </p>
          </motion.div>

          {/* English Message */}
          <motion.div
            custom={3}
            variants={fadeIn}
            initial="hidden"
            animate="show"
            className="text-center px-1"
          >
            <p className="text-[18px] leading-relaxed text-slate-350 font-semibold">
              Lakshmish Cricket Events is now available on our new website.
            </p>
          </motion.div>

          {/* New Website Tag */}
          <motion.div
            custom={4}
            variants={fadeIn}
            initial="hidden"
            animate="show"
            className="flex items-center justify-center gap-1.5 text-indigo-400 font-bold uppercase tracking-wider text-[14px]"
          >
            <span>👇 ಹೊಸ ವೆಬ್ಸೈಟ್ / New Website</span>
          </motion.div>

          {/* Website Address Block */}
          <motion.div
            custom={5}
            variants={fadeIn}
            initial="hidden"
            animate="show"
            className="border-t border-b border-white/10 py-5 w-full"
          >
            <a
              href={NEW_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center gap-2 w-full bg-white/[0.02] active:bg-white/[0.07] py-4 px-3 rounded-2xl border border-white/5 transition-all"
            >
              <div className="flex items-center gap-2 text-indigo-300 mb-0.5">
                <Globe className="w-5 h-5" />
                <span className="text-[13px] font-extrabold tracking-wider uppercase">
                  Website Address
                </span>
              </div>
              <span className="text-[21px] sm:text-[22px] font-mono font-black text-white tracking-tight break-all flex items-center justify-center gap-2">
                {NEW_URL.replace("https://", "")}
                <ExternalLink className="w-5 h-5 text-indigo-400 shrink-0" />
              </span>
            </a>
          </motion.div>

          {/* Countdown Block */}
          <motion.div
            custom={6}
            variants={fadeIn}
            initial="hidden"
            animate="show"
            className="flex flex-col items-center justify-center text-center my-1"
          >
            {/* Giant Number */}
            <span className="text-[72px] font-black leading-none bg-gradient-to-b from-white to-indigo-300 bg-clip-text text-transparent">
              {countdown}
            </span>
            <span className="text-[15px] font-bold tracking-wide uppercase text-indigo-300 mt-1.5">
              {countdown > 0 ? "Redirecting to new site..." : "Redirecting now..."}
            </span>

            {/* Progress Bar */}
            <div className="w-[200px] h-2 bg-white/10 rounded-full overflow-hidden mt-4 relative">
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
          custom={7}
          variants={fadeIn}
          initial="hidden"
          animate="show"
          className="w-full flex flex-col gap-3.5 mt-auto pt-4"
        >
          {/* Primary Button (60px height) */}
          <a
            href={NEW_URL}
            className="relative flex items-center justify-center gap-2.5 w-full h-[60px] rounded-2xl font-bold text-white text-[20px] overflow-hidden active:scale-[0.98] transition-transform"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl" />
            <div className="absolute inset-0 rounded-2xl shadow-[0_4px_20px_rgba(99,102,241,0.4)]" />
            <span className="relative flex items-center gap-2">
              <Rocket className="w-6 h-6" />
              ಹೊಸ ವೆಬ್ಸೈಟ್ಗೆ ಭೇಟಿ ನೀಡಿ
              <ArrowRight className="w-6 h-6" />
            </span>
          </a>

          {/* Secondary Button */}
          <button
            onClick={handleCopy}
            className="flex items-center justify-center gap-2 w-full h-[52px] rounded-2xl font-bold text-[18px] border border-white/10 bg-white/[0.04] text-slate-300 active:scale-[0.98] active:bg-white/[0.08] transition-all"
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
                  <Check className="w-5 h-5" />
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
                  <Copy className="w-5 h-5" />
                  Copy Link
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          {/* Footer Thank You */}
          <div className="text-center mt-3">
            <span className="text-[15px] text-slate-500 font-semibold tracking-wider uppercase">
              ❤️ Thank You
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
