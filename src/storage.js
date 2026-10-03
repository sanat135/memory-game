export const STORAGE_KEY = 'quiet-garden-results-v1';

export function rankResults(results) {
  if (!Array.isArray(results)) return [];
  return results.filter((result) => result && Number.isInteger(result.moves)
    && result.moves >= 8 && Number.isFinite(result.timestamp)
    && !Number.isNaN(new Date(result.timestamp).getTime()))
    .sort((a, b) => a.moves - b.moves || a.timestamp - b.timestamp)
    .slice(0, 10);
}

export function readResults(storage) {
  try {
    return rankResults(JSON.parse(storage.getItem(STORAGE_KEY) || '[]'));
  } catch {
    return [];
  }
}

export function saveResult(storage, previous, moves, timestamp = Date.now()) {
  const results = rankResults([...previous, { moves, timestamp }]);
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(results));
    return { results, saved: true };
  } catch {
    return { results, saved: false };
  }
}

export function formatDate(timestamp) {
  const date = new Date(timestamp);
  return [date.getDate(), date.getMonth() + 1, date.getFullYear()]
    .map((part) => String(part).padStart(2, '0')).join('.');
}
