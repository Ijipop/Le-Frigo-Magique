-- AlterTable
ALTER TABLE "RecetteSemaine" ADD COLUMN     "spoonacularId" INTEGER;

-- CreateIndex
CREATE INDEX "RecetteSemaine_spoonacularId_idx" ON "RecetteSemaine"("spoonacularId");
