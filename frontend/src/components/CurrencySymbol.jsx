"use client";

import React from 'react';
import { IndianRupee } from 'lucide-react';

export default function CurrencySymbol({ unit, className = "", iconClassName = "w-[0.8em] h-[0.8em]" }) {
  if (!unit || unit === "₹") {
    return <IndianRupee className={`${iconClassName} ${className}`} strokeWidth={3} />;
  }

  // Define colors and styles for different units
  const styles = {
    RS: {
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30",
      text: "text-emerald-400",
      label: "RS"
    },
    CR: {
      bg: "bg-cyan-500/10",
      border: "border-cyan-500/30",
      text: "text-cyan-400",
      label: "CR"
    },
    PTS: {
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
      text: "text-amber-400",
      label: "PTS"
    }
  };

  const style = styles[unit] || {
    bg: "bg-slate-500/10",
    border: "border-slate-500/30",
    text: "text-slate-400",
    label: unit
  };

  return (
    <span className={`inline-flex items-center justify-center ${style.bg} ${style.border} ${style.text} border rounded-md px-2 py-0.5 text-[0.4em] font-black uppercase tracking-widest align-middle leading-none mb-1 shadow-sm ${className}`}>
      {style.label}
    </span>
  );
}
