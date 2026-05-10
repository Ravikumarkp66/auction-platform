"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { API_URL } from "@/lib/apiConfig";
import { isApplicationRoute } from "@/lib/applicationRoutes";

export default function DynamicBackground() {
  const pathname = usePathname();

  useEffect(() => {
    if (isApplicationRoute(pathname) || pathname.startsWith('/mobile')) {
      document.body.style.backgroundImage = "none";
      return;
    }

    const fetchBg = async () => {
      // Don't fetch if offline or page is hidden
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;
      if (typeof document !== 'undefined' && document.hidden) return;

      // Small delay for stability
      await new Promise(r => setTimeout(r, 800));

      try {
        if (!API_URL) return;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const res = await fetch(
          `${API_URL}/api/backgrounds/space_bg`,
          { signal: controller.signal }
        );
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          if (data.imageUrl) {
            document.body.style.backgroundImage = `url('${data.imageUrl}')`;
          }
        }
      } catch { }
    };
    fetchBg();
  }, [pathname]);

  return null;
}
