"use client";
import { useEffect } from "react";

export default function DynamicBackground() {
  useEffect(() => {
    const fetchBg = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/backgrounds/space_bg`
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
