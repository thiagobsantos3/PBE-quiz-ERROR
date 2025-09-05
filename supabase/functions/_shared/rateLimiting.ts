/**
 * Server-side rate limiting utilities for Supabase Edge Functions
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyPrefix: string;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

/**
 * Rate limiter using Supabase for storage
 */
export class ServerRateLimiter {
  private supabase: any;
  private config: RateLimitConfig;

  constructor(supabase: any, config: RateLimitConfig) {
    this.supabase = supabase;
    this.config = config;
  }

  /**
   * Check if request is allowed and update rate limit
   */
  async checkRateLimit(identifier: string): Promise<RateLimitResult> {
    const key = `${this.config.keyPrefix}:${identifier}`;
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    try {
      // Get current rate limit data
      const { data: rateLimitData, error } = await this.supabase
        .from('rate_limits')
        .select('*')
        .eq('key', key)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        console.error('Rate limit check error:', error);
        return { allowed: true, remaining: this.config.maxRequests, resetTime: now + this.config.windowMs };
      }

      let requests: number[] = [];
      let resetTime = now + this.config.windowMs;

      if (rateLimitData) {
        requests = rateLimitData.requests || [];
        resetTime = rateLimitData.reset_time || resetTime;
      }

      // Filter out old requests outside the window
      const validRequests = requests.filter(timestamp => timestamp > windowStart);
      const currentCount = validRequests.length;

      if (currentCount >= this.config.maxRequests) {
        return {
          allowed: false,
          remaining: 0,
          resetTime,
          retryAfter: Math.ceil((resetTime - now) / 1000)
        };
      }

      // Add current request
      validRequests.push(now);

      // Update rate limit data
      const upsertData = {
        key,
        requests: validRequests,
        reset_time: resetTime,
        updated_at: new Date().toISOString()
      };

      const { error: upsertError } = await this.supabase
        .from('rate_limits')
        .upsert(upsertData, { onConflict: 'key' });

      if (upsertError) {
        console.error('Rate limit update error:', upsertError);
      }

      return {
        allowed: true,
        remaining: this.config.maxRequests - validRequests.length,
        resetTime
      };

    } catch (error) {
      console.error('Rate limiting error:', error);
      // Fail open - allow request if rate limiting fails
      return { allowed: true, remaining: this.config.maxRequests, resetTime: now + this.config.windowMs };
    }
  }

  /**
   * Get rate limit headers for response
   */
  getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
    const headers: Record<string, string> = {
      'X-RateLimit-Limit': this.config.maxRequests.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
    };

    if (result.retryAfter) {
      headers['Retry-After'] = result.retryAfter.toString();
    }

    return headers;
  }
}

/**
 * Create rate limiter for authentication endpoints
 */
export function createAuthRateLimiter(supabase: any): ServerRateLimiter {
  return new ServerRateLimiter(supabase, {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    keyPrefix: 'auth'
  });
}

/**
 * Create rate limiter for general API endpoints
 */
export function createApiRateLimiter(supabase: any): ServerRateLimiter {
  return new ServerRateLimiter(supabase, {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
    keyPrefix: 'api'
  });
}

/**
 * Create rate limiter for password reset endpoints
 */
export function createPasswordResetRateLimiter(supabase: any): ServerRateLimiter {
  return new ServerRateLimiter(supabase, {
    maxRequests: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    keyPrefix: 'password_reset'
  });
}

/**
 * Get client identifier for rate limiting
 */
export function getClientIdentifier(req: Request): string {
  // Try to get IP from various headers
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  
  const ip = forwardedFor?.split(',')[0] || realIp || cfConnectingIp || 'unknown';
  
  // For additional security, you could hash the IP
  return ip;
}

/**
 * Apply rate limiting to edge function
 */
export async function applyRateLimiting(
  req: Request,
  supabase: any,
  rateLimiter: ServerRateLimiter
): Promise<{ allowed: boolean; headers?: Record<string, string> }> {
  const identifier = getClientIdentifier(req);
  const result = await rateLimiter.checkRateLimit(identifier);
  
  if (!result.allowed) {
    const headers = rateLimiter.getRateLimitHeaders(result);
    return { allowed: false, headers };
  }
  
  return { allowed: true, headers: rateLimiter.getRateLimitHeaders(result) };
}