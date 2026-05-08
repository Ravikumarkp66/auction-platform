"use client";

export default function MobileAppStyles() {
  return (
    <style jsx global>{`
      :root {
        --sat: env(safe-area-inset-top);
        --sar: env(safe-area-inset-right);
        --sab: env(safe-area-inset-bottom);
        --sal: env(safe-area-inset-left);
      }
      
      /* Target the body only when we are in the mobile route */
      body {
        background-color: #030712 !important;
        margin: 0;
        padding: 0;
        overflow-x: hidden;
        overscroll-behavior: none;
        -webkit-tap-highlight-color: transparent;
        -webkit-touch-callout: none;
        user-select: none;
        font-feature-settings: "ss01", "ss02", "cv01", "cv02";
        letter-spacing: -0.01em;
      }

      /* Animated Background Particles */
      @keyframes float {
        0% { transform: translateY(0px) translateX(0px); opacity: 0; }
        50% { opacity: 0.2; }
        100% { transform: translateY(-100px) translateX(20px); opacity: 0; }
      }

      .particle {
        position: fixed;
        background: white;
        border-radius: 50%;
        pointer-events: none;
        z-index: -1;
        opacity: 0;
        animation: float 10s infinite linear;
      }

      /* Premium Typography */
      h1, h2, h3, h4 {
        letter-spacing: -0.03em !important;
        line-height: 1.1;
      }

      /* Allow selection in inputs only */
      input, textarea {
        user-select: text;
        -webkit-user-select: text;
      }

      /* Ensure the Next.js wrapper doesn't break the layout */
      .app-container {
        min-height: 100dvh;
        display: flex;
        flex-direction: column;
      }
    `}</style>
  );
}
