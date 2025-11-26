-- CreateTable
CREATE TABLE "RecetteSemaine" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "image" TEXT,
    "snippet" TEXT,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecetteSemaine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecetteSemaine_utilisateurId_idx" ON "RecetteSemaine"("utilisateurId");

-- AddForeignKey
ALTER TABLE "RecetteSemaine" ADD CONSTRAINT "RecetteSemaine_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
