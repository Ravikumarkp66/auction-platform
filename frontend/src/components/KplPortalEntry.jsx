"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, ShieldCheck, Sparkles, UserRound, Clock3 } from "lucide-react";

const MODE_COPY = {
    apply: {
        eyebrow: "Secure Access",
        title: "KPL Auction Registration",
        subtitle: "Official player verification portal for Kolala Premier League 2026.",
        cta: "Open Secure Application",
        helper: "Use the invitation code shared by the organizer.",
    },
    status: {
        eyebrow: "Application Status",
        title: "KPL Secure Status",
        subtitle: "Check your saved application or continue a pending session.",
        cta: "Open Application Portal",
        helper: "If you have a secure link, paste the code below.",
    },
    review: {
        eyebrow: "Review Session",
        title: "KPL Review Portal",
        subtitle: "Review your submitted application in a focused secure workspace.",
        cta: "Open Secure Application",
        helper: "Enter the invitation code to continue.",
    },
};

export default function KplPortalEntry({ mode = "apply" }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [token, setToken] = useState(() => {
        const queryToken = searchParams.get("token") || searchParams.get("invite") || "";
        return queryToken.trim();
    });

    const copy = MODE_COPY[mode] || MODE_COPY.apply;

    const handleContinue = () => {
        const safeToken = token.trim();
        if (!safeToken) return;
        router.push(`/auction/kpl/apply/${safeToken}`);
    };

    return (
        <div className="min-h-screen bg-[#020617] text-white relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-violet-600/20 blur-3xl" />
                <div className="absolute top-28 -right-24 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
                <div className="absolute bottom-0 -left-32 h-80 w-80 rounded-full bg-white/5 blur-3xl" />
            </div>

            <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-8 sm:px-6">
                <div className="w-full rounded-4xl border border-white/10 bg-[#0B1225]/90 p-5 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:p-8">
                    <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-violet-600 to-cyan-500 shadow-lg shadow-violet-600/20">
                                <ShieldCheck className="h-7 w-7 text-white" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-violet-300">{copy.eyebrow}</p>
                                <h1 className="mt-1 text-2xl font-black uppercase tracking-tight text-white sm:text-3xl">{copy.title}</h1>
                            </div>
                        </div>
                        <div className="inline-flex items-center gap-2 self-start rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.25em] text-emerald-300 sm:self-auto">
                            <Sparkles className="h-3.5 w-3.5" />
                            Secure Portal
                        </div>
                    </div>

                    <div className="grid gap-8 pt-6 lg:grid-cols-[1.2fr,0.8fr] lg:pt-8">
                        <div className="space-y-5">
                            <p className="max-w-xl text-sm leading-7 text-slate-300 sm:text-base">{copy.subtitle}</p>
                            <div className="rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-5">
                                <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Invitation Code</label>
                                <div className="flex flex-col gap-3 sm:flex-row">
                                    <div className="relative flex-1">
                                        <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                                        <input
                                            value={token}
                                            onChange={(event) => setToken(event.target.value)}
                                            placeholder="Paste secure code here"
                                            className="w-full rounded-2xl border border-white/10 bg-[#020617] px-11 py-4 text-sm font-semibold tracking-wide text-white outline-none transition-all placeholder:text-slate-600 focus:border-cyan-500/40"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleContinue}
                                        disabled={!token.trim()}
                                        className="inline-flex min-w-42.5 items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-violet-600 to-cyan-500 px-5 py-4 text-xs font-black uppercase tracking-[0.25em] text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {copy.cta}
                                        <ArrowRight className="h-4 w-4" />
                                    </button>
                                </div>
                                <p className="mt-3 text-[10px] font-medium uppercase tracking-[0.25em] text-slate-500">{copy.helper}</p>
                            </div>
                        </div>

                        <div className="space-y-4 rounded-3xl border border-white/10 bg-[#020617]/70 p-4 sm:p-5">
                            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                                <Clock3 className="h-4 w-4 text-cyan-400" />
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-300">Focused Flow</p>
                                    <p className="text-[11px] font-semibold text-slate-400">No public navigation, no marketing hero, no distractions.</p>
                                </div>
                            </div>
                            <div className="grid gap-3 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">Identity</div>
                                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">Location</div>
                                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">Cricket Profile</div>
                                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">Uploads + Review</div>
                            </div>
                            <button
                                type="button"
                                onClick={() => router.push('/auction/kpl/apply')}
                                className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-xs font-black uppercase tracking-[0.2em] text-white transition-all hover:bg-white/10"
                            >
                                Back to Portal
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
