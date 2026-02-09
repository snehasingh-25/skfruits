/**
 * Instagram URL validation and sanitization utilities
 */

/**
 * Validates if a URL is a valid Instagram post or reel URL
 * @param {string} url - The URL to validate
 * @returns {boolean} - True if valid Instagram URL
 */
export function isValidInstagramUrl(url) {
  if (!url || typeof url !== "string") return false;
  
  const trimmed = url.trim();
  
  // Valid patterns: https://www.instagram.com/p/... or https://www.instagram.com/reel/...
  const instagramPostPattern = /^https:\/\/(www\.)?instagram\.com\/(p|reel)\/[\w-]+\/?(\?.*)?$/;
  
  return instagramPostPattern.test(trimmed);
}

/**
 * Sanitizes Instagram URL by removing query parameters and trailing slashes
 * @param {string} url - The URL to sanitize
 * @returns {string} - Sanitized URL
 */
export function sanitizeInstagramUrl(url) {
  if (!url || typeof url !== "string") return "";
  
  const trimmed = url.trim();
  
  // Remove query parameters and trailing slash
  const urlObj = new URL(trimmed);
  const cleanUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`.replace(/\/$/, "");
  
  return cleanUrl;
}

/**
 * Validates and processes an array of Instagram embed objects
 * @param {Array} embeds - Array of embed objects with {url, enabled, createdAt}
 * @returns {Array} - Validated and sanitized array
 */
export function validateInstagramEmbeds(embeds) {
  if (!Array.isArray(embeds)) return [];
  
  return embeds
    .filter(embed => {
      if (!embed || typeof embed !== "object") return false;
      if (!embed.url || !isValidInstagramUrl(embed.url)) return false;
      return true;
    })
    .map(embed => ({
      url: sanitizeInstagramUrl(embed.url),
      enabled: embed.enabled !== false, // Default to true if not specified
      createdAt: embed.createdAt || new Date().toISOString(),
    }));
}
