/**
 * API Configuration and Utilities
 */

export const getApiUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  
  // In the browser, we check if a direct API URL is provided via environment variables.
  // Using a direct URL helps avoid socket.io connection timeouts and proxy issues.
  if (typeof window !== 'undefined') {
    if (envUrl && envUrl !== "undefined" && envUrl.startsWith("http")) {
      return envUrl;
    }
    return ""; // Fallback to relative path/proxy
  }

  // Use environment variable if it exists and is not just a placeholder
  if (envUrl && envUrl !== "undefined" && envUrl.length > 0) {
    return envUrl;
  }

  // Fallback for SSR
  if (process.env.NODE_ENV === "development") {
    return "http://localhost:5050";
  }
  
  // Final fallback (production default if env missing)
  return "";
};

export const API_URL = getApiUrl();

export const DEFAULT_ASSETS = {
  BANNER_LOGO: "https://auction-platform-kp.s3.ap-south-1.amazonaws.com/public/ChatGPT+Image+Mar+18%2C+2026%2C+12_45_23+PM.png",
  SQUAD_BG: "https://auction-platform-kp.s3.ap-south-1.amazonaws.com/backgrounds/sit-stadium-tumkur-stadiums-gxk3uth1uu.avif",
  DEFAULT_PLAYER: "https://ui-avatars.com/api/?background=random",
  DEFAULT_TEAM: "https://ui-avatars.com/api/?background=random"
};
