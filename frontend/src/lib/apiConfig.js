/**
 * API Configuration and Utilities
 */

export const getApiUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  
  if (envUrl && envUrl !== "undefined" && envUrl.startsWith("http")) {
    return envUrl;
  }

  if (typeof window !== 'undefined') {
    // If we are on localhost/127.0.0.1, use the current hostname to avoid CORS mismatch
    const isLocal = window.location.hostname === 'localhost' || 
                   window.location.hostname === '127.0.0.1' || 
                   window.location.hostname.startsWith('192.168.') || 
                   window.location.hostname.startsWith('10.');

    if (isLocal) {
      return `http://${window.location.hostname}:5050`;
    }
    
    // In production, we MUST have NEXT_PUBLIC_API_URL set. 
    // Fallback to empty string to prevent hitting port 5050 on the frontend domain
    return ""; 
  }

  if (process.env.NODE_ENV === "development") {
    return "http://localhost:5050";
  }
  
  return "";
};

export const API_URL = getApiUrl();

// Hardened defaults with automatic proxying to avoid 403 on startup
const S3_BASE = "https://auction-platform-kp.s3.ap-south-1.amazonaws.com";
export const DEFAULT_ASSETS = {
  BANNER_LOGO: "https://ui-avatars.com/api/?name=Auction&background=071821&color=fff&size=1200",
  SQUAD_BG: `${S3_BASE}/backgrounds/sit-stadium-tumkur-stadiums-gxk3uth1uu.avif`,
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
  const targetPath = path || fallback;
  if (!targetPath) return "";

  if (targetPath.startsWith('http')) {
    // Skip proxying if it's already an internal API URL
    if (API_URL && targetPath.startsWith(API_URL)) return targetPath;

    // Skip proxying for ui-avatars.com — simple public CDN, no CORS issues
    if (targetPath.includes('ui-avatars.com')) return targetPath;

    // Skip proxying for our own S3 bucket — public read is allowed
    if (targetPath.includes('auction-platform-kp.s3')) return targetPath;

    // Only proxy Google Drive URLs (they require auth workaround)
    if (targetPath.includes('drive.google.com')) {
      return getProxiedImageUrl(targetPath);
    }

    // For all other external URLs, proxy to avoid CORS/403
    return getProxiedImageUrl(targetPath);
  }

  const baseUrl = API_URL || "";
  const normalizedPath = targetPath.startsWith('/') ? targetPath : `/${targetPath}`;
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

/**
 * Calculate age from date of birth
 * @param {string|number|Date} dob - The date of birth
 * @returns {number|null} - The calculated age
 */
export const calculateAge = (dob) => {
  if (!dob || dob === "-" || dob === "undefined") return null;
  try {
    const today = new Date();
    let birthDate;

    // Handle Excel Serial Dates
    if (typeof dob === 'number') {
      birthDate = new Date(Math.round((dob - 25569) * 864e5));
    } else if (dob instanceof Date) {
      birthDate = dob;
    } else {
      // Try native parsing first (for ISO strings from MongoDB)
      const testDate = new Date(dob);
      if (!isNaN(testDate.getTime())) {
        birthDate = testDate;
      } else {
        // Fallback to custom parsing for DD/MM/YYYY, DD-MM-YYYY, etc.
        let s = String(dob).trim()
          .replace(/[೦-೯]/g, d => "೦೧೨೩೪೫೬೭೮೯".indexOf(d)); // Convert Kannada numerals

        const parts = s.split(/[\/\-\.]/);
        if (parts.length === 3) {
          let [p1, p2, p3] = parts.map(Number);
          let y = p3, m = p2, d = p1;
          
          // Detect YYYY/MM/DD
          if (p1 > 1000) { y = p1; m = p2; d = p3; }
          // Handle 2-digit years
          if (y < 100) y += (y > 30 ? 1900 : 2000);
          // Handle DD/MM vs MM/DD ambiguity
          if (m > 12 && d <= 12) { const t = m; m = d; d = t; }

          birthDate = new Date(y, m - 1, d);
        } else {
          birthDate = new Date(s);
        }
      }
    }

    if (!birthDate || isNaN(birthDate.getTime())) return null;

    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  } catch (e) {
    console.error("Age calculation error:", e);
    return null;
  }
};
