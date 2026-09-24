/**
 * Minimal in-process rate limiter for credential endpoints.
 *
 * Deliberately dependency-free: this app runs as a single Node process, so a
 * fixed-window counter in memory is enough to stop password/OTP brute force.
 * Behind multiple instances this would need a shared store (Redis), which the
 * deployment does not currently have.
 */

import { Request, Response, NextFunction } from 'express';

interface Bucket {
  count: number;
  resetAt: number;
}

interface LimiterOptions {
  windowMs: number;
  max: number;
  message: string;
}

function clientKey(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = Array.isArray(forwarded)
    ? forwarded[0]
    : (forwarded as string | undefined)?.split(',')[0].trim() || req.ip || 'unknown';
  const email = typeof req.body?.email === 'string' ? req.body.email.toLowerCase().trim() : '';
  return email ? `${ip}|${email}` : ip;
}

function createLimiter({ windowMs, max, message }: LimiterOptions) {
  const buckets = new Map<string, Bucket>();

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = clientKey(req);

    // Opportunistic sweep so the map cannot grow without bound.
    if (buckets.size > 5_000) {
      for (const [k, b] of buckets) {
        if (b.resetAt <= now) buckets.delete(k);
      }
    }

    const bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    bucket.count += 1;
    if (bucket.count > max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      res.status(429).json({ error: message, retryAfter });
      return;
    }

    next();
  };
}

/** Login, registration and code submission: tight window. */
export const credentialLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.',
});

/** Token/link issuance endpoints: looser, still bounded. */
export const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Terlalu banyak permintaan. Coba lagi beberapa menit lagi.',
});
