-- CreateTable
CREATE TABLE "Utilisateur" (
    "id" TEXT NOT NULL,
    "authUserId" TEXT,
    "email" TEXT NOT NULL,
    "nom" TEXT,
    "nbPersonnes" INTEGER,
    "budgetHebdomadaire" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Utilisateur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Preferences" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "vegetarien" BOOLEAN NOT NULL DEFAULT false,
    "sansGluten" BOOLEAN NOT NULL DEFAULT false,
    "allergenes" TEXT,
    "cuisinesFavorites" TEXT,

    CONSTRAINT "Preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleGardeManger" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "quantite" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unite" TEXT,

    CONSTRAINT "ArticleGardeManger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecetteReference" (
    "id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "imageUrl" TEXT,
    "tempsPreparation" INTEGER,
    "tempsCuisson" INTEGER,

    CONSTRAINT "RecetteReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ValeursNutritives" (
    "id" TEXT NOT NULL,
    "recetteId" TEXT NOT NULL,
    "calories" INTEGER,
    "proteines" DOUBLE PRECISION,
    "glucides" DOUBLE PRECISION,
    "lipides" DOUBLE PRECISION,

    CONSTRAINT "ValeursNutritives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepasSemaine" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "semaine" INTEGER NOT NULL,
    "annee" INTEGER NOT NULL,

    CONSTRAINT "RepasSemaine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Repas" (
    "id" TEXT NOT NULL,
    "repasSemaineId" TEXT NOT NULL,
    "jour" INTEGER NOT NULL,
    "moment" TEXT NOT NULL,
    "recetteId" TEXT,

    CONSTRAINT "Repas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListeEpicerie" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "semaine" INTEGER,
    "annee" INTEGER,
    "coutTotal" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListeEpicerie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LigneListe" (
    "id" TEXT NOT NULL,
    "listeId" TEXT NOT NULL,
    "itemId" TEXT,
    "nom" TEXT NOT NULL,
    "quantite" DOUBLE PRECISION NOT NULL,
    "unite" TEXT,
    "prixEstime" DOUBLE PRECISION,

    CONSTRAINT "LigneListe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "categorie" TEXT,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecetteFavorite" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "recetteId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecetteFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_authUserId_key" ON "Utilisateur"("authUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_email_key" ON "Utilisateur"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Preferences_utilisateurId_key" ON "Preferences"("utilisateurId");

-- CreateIndex
CREATE UNIQUE INDEX "ValeursNutritives_recetteId_key" ON "ValeursNutritives"("recetteId");

-- CreateIndex
CREATE UNIQUE INDEX "RecetteFavorite_utilisateurId_recetteId_key" ON "RecetteFavorite"("utilisateurId", "recetteId");

-- AddForeignKey
ALTER TABLE "Preferences" ADD CONSTRAINT "Preferences_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleGardeManger" ADD CONSTRAINT "ArticleGardeManger_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValeursNutritives" ADD CONSTRAINT "ValeursNutritives_recetteId_fkey" FOREIGN KEY ("recetteId") REFERENCES "RecetteReference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepasSemaine" ADD CONSTRAINT "RepasSemaine_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Repas" ADD CONSTRAINT "Repas_repasSemaineId_fkey" FOREIGN KEY ("repasSemaineId") REFERENCES "RepasSemaine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Repas" ADD CONSTRAINT "Repas_recetteId_fkey" FOREIGN KEY ("recetteId") REFERENCES "RecetteReference"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListeEpicerie" ADD CONSTRAINT "ListeEpicerie_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LigneListe" ADD CONSTRAINT "LigneListe_listeId_fkey" FOREIGN KEY ("listeId") REFERENCES "ListeEpicerie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LigneListe" ADD CONSTRAINT "LigneListe_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecetteFavorite" ADD CONSTRAINT "RecetteFavorite_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecetteFavorite" ADD CONSTRAINT "RecetteFavorite_recetteId_fkey" FOREIGN KEY ("recetteId") REFERENCES "RecetteReference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
