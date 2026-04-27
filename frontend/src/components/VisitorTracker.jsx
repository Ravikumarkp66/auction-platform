"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { API_URL } from "../lib/apiConfig";

export default function VisitorTracker() {
  const pathname = usePathname();
  const { data: session } = useSession();

  useEffect(() => {
    // Log basic visit
    const timer = setTimeout(() => {
      logVisit();
    }, 2000);

    return () => clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    // Log user login separately if session exists
    if (session?.user?.email) {
      logUserLogin();
    }
  }, [session?.user?.email]);

  const logUserLogin = async () => {
    try {
      await fetch(`${API_URL}/api/visitors/login-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: session.user.email,
          name: session.user.name,
          role: session.user.role
        })
      });
    } catch (err) {
      console.warn('User login log failed');
    }
  };

  const logVisit = async () => {
    try {
      let sessionID = sessionStorage.getItem('v_sid');
      if (!sessionID) {
        sessionID = Math.random().toString(36).substring(2, 15);
        sessionStorage.setItem('v_sid', sessionID);
      }

      await fetch(`${API_URL}/api/visitors/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: pathname,
          sessionID
        })
      });
    } catch (err) {
      console.warn('Analytics log failed');
    }
  };

  return null;
}
