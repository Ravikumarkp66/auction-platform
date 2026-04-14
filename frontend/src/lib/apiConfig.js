/**
 * API Configuration and Utilities
 */

export const getApiUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  
  // Use environment variable if it exists and is not just a placeholder
  if (envUrl && envUrl !== "undefined" && envUrl.length > 0) {
    // Determine if we should use a relative path (for proxying) to avoid Mixed Content.
    // We do this if:
    // 1. We are in production SSR
    // 2. We are in the browser on a secure (HTTPS) page and the API URL is insecure (HTTP)
    const isProduction = process.env.NODE_ENV === "production";
    const isSecurePage = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const isUrlInsecure = envUrl.startsWith("http://");

    if ((isProduction || isSecurePage) && isUrlInsecure) {
      return "";
    }
    return envUrl;
  }
  
  // Fallback for development (using 127.0.0.1 for better Windows reliability)
  if (process.env.NODE_ENV === "development") {
    return "http://127.0.0.1:5050";
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
