/*
  Warnings:

  - A unique constraint covering the columns `[stripeCustomerId]` on the table `Utilisateur` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripeSubId]` on the table `Utilisateur` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Preferences" ADD COLUMN     "isLifetimePremium" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "premiumSince" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Utilisateur" ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "stripePriceId" TEXT,
ADD COLUMN     "stripeSubId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_stripeCustomerId_key" ON "Utilisateur"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_stripeSubId_key" ON "Utilisateur"("stripeSubId");
