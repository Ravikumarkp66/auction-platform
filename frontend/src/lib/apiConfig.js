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
  BANNER_LOGO: "https://auction-platform-kp.s3.ap-south-1.amazonaws.com/static/cricket-banner.png",
  SQUAD_BG: "https://auction-platform-kp.s3.ap-south-1.amazonaws.com/backgrounds/sit-stadium-tumkur-stadiums-gxk3uth1uu.avif",
  DEFAULT_PLAYER: "https://ui-avatars.com/api/?background=random",
  DEFAULT_TEAM: "https://ui-avatars.com/api/?background=random"
};

/**
 * Safely construct a media URL
 * @param {string} path - The path to the media asset
 * @param {string} fallback - The fallback URL if path is missing
 * @returns {string} - The full URL
 */
export const getMediaUrl = (path, fallback = DEFAULT_ASSETS.BANNER_LOGO) => {
  if (!path) return fallback;
  if (path.startsWith('http')) return path;
  
  const baseUrl = API_URL || "";
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // If baseUrl ends with /, remove it to avoid //
  const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  
  return `${cleanBase}${normalizedPath}`;
};

/**
 * Wraps an external URL in the backend proxy endpoint
 * @param {string} url - The external image URL
 * @returns {string} - The proxied URL
 */
export const getProxiedImageUrl = (url) => {
  if (!url || !url.startsWith('http')) return url;
  if (url.includes(API_URL) && API_URL.length > 0) return url; // Already internal
  
  return `${API_URL}/api/proxy-image?url=${encodeURIComponent(url)}`;
};


