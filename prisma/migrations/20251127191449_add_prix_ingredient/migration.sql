-- CreateTable
CREATE TABLE "PrixIngredient" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prixMoyen" DOUBLE PRECISION NOT NULL,
    "categorie" TEXT,
    "source" TEXT NOT NULL DEFAULT 'flipp',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrixIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PrixIngredient_nom_key" ON "PrixIngredient"("nom");

-- CreateIndex
CREATE INDEX "PrixIngredient_nom_idx" ON "PrixIngredient"("nom");

-- CreateIndex
CREATE INDEX "PrixIngredient_categorie_idx" ON "PrixIngredient"("categorie");
