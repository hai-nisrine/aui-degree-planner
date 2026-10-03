// Sliding-window, in-memory rate limiter
class RateLimiter {
    constructor(maxRequests = 10, windowMs = 60000) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
        this.requests = new Map();

        // Periodically forget clients that have been idle for a full window
        const cleanup = setInterval(() => this.prune(), windowMs);
        cleanup.unref();
    }

    recentTimestamps(identifier, now = Date.now()) {
        const timestamps = this.requests.get(identifier) || [];
        return timestamps.filter(t => now - t < this.windowMs);
    }

    // Records the request and returns true if it is within the limit
    isAllowed(identifier) {
        const now = Date.now();
        const timestamps = this.recentTimestamps(identifier, now);

        if (timestamps.length >= this.maxRequests) {
            this.requests.set(identifier, timestamps);
            return false;
        }

        timestamps.push(now);
        this.requests.set(identifier, timestamps);
        return true;
    }

    // Seconds until the identifier can make another request
    getResetTime(identifier) {
        const timestamps = this.recentTimestamps(identifier);
        if (timestamps.length === 0) return 0;

        const resetTime = Math.min(...timestamps) + this.windowMs;
        return Math.max(0, Math.ceil((resetTime - Date.now()) / 1000));
    }

    prune() {
        const now = Date.now();
        for (const identifier of this.requests.keys()) {
            if (this.recentTimestamps(identifier, now).length === 0) {
                this.requests.delete(identifier);
            }
        }
    }
}

const chatRateLimiter = new RateLimiter(30, 60000); // 30 requests per minute

module.exports = {
    chatRateLimiter,
    RateLimiter
};
