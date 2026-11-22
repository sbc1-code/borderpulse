import { readAllHistory } from './waitTimeHistory.js';

// Only the deferred Analytics view needs to enumerate directional history.
export function getAllHistory(direction = null) {
  const all = readAllHistory();
  if (!direction) return all;
  return Object.fromEntries(Object.entries(all)
    .filter(([key]) => key.endsWith(':sb') === (direction === 'southbound')));
}
