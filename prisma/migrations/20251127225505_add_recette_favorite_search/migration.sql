-- CreateTable
CREATE TABLE "RecetteFavoriteSearch" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "image" TEXT,
    "snippet" TEXT,
    "source" TEXT,
    "estimatedCost" DOUBLE PRECISION,
    "servings" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecetteFavoriteSearch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecetteFavoriteSearch_utilisateurId_idx" ON "RecetteFavoriteSearch"("utilisateurId");

-- CreateIndex
CREATE UNIQUE INDEX "RecetteFavoriteSearch_utilisateurId_url_key" ON "RecetteFavoriteSearch"("utilisateurId", "url");

-- AddForeignKey
ALTER TABLE "RecetteFavoriteSearch" ADD CONSTRAINT "RecetteFavoriteSearch_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
