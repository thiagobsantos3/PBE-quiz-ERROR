import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Simple rate limiting implementation
class SimpleRateLimiter {
  private maxRequests: number;
  private windowMs: number;
  private keyPrefix: string;

  constructor(maxRequests: number, windowMs: number, keyPrefix: string) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.keyPrefix = keyPrefix;
  }

  async checkRateLimit(identifier: string): Promise<{ allowed: boolean; remaining: number; retryAfter?: number }> {
    const key = `${this.keyPrefix}:${identifier}`;
    const now = Date.now();
    const windowStart = now - this.windowMs;

    try {
      // Get current rate limit data
      const { data: rateLimitData, error } = await supabase
        .from('rate_limits')
        .select('*')
        .eq('key', key)
        .single();

      let requests: number[] = [];
      let resetTime = now + this.windowMs;

      if (rateLimitData && !error) {
        requests = rateLimitData.requests || [];
        resetTime = rateLimitData.reset_time || resetTime;
      }

      // Filter out old requests outside the window
      const validRequests = requests.filter(timestamp => timestamp > windowStart);
      const currentCount = validRequests.length;

      if (currentCount >= this.maxRequests) {
        return {
          allowed: false,
          remaining: 0,
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

      await supabase
        .from('rate_limits')
        .upsert(upsertData, { onConflict: 'key' });

      return {
        allowed: true,
        remaining: this.maxRequests - validRequests.length
      };

    } catch (error) {
      console.error('Rate limiting error:', error);
      // Fail open - allow request if rate limiting fails
      return { allowed: true, remaining: this.maxRequests };
    }
  }
}

// Create rate limiters
const authRateLimiter = new SimpleRateLimiter(5, 15 * 60 * 1000, 'auth'); // 5 requests per 15 minutes
const passwordResetRateLimiter = new SimpleRateLimiter(3, 60 * 60 * 1000, 'password_reset'); // 3 requests per hour

Deno.serve(async (req) => {
  try {
    // Handle CORS
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      });
    }

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const body = await req.json();
    const { action, identifier } = body;

    if (!action || !identifier) {
      return new Response('Missing required fields', { status: 400 });
    }

    let rateLimiter;
    let rateLimitResult;

    switch (action) {
      case 'login':
      case 'signup':
        rateLimiter = authRateLimiter;
        break;
      case 'password_reset':
        rateLimiter = passwordResetRateLimiter;
        break;
      default:
        return new Response('Invalid action', { status: 400 });
    }

    rateLimitResult = await rateLimiter.checkRateLimit(identifier);

    const responseHeaders = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (!rateLimitResult.allowed) {
      return new Response(JSON.stringify({
        error: 'Rate limit exceeded',
        retryAfter: rateLimitResult.retryAfter
      }), {
        status: 429,
        headers: responseHeaders
      });
    }

    return new Response(JSON.stringify({
      allowed: true,
      remaining: rateLimitResult.remaining
    }), {
      status: 200,
      headers: responseHeaders
    });

  } catch (error) {
    console.error('Auth rate limit error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });
  }
});