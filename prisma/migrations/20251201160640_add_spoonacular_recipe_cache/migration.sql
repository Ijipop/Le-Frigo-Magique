-- CreateTable
CREATE TABLE "SpoonacularRecipeCache" (
    "id" SERIAL NOT NULL,
    "recipeId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "ingredientsJson" TEXT NOT NULL,
    "servings" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpoonacularRecipeCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SpoonacularRecipeCache_recipeId_key" ON "SpoonacularRecipeCache"("recipeId");

-- CreateIndex
CREATE INDEX "SpoonacularRecipeCache_recipeId_idx" ON "SpoonacularRecipeCache"("recipeId");
