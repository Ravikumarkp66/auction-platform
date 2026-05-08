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
      }

      /* Hide Scrollbars */
      ::-webkit-scrollbar {
        display: none;
      }
      
      * {
        -ms-overflow-style: none;
        scrollbar-width: none;
      }

      /* Mobile specific spacing utilities */
      .safe-top { padding-top: var(--sat); }
      .safe-bottom { padding-bottom: var(--sab); }
      
      /* Ensure the Next.js wrapper doesn't break the layout */
      .app-container {
        min-height: 100dvh;
        display: flex;
        flex-direction: column;
      }
    `}</style>
  );
}
