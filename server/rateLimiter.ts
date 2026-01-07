/**
 * Rate Limiter for Socket Events
 * Implements a sliding window rate limiting algorithm
 */

interface RateLimitConfig {
  maxRequests: number;  // Maximum number of requests allowed
  windowMs: number;      // Time window in milliseconds
}

interface RateLimitEntry {
  timestamps: number[];  // Array of timestamps for requests in the current window
}

// Rate limit configurations for different event types
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  emote_sent: {
    maxRequests: 5,      // 5 emotes
    windowMs: 10000      // per 10 seconds
  },
  play_cards: {
    maxRequests: 10,     // 10 card plays
    windowMs: 5000       // per 5 seconds
  },
  pass_turn: {
    maxRequests: 5,      // 5 passes
    windowMs: 5000       // per 5 seconds
  },
  get_public_rooms: {
    maxRequests: 10,     // 10 requests
    windowMs: 10000      // per 10 seconds
  },
  request_sync: {
    maxRequests: 5,      // 5 sync requests
    windowMs: 10000      // per 10 seconds
  }
};

// Store rate limit data per socket/player
const rateLimitStore: Map<string, Map<string, RateLimitEntry>> = new Map();

/**
 * Get or create a rate limit entry for a socket/event combination
 */
function getRateLimitEntry(identifier: string, eventType: string): RateLimitEntry {
  if (!rateLimitStore.has(identifier)) {
    rateLimitStore.set(identifier, new Map());
  }
  
  const eventMap = rateLimitStore.get(identifier)!;
  if (!eventMap.has(eventType)) {
    eventMap.set(eventType, { timestamps: [] });
  }
  
  return eventMap.get(eventType)!;
}

/**
 * Clean up old timestamps outside the current window
 */
function cleanOldTimestamps(entry: RateLimitEntry, windowMs: number): void {
  const now = Date.now();
  const cutoff = now - windowMs;
  entry.timestamps = entry.timestamps.filter(ts => ts > cutoff);
}

/**
 * Check if a request should be rate limited
 * @param identifier - Socket ID or Player ID to track
 * @param eventType - Type of event being rate limited
 * @returns Object with `allowed` boolean and `retryAfter` in milliseconds (if rate limited)
 */
export function checkRateLimit(
  identifier: string,
  eventType: string
): { allowed: boolean; retryAfter?: number } {
  const config = RATE_LIMITS[eventType];
  
  // If no config exists for this event type, allow it
  if (!config) {
    return { allowed: true };
  }
  
  const entry = getRateLimitEntry(identifier, eventType);
  const now = Date.now();
  
  // Clean old timestamps
  cleanOldTimestamps(entry, config.windowMs);
  
  // Check if we've exceeded the limit
  if (entry.timestamps.length >= config.maxRequests) {
    // Calculate when the oldest request in the window will expire
    const oldestTimestamp = entry.timestamps[0];
    const retryAfter = (oldestTimestamp + config.windowMs) - now;
    return {
      allowed: false,
      retryAfter: Math.max(0, retryAfter)
    };
  }
  
  // Add current timestamp and allow
  entry.timestamps.push(now);
  return { allowed: true };
}

/**
 * Clear rate limit data for a socket (useful on disconnect)
 */
export function clearRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}

/**
 * Clear all rate limit data (useful for cleanup or testing)
 */
export function clearAllRateLimits(): void {
  rateLimitStore.clear();
}

/**
 * Get current rate limit status for debugging
 */
export function getRateLimitStatus(identifier: string, eventType: string): {
  count: number;
  maxRequests: number;
  windowMs: number;
  oldestTimestamp?: number;
} {
  const config = RATE_LIMITS[eventType];
  if (!config) {
    return { count: 0, maxRequests: 0, windowMs: 0 };
  }
  
  const entry = getRateLimitEntry(identifier, eventType);
  cleanOldTimestamps(entry, config.windowMs);
  
  return {
    count: entry.timestamps.length,
    maxRequests: config.maxRequests,
    windowMs: config.windowMs,
    oldestTimestamp: entry.timestamps.length > 0 ? entry.timestamps[0] : undefined
  };
}
