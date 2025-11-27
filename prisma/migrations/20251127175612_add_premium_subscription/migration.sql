-- AlterTable
ALTER TABLE "Preferences" ADD COLUMN     "isPremium" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "premiumUntil" TIMESTAMP(3);
