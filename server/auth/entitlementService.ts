/**
 * Server-Side Entitlements and Usage Limits Enforcement Engine
 * Central authority for Role authorization, Plan permissions, and Rate/Usage limits.
 */

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, requireAuth } from '../auth/authService.js';
import { db } from '../db/database.js';

export type SubscriptionPlanId = 'FREE' | 'PRO' | 'INSTITUTIONAL';
export type FeaturePermission =
  | 'MARKET_RADAR'
  | 'CURRENCY_STRENGTH_MATRIX'
  | 'MACRO_NEWS_WIRE'
  | 'ECONOMIC_CALENDAR'
  | 'TRADINGVIEW_CHARTS'
  | 'AI_OVERVIEW_REFRESH'
  | 'AI_DEEP_ANALYSIS'
  | 'SSE_PRIORITY_STREAM'
  | 'PERSISTENT_WATCHLIST'
  | 'CUSTOM_TELEGRAM_SCRAPER'
  | 'ADMIN_SYSTEM_PANEL'
  | 'API_DATA_EXPORT';

export interface PlanLimits {
  watchlistLimit: number;
  aiGenerationsPerDay: number;
  streamRateHz: number;
  customTelegramChannels: number;
}

export const SERVER_PLANS: Record<SubscriptionPlanId, { permissions: FeaturePermission[]; limits: PlanLimits }> = {
  FREE: {
    permissions: [
      'MARKET_RADAR',
      'CURRENCY_STRENGTH_MATRIX',
      'MACRO_NEWS_WIRE',
      'ECONOMIC_CALENDAR',
      'TRADINGVIEW_CHARTS',
      'AI_OVERVIEW_REFRESH',
      'AI_DEEP_ANALYSIS',
      'SSE_PRIORITY_STREAM',
      'PERSISTENT_WATCHLIST',
      'CUSTOM_TELEGRAM_SCRAPER',
      'ADMIN_SYSTEM_PANEL',
      'API_DATA_EXPORT',
    ],
    limits: {
      watchlistLimit: 500,
      aiGenerationsPerDay: 500,
      streamRateHz: 50,
      customTelegramChannels: 25,
    },
  },
  PRO: {
    permissions: [
      'MARKET_RADAR',
      'CURRENCY_STRENGTH_MATRIX',
      'MACRO_NEWS_WIRE',
      'ECONOMIC_CALENDAR',
      'TRADINGVIEW_CHARTS',
      'AI_OVERVIEW_REFRESH',
      'AI_DEEP_ANALYSIS',
      'SSE_PRIORITY_STREAM',
      'PERSISTENT_WATCHLIST',
      'CUSTOM_TELEGRAM_SCRAPER',
      'ADMIN_SYSTEM_PANEL',
      'API_DATA_EXPORT',
    ],
    limits: {
      watchlistLimit: 500,
      aiGenerationsPerDay: 500,
      streamRateHz: 50,
      customTelegramChannels: 25,
    },
  },
  INSTITUTIONAL: {
    permissions: [
      'MARKET_RADAR',
      'CURRENCY_STRENGTH_MATRIX',
      'MACRO_NEWS_WIRE',
      'ECONOMIC_CALENDAR',
      'TRADINGVIEW_CHARTS',
      'AI_OVERVIEW_REFRESH',
      'AI_DEEP_ANALYSIS',
      'SSE_PRIORITY_STREAM',
      'PERSISTENT_WATCHLIST',
      'CUSTOM_TELEGRAM_SCRAPER',
      'ADMIN_SYSTEM_PANEL',
      'API_DATA_EXPORT',
    ],
    limits: {
      watchlistLimit: 500,
      aiGenerationsPerDay: 500,
      streamRateHz: 50,
      customTelegramChannels: 25,
    },
  },
};

// In-memory daily AI generation tracking: userId -> { count: number, resetAt: number }
const aiUsageTracker = new Map<string, { count: number; resetAt: number }>();

export class EntitlementService {
  /**
   * Evaluates whether a user account holds a feature permission.
   * ADMIN users always bypass plan restrictions.
   */
  public static canAccessFeature(
    user: { role?: string; plan?: string; subscription_status?: string } | null | undefined,
    permission: FeaturePermission
  ): boolean {
    if (!user) return false;

    // Role-based authorization: ADMIN role has universal entitlement
    if (user.role === 'ADMIN') {
      return true;
    }

    const planKey = (user.plan as SubscriptionPlanId) || 'FREE';
    const planConfig = SERVER_PLANS[planKey] || SERVER_PLANS.FREE;

    // Check subscription active state
    const status = user.subscription_status || 'active';
    if (status !== 'active' && status !== 'trialing') {
      // Inactive or expired accounts fall back to FREE tier
      return SERVER_PLANS.FREE.permissions.includes(permission);
    }

    return planConfig.permissions.includes(permission);
  }

  /**
   * Retrieves usage limits for a given user
   */
  public static getUserLimits(user: { role?: string; plan?: string } | null | undefined): PlanLimits {
    if (user?.role === 'ADMIN') {
      return SERVER_PLANS.INSTITUTIONAL.limits;
    }
    const planKey = (user?.plan as SubscriptionPlanId) || 'FREE';
    const planConfig = SERVER_PLANS[planKey] || SERVER_PLANS.FREE;
    return planConfig.limits;
  }

  /**
   * Tracks and increments an AI operation usage counter.
   * Returns { allowed: boolean, remaining: number, limit: number }
   */
  public static checkAndIncrementAIUsage(userId: string, user: { role?: string; plan?: string }): {
    allowed: boolean;
    remaining: number;
    limit: number;
    used: number;
  } {
    if (user.role === 'ADMIN') {
      return { allowed: true, remaining: 9999, limit: 9999, used: 0 };
    }

    const limits = this.getUserLimits(user);
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    let usage = aiUsageTracker.get(userId);
    if (!usage || now > usage.resetAt) {
      usage = { count: 0, resetAt: now + oneDayMs };
      aiUsageTracker.set(userId, usage);
    }

    if (usage.count >= limits.aiGenerationsPerDay) {
      return {
        allowed: false,
        remaining: 0,
        limit: limits.aiGenerationsPerDay,
        used: usage.count,
      };
    }

    usage.count += 1;
    return {
      allowed: true,
      remaining: limits.aiGenerationsPerDay - usage.count,
      limit: limits.aiGenerationsPerDay,
      used: usage.count,
    };
  }

  /**
   * Returns current AI usage stats for a user
   */
  public static getAIUsage(userId: string, user: { role?: string; plan?: string }): {
    used: number;
    limit: number;
    remaining: number;
  } {
    if (user.role === 'ADMIN') {
      return { used: 0, limit: 9999, remaining: 9999 };
    }
    const limits = this.getUserLimits(user);
    const now = Date.now();
    const usage = aiUsageTracker.get(userId);

    if (!usage || now > usage.resetAt) {
      return { used: 0, limit: limits.aiGenerationsPerDay, remaining: limits.aiGenerationsPerDay };
    }

    return {
      used: usage.count,
      limit: limits.aiGenerationsPerDay,
      remaining: Math.max(0, limits.aiGenerationsPerDay - usage.count),
    };
  }
}

/**
 * Express Middleware: Guard an endpoint by required FeaturePermission
 */
export function requirePermission(permission: FeaturePermission) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    requireAuth(req, res, () => {
      const user = req.user!;
      if (!EntitlementService.canAccessFeature(user, permission)) {
        res.status(403).json({
          error: `Upgrade Required: This action requires a subscription with '${permission}' permission.`,
          required_permission: permission,
          current_plan: user.plan || 'FREE',
        });
        return;
      }
      next();
    });
  };
}
