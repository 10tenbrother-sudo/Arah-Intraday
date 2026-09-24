-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verification_status" TEXT,
    "avatar_url" TEXT,
    "plan" TEXT,
    "subscription_status" TEXT,
    "subscription_expires_at" TEXT,
    "last_order_id" TEXT,
    "payment_method" TEXT,
    "billing_cycle" TEXT,
    "created_at" TEXT,
    "updated_at" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "code" TEXT,
    "expires_at" TEXT NOT NULL,
    "created_at" TEXT NOT NULL,
    "used_at" TEXT,
    "type" TEXT,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPreferences" (
    "user_id" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "theme" TEXT NOT NULL,
    "default_market_view" TEXT NOT NULL,
    "density" TEXT NOT NULL,
    "audio_alerts" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TEXT NOT NULL,
    "updated_at" TEXT NOT NULL,

    CONSTRAINT "UserPreferences_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "UserWatchlist" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "asset_type" TEXT NOT NULL,
    "notes" TEXT,
    "added_at" TEXT NOT NULL,

    CONSTRAINT "UserWatchlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAlert" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "target_value" DOUBLE PRECISION,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "triggered_at" TEXT,
    "created_at" TEXT NOT NULL,

    CONSTRAINT "UserAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "endpoint_url" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL,
    "last_success_at" TEXT,
    "last_error_at" TEXT,
    "last_error_message" TEXT,
    "error_count" INTEGER NOT NULL DEFAULT 0,
    "interval_seconds" INTEGER NOT NULL,
    "metadata" TEXT,
    "created_at" TEXT NOT NULL,
    "updated_at" TEXT NOT NULL,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramChannel" (
    "id" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "language" TEXT NOT NULL,
    "last_ingested_at" TEXT,
    "status" TEXT NOT NULL,
    "error_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TelegramChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsItem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "source_name" TEXT NOT NULL,
    "source_url" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "published_at" TEXT NOT NULL,
    "received_at" TEXT NOT NULL,
    "updated_at" TEXT NOT NULL,
    "event_id" TEXT,
    "affected_assets" TEXT NOT NULL,
    "affected_currencies" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "raw_payload" TEXT,
    "entities_extracted" TEXT,

    CONSTRAINT "NewsItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "primary_category" TEXT NOT NULL,
    "impact_level" TEXT NOT NULL,
    "first_detected_at" TEXT NOT NULL,
    "last_updated_at" TEXT NOT NULL,
    "source_count" INTEGER NOT NULL DEFAULT 0,
    "source_names" TEXT NOT NULL,
    "affected_assets" TEXT NOT NULL,
    "affected_currencies" TEXT NOT NULL,
    "key_facts" TEXT NOT NULL,
    "image_url" TEXT,
    "ai_analysis_id" TEXT,
    "is_duplicate_resolved" BOOLEAN,

    CONSTRAINT "MarketEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventSource" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "news_id" TEXT NOT NULL,
    "source_name" TEXT NOT NULL,
    "source_url" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "original_title" TEXT NOT NULL,
    "original_content" TEXT NOT NULL,
    "published_at" TEXT NOT NULL,
    "matched_reason" TEXT NOT NULL,
    "similarity_score" DOUBLE PRECISION NOT NULL,
    "created_at" TEXT NOT NULL,

    CONSTRAINT "EventSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventAsset" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "asset_symbol" TEXT NOT NULL,
    "correlation_rationale" TEXT NOT NULL,

    CONSTRAINT "EventAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventCurrency" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "currency_code" TEXT NOT NULL,
    "impact_direction" TEXT NOT NULL,

    CONSTRAINT "EventCurrency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketPrice" (
    "seq" SERIAL NOT NULL,
    "symbol" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "asset_type" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "change_24h" DOUBLE PRECISION NOT NULL,
    "change_24h_pct" DOUBLE PRECISION NOT NULL,
    "high_24h" DOUBLE PRECISION NOT NULL,
    "low_24h" DOUBLE PRECISION NOT NULL,
    "volume_24h" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL,
    "timestamp" TEXT NOT NULL,
    "last_updated" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "sparkline_1h" TEXT NOT NULL,
    "tv_symbol" TEXT,
    "tradingview_url" TEXT,
    "is_delayed" BOOLEAN,

    CONSTRAINT "MarketPrice_pkey" PRIMARY KEY ("seq")
);

-- CreateTable
CREATE TABLE "CurrencyStrength" (
    "currency" TEXT NOT NULL,
    "strength_score" DOUBLE PRECISION NOT NULL,
    "change_direction" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "timestamp" TEXT NOT NULL,
    "last_updated" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "raw_delta" DOUBLE PRECISION,

    CONSTRAINT "CurrencyStrength_pkey" PRIMARY KEY ("currency")
);

-- CreateTable
CREATE TABLE "CurrencyStrengthHistory" (
    "id" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "strength_score" DOUBLE PRECISION NOT NULL,
    "timestamp" TEXT NOT NULL,

    CONSTRAINT "CurrencyStrengthHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EconomicEvent" (
    "id" TEXT NOT NULL,
    "event_name" TEXT NOT NULL,
    "country_code" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "impact" TEXT NOT NULL,
    "date_time_utc" TEXT NOT NULL,
    "actual" TEXT,
    "forecast" TEXT,
    "previous" TEXT,
    "status" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "last_updated" TEXT NOT NULL,
    "data_status" TEXT,
    "surprise" TEXT,
    "change" TEXT,
    "confidence" INTEGER,
    "freshness" TEXT,
    "market_reaction" TEXT,
    "fundamental_implication" TEXT,
    "actual_market_reaction" TEXT,

    CONSTRAINT "EconomicEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketTheme" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sentiment" TEXT NOT NULL,
    "primary_assets" TEXT,
    "evidence_events" TEXT,
    "active_since" TEXT,

    CONSTRAINT "MarketTheme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIAnalysis" (
    "id" TEXT NOT NULL,
    "event_id" TEXT,
    "analysis_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "context_data_used" TEXT NOT NULL,
    "key_implications" TEXT NOT NULL,
    "affected_assets_outlook" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL,
    "disclaimer" TEXT NOT NULL,
    "created_at" TEXT NOT NULL,
    "is_insufficient_data" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AIAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailySnapshot" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "timestamp" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "market_biases" TEXT NOT NULL,
    "currency_strength" TEXT NOT NULL,
    "major_catalysts" TEXT NOT NULL,
    "market_reaction_summary" TEXT NOT NULL,
    "ai_summary" TEXT NOT NULL,
    "ai_why" TEXT NOT NULL,
    "ai_risk" TEXT NOT NULL,
    "ai_context" TEXT NOT NULL,
    "historical_insights" TEXT NOT NULL,
    "created_at" TEXT NOT NULL,

    CONSTRAINT "DailySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE INDEX "VerificationToken_email_idx" ON "VerificationToken"("email");

-- CreateIndex
CREATE INDEX "UserWatchlist_user_id_idx" ON "UserWatchlist"("user_id");

-- CreateIndex
CREATE INDEX "UserAlert_user_id_idx" ON "UserAlert"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramChannel_handle_key" ON "TelegramChannel"("handle");

-- CreateIndex
CREATE INDEX "NewsItem_event_id_idx" ON "NewsItem"("event_id");

-- CreateIndex
CREATE INDEX "NewsItem_source_id_idx" ON "NewsItem"("source_id");

-- CreateIndex
CREATE INDEX "EventSource_event_id_idx" ON "EventSource"("event_id");

-- CreateIndex
CREATE INDEX "EventAsset_event_id_idx" ON "EventAsset"("event_id");

-- CreateIndex
CREATE INDEX "EventCurrency_event_id_idx" ON "EventCurrency"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "MarketPrice_symbol_key" ON "MarketPrice"("symbol");

-- CreateIndex
CREATE INDEX "CurrencyStrengthHistory_currency_idx" ON "CurrencyStrengthHistory"("currency");

-- CreateIndex
CREATE INDEX "CurrencyStrengthHistory_timestamp_idx" ON "CurrencyStrengthHistory"("timestamp");

-- CreateIndex
CREATE INDEX "EconomicEvent_date_time_utc_idx" ON "EconomicEvent"("date_time_utc");

-- CreateIndex
CREATE INDEX "AIAnalysis_event_id_idx" ON "AIAnalysis"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "DailySnapshot_date_key" ON "DailySnapshot"("date");

-- AddForeignKey
ALTER TABLE "VerificationToken" ADD CONSTRAINT "VerificationToken_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreferences" ADD CONSTRAINT "UserPreferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserWatchlist" ADD CONSTRAINT "UserWatchlist_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAlert" ADD CONSTRAINT "UserAlert_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramChannel" ADD CONSTRAINT "TelegramChannel_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsItem" ADD CONSTRAINT "NewsItem_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsItem" ADD CONSTRAINT "NewsItem_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "MarketEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventSource" ADD CONSTRAINT "EventSource_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "MarketEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventSource" ADD CONSTRAINT "EventSource_news_id_fkey" FOREIGN KEY ("news_id") REFERENCES "NewsItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIAnalysis" ADD CONSTRAINT "AIAnalysis_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "MarketEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

