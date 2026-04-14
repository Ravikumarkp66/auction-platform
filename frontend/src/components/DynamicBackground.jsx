"use client";
import { useEffect } from "react";
import { API_URL } from "@/lib/apiConfig";

export default function DynamicBackground() {
  useEffect(() => {
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
      } catch {}
    };
    fetchBg();
  }, []);

  return null;
}
