"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

const steps = [
  {
    title: "Real-time Bidding",
    description: "Experience the thrill of live auctions with instant updates and seamless bidding functionality.",
    icon: (
      <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    color: "from-purple-600 to-indigo-700",
    glow: "bg-purple-500/30"
  },
  {
    title: "League Management",
    description: "Effortlessly manage your tournaments, teams, and player rosters in one centralized hub.",
    icon: (
      <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
    color: "from-cyan-500 to-blue-600",
    glow: "bg-cyan-500/20"
  },
  {
    title: "IPL Premium Feel",
    description: "Professional graphics and smooth transitions designed for the ultimate sports auction experience.",
    icon: (
      <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-7.714 2.143L11 21l-2.143-7.714L1 12l7.714-2.143L11 3z" />
      </svg>
    ),
    color: "from-yellow-500 to-orange-600",
    glow: "bg-yellow-500/20"
  }
];

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(0);
  const router = useRouter();

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      router.push('/'); // Change to your mobile dashboard route
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#030712] relative overflow-hidden min-h-dvh">
      {/* Background Glow */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`glow-${currentStep}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className={`absolute inset-0 ${steps[currentStep].glow} blur-[120px] rounded-full scale-150 -z-10`}
        />
      </AnimatePresence>

      {/* Progress Indicators */}
      <div className="absolute top-16 left-0 right-0 flex justify-center gap-3 z-20">
        {steps.map((_, idx) => (
          <motion.div 
            key={idx}
            initial={false}
            animate={{ 
              width: idx === currentStep ? 32 : 8,
              backgroundColor: idx === currentStep ? "#A855F7" : "#374151"
            }}
            className="h-1.5 rounded-full transition-all duration-300"
          />
        ))}
      </div>

      {/* Skip Button */}
      <div className="absolute top-14 right-6 z-20">
        <button 
          onClick={() => router.push('/')}
          className="text-gray-500 text-sm font-bold uppercase tracking-widest hover:text-white transition-colors"
        >
          Skip
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center px-10 text-center relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.1, y: -20 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex flex-col items-center"
          >
            <div className={`w-36 h-36 rounded-[40px] bg-linear-to-br ${steps[currentStep].color} flex items-center justify-center shadow-2xl mb-14 relative group`}>
              <div className="absolute inset-0 rounded-[40px] bg-white/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10">
                {steps[currentStep].icon}
              </div>
            </div>
            
            <h2 className="text-4xl font-black mb-6 tracking-tight text-white leading-tight">
              {steps[currentStep].title}
            </h2>
            
            <p className="text-gray-400 text-xl leading-relaxed max-w-[300px]">
              {steps[currentStep].description}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Actions */}
      <div className="p-8 pb-16 relative z-20">
        <button 
          onClick={nextStep}
          className="w-full py-5 rounded-[24px] bg-white text-black font-black text-xl transition-all active:scale-[0.97] shadow-[0_15px_30px_rgba(255,255,255,0.1)] flex items-center justify-center gap-3"
        >
          {currentStep === steps.length - 1 ? "Start Journey" : "Continue"}
          {currentStep !== steps.length - 1 && (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          )}
        </button>
      </div>

      {/* Decorative Elements */}
      <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-purple-600/5 blur-[80px] rounded-full -z-10" />
    </div>
  );
}
