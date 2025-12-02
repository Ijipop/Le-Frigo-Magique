-- AlterTable
ALTER TABLE "LigneListe" ADD COLUMN     "recetteSemaineId" TEXT;

-- AddForeignKey
ALTER TABLE "LigneListe" ADD CONSTRAINT "LigneListe_recetteSemaineId_fkey" FOREIGN KEY ("recetteSemaineId") REFERENCES "RecetteSemaine"("id") ON DELETE SET NULL ON UPDATE CASCADE;
