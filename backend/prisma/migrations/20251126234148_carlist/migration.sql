-- CreateEnum
CREATE TYPE "ListingSource" AS ENUM ('CARS_COM', 'AUTOTRADER', 'CARGURUS', 'CRAIGSLIST', 'FACEBOOK', 'CARFAX', 'CARVANA', 'VROOM', 'DEALER_SITE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('ACTIVE', 'PENDING', 'SOLD', 'REMOVED', 'RELISTED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "SellerType" AS ENUM ('DEALER', 'PRIVATE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "TriggerSource" AS ENUM ('EXTENSION_REFRESH', 'EMAIL_ALERT', 'HEAD_CHECK', 'CROWD_REFRESH');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('PRICE_DROP', 'PRICE_RISE', 'STATUS_CHANGE', 'RELIST_DETECTED', 'TARGET_PRICE_HIT');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'PUSH', 'IN_APP');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "name" TEXT,
    "avatarUrl" TEXT,
    "googleId" TEXT,
    "googleAccessToken" TEXT,
    "googleRefreshToken" TEXT,
    "gmailConnected" BOOLEAN NOT NULL DEFAULT false,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "pushNotifications" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "vin" TEXT,
    "fingerprint" TEXT,
    "year" INTEGER,
    "make" TEXT,
    "model" TEXT,
    "trim" TEXT,
    "exteriorColor" TEXT,
    "interiorColor" TEXT,
    "bodyStyle" TEXT,
    "transmission" TEXT,
    "drivetrain" TEXT,
    "fuelType" TEXT,
    "engine" TEXT,
    "currentPrice" INTEGER,
    "currentMileage" INTEGER,
    "currentStatus" "ListingStatus" NOT NULL DEFAULT 'ACTIVE',
    "lowestPrice" INTEGER,
    "highestPrice" INTEGER,
    "priceDropCount" INTEGER NOT NULL DEFAULT 0,
    "sellerName" TEXT,
    "sellerType" "SellerType" NOT NULL DEFAULT 'UNKNOWN',
    "sellerLocation" TEXT,
    "sellerPhone" TEXT,
    "primaryPhotoUrl" TEXT,
    "photoUrls" TEXT[],
    "photoHashes" TEXT[],
    "sources" "ListingSource"[],
    "sourceUrls" TEXT[],
    "lastCheckedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleSnapshot" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "capturedById" TEXT NOT NULL,
    "price" INTEGER,
    "mileage" INTEGER,
    "status" "ListingStatus" NOT NULL DEFAULT 'ACTIVE',
    "sourceUrl" TEXT NOT NULL,
    "source" "ListingSource" NOT NULL,
    "rawData" JSONB,

    CONSTRAINT "VehicleSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WatchlistEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "priceWhenAdded" INTEGER,
    "notes" TEXT,
    "tags" TEXT[],
    "notifyPriceDrop" BOOLEAN NOT NULL DEFAULT true,
    "notifyPriceRise" BOOLEAN NOT NULL DEFAULT false,
    "notifyStatusChange" BOOLEAN NOT NULL DEFAULT true,
    "notifyRelist" BOOLEAN NOT NULL DEFAULT true,
    "priceDropThreshold" INTEGER,
    "targetPrice" INTEGER,
    "lastNotifiedAt" TIMESTAMP(3),
    "lastViewedAt" TIMESTAMP(3),

    CONSTRAINT "WatchlistEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceChange" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "previousPrice" INTEGER NOT NULL,
    "newPrice" INTEGER NOT NULL,
    "changeAmount" INTEGER NOT NULL,
    "changePercent" DOUBLE PRECISION NOT NULL,
    "triggeredBy" "TriggerSource" NOT NULL,
    "triggeredByUserId" TEXT,

    CONSTRAINT "PriceChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatusChange" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "previousStatus" "ListingStatus" NOT NULL,
    "newStatus" "ListingStatus" NOT NULL,
    "triggeredBy" "TriggerSource" NOT NULL,
    "triggeredByUserId" TEXT,

    CONSTRAINT "StatusChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "priceChangeId" TEXT,
    "statusChangeId" TEXT,
    "channel" "NotificationChannel" NOT NULL,
    "sentAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParsedEmail" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gmailMessageId" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "fromAddress" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "vehicleId" TEXT,
    "priceChange" INTEGER,
    "statusChange" "ListingStatus",
    "listingUrl" TEXT,
    "parsed" BOOLEAN NOT NULL DEFAULT false,
    "parsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParsedEmail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HeadCheckJob" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "executedAt" TIMESTAMP(3),
    "httpStatus" INTEGER,
    "isAlive" BOOLEAN,
    "redirectUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HeadCheckJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_googleId_idx" ON "User"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_vin_key" ON "Vehicle"("vin");

-- CreateIndex
CREATE INDEX "Vehicle_vin_idx" ON "Vehicle"("vin");

-- CreateIndex
CREATE INDEX "Vehicle_fingerprint_idx" ON "Vehicle"("fingerprint");

-- CreateIndex
CREATE INDEX "Vehicle_make_model_year_idx" ON "Vehicle"("make", "model", "year");

-- CreateIndex
CREATE INDEX "Vehicle_currentPrice_idx" ON "Vehicle"("currentPrice");

-- CreateIndex
CREATE INDEX "Vehicle_lastCheckedAt_idx" ON "Vehicle"("lastCheckedAt");

-- CreateIndex
CREATE INDEX "VehicleSnapshot_vehicleId_idx" ON "VehicleSnapshot"("vehicleId");

-- CreateIndex
CREATE INDEX "VehicleSnapshot_capturedAt_idx" ON "VehicleSnapshot"("capturedAt");

-- CreateIndex
CREATE INDEX "VehicleSnapshot_capturedById_idx" ON "VehicleSnapshot"("capturedById");

-- CreateIndex
CREATE INDEX "WatchlistEntry_userId_idx" ON "WatchlistEntry"("userId");

-- CreateIndex
CREATE INDEX "WatchlistEntry_vehicleId_idx" ON "WatchlistEntry"("vehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "WatchlistEntry_userId_vehicleId_key" ON "WatchlistEntry"("userId", "vehicleId");

-- CreateIndex
CREATE INDEX "PriceChange_vehicleId_idx" ON "PriceChange"("vehicleId");

-- CreateIndex
CREATE INDEX "PriceChange_detectedAt_idx" ON "PriceChange"("detectedAt");

-- CreateIndex
CREATE INDEX "StatusChange_vehicleId_idx" ON "StatusChange"("vehicleId");

-- CreateIndex
CREATE INDEX "StatusChange_detectedAt_idx" ON "StatusChange"("detectedAt");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_vehicleId_idx" ON "Notification"("vehicleId");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_readAt_idx" ON "Notification"("readAt");

-- CreateIndex
CREATE UNIQUE INDEX "ParsedEmail_gmailMessageId_key" ON "ParsedEmail"("gmailMessageId");

-- CreateIndex
CREATE INDEX "ParsedEmail_userId_idx" ON "ParsedEmail"("userId");

-- CreateIndex
CREATE INDEX "ParsedEmail_gmailMessageId_idx" ON "ParsedEmail"("gmailMessageId");

-- CreateIndex
CREATE INDEX "ParsedEmail_receivedAt_idx" ON "ParsedEmail"("receivedAt");

-- CreateIndex
CREATE INDEX "HeadCheckJob_scheduledAt_idx" ON "HeadCheckJob"("scheduledAt");

-- CreateIndex
CREATE INDEX "HeadCheckJob_vehicleId_idx" ON "HeadCheckJob"("vehicleId");

-- AddForeignKey
ALTER TABLE "VehicleSnapshot" ADD CONSTRAINT "VehicleSnapshot_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleSnapshot" ADD CONSTRAINT "VehicleSnapshot_capturedById_fkey" FOREIGN KEY ("capturedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchlistEntry" ADD CONSTRAINT "WatchlistEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchlistEntry" ADD CONSTRAINT "WatchlistEntry_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceChange" ADD CONSTRAINT "PriceChange_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusChange" ADD CONSTRAINT "StatusChange_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
