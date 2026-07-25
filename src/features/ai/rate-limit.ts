import "server-only";

import { createHash } from "node:crypto";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { z } from "zod";

const DEFAULT_RATE_LIMIT_REQUESTS = 10;
const DEFAULT_RATE_LIMIT_WINDOW_SECONDS = 60;

const rateLimitEnvSchema = z.object({
  UPSTASH_REDIS_REST_URL: z.string().trim().min(1).optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().trim().min(1).optional(),
  AI_RATE_LIMIT_REQUESTS: z.coerce.number().int().min(1).default(DEFAULT_RATE_LIMIT_REQUESTS),
  AI_RATE_LIMIT_WINDOW_SECONDS: z.coerce
    .number()
    .int()
    .min(1)
    .default(DEFAULT_RATE_LIMIT_WINDOW_SECONDS),
});

export interface RateLimitCheckResult {
  readonly allowed: boolean;
  readonly retryAfterSeconds: number;
}

export interface RateLimiter {
  check(identifier: string): Promise<RateLimitCheckResult>;
}

export interface RateLimitConfig {
  readonly requests: number;
  readonly windowSeconds: number;
}

interface InMemoryBucket {
  count: number;
  resetAtMs: number;
}

class InMemoryRateLimiter implements RateLimiter {
  private readonly buckets = new Map<string, InMemoryBucket>();

  constructor(private readonly config: RateLimitConfig) {}

  async check(identifier: string): Promise<RateLimitCheckResult> {
    const now = Date.now();
    const windowMs = this.config.windowSeconds * 1_000;
    const bucket = this.buckets.get(identifier);

    if (!bucket || bucket.resetAtMs <= now) {
      this.buckets.set(identifier, {
        count: 1,
        resetAtMs: now + windowMs,
      });
      return { allowed: true, retryAfterSeconds: 0 };
    }

    if (bucket.count >= this.config.requests) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAtMs - now) / 1_000)),
      };
    }

    bucket.count += 1;
    return { allowed: true, retryAfterSeconds: 0 };
  }
}

export function hashIdentifier(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function deriveRateLimitIdentifier(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const rawIdentifier = forwarded?.split(",")[0]?.trim() ?? realIp ?? "anonymous";
  return hashIdentifier(rawIdentifier);
}

export function getRateLimitConfig(): RateLimitConfig {
  const parsed = rateLimitEnvSchema.parse({
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    AI_RATE_LIMIT_REQUESTS: process.env.AI_RATE_LIMIT_REQUESTS,
    AI_RATE_LIMIT_WINDOW_SECONDS: process.env.AI_RATE_LIMIT_WINDOW_SECONDS,
  });

  return {
    requests: parsed.AI_RATE_LIMIT_REQUESTS,
    windowSeconds: parsed.AI_RATE_LIMIT_WINDOW_SECONDS,
  };
}

function hasUpstashCredentials(): boolean {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  return Boolean(url && token);
}

export function createRateLimiter(overrides?: { limiter?: RateLimiter }): RateLimiter {
  if (overrides?.limiter) {
    return overrides.limiter;
  }

  const config = getRateLimitConfig();

  if (!hasUpstashCredentials()) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required in production",
      );
    }

    return new InMemoryRateLimiter(config);
  }

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });

  const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(config.requests, `${config.windowSeconds} s`),
    prefix: "recoverai:ai",
  });

  return {
    async check(identifier: string): Promise<RateLimitCheckResult> {
      const result = await ratelimit.limit(identifier);
      const retryAfterSeconds = Math.max(0, Math.ceil((result.reset - Date.now()) / 1_000));

      return {
        allowed: result.success,
        retryAfterSeconds: result.success ? 0 : Math.max(1, retryAfterSeconds),
      };
    },
  };
}
