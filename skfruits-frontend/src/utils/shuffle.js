/**
 * Returns a new array with elements in random order (Fisher-Yates shuffle).
 * Does not mutate the input. O(n), safe for use after fetch.
 * Use for product listings to show different order on each page refresh.
 */
export function shuffleArray(arr) {
  if (!Array.isArray(arr) || arr.length <= 1) return [...(arr || [])];
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
