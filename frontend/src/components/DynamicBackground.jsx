"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { API_URL } from "@/lib/apiConfig";
import { isApplicationRoute } from "@/lib/applicationRoutes";

export default function DynamicBackground() {
  const pathname = usePathname();

  useEffect(() => {
    if (isApplicationRoute(pathname)) {
      document.body.style.backgroundImage = "none";
      return;
    }

    const fetchBg = async () => {
      try {
        const res = await fetch(
          `${API_URL}/api/backgrounds/space_bg`
        );
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
