"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import AuthModal from "./AuthModal";

export default function AuthButton() {
  const { data: session, status } = useSession();
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (status === "loading") {
    return (
      <button
        type="button"
        className="text-xs px-3 py-2 rounded-md bg-slate-800 border border-slate-700 text-slate-400"
        disabled
      >
        Loading…
      </button>
    );
  }

  if (session?.user) {
    return (
      <>
        <button
          type="button"
          onClick={() => signOut()}
          className="text-xs px-3 py-2 rounded-md bg-slate-800 border border-slate-700 text-slate-200 hover:text-white hover:bg-slate-700 transition-colors"
          title={session.user.email || ""}
        >
          Sign out
        </button>
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="text-xs px-3 py-2 rounded-md bg-emerald-600 text-white font-bold hover:bg-emerald-500 transition-colors"
      >
        Sign in
      </button>
      <AuthModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
