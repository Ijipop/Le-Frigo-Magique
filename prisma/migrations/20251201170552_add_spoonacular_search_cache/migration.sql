-- CreateTable
CREATE TABLE "SpoonacularSearchCache" (
    "id" SERIAL NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "maxPrice" DOUBLE PRECISION NOT NULL,
    "typeRepas" TEXT,
    "allergies" TEXT NOT NULL,
    "maxResults" INTEGER NOT NULL,
    "resultsJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpoonacularSearchCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SpoonacularSearchCache_cacheKey_key" ON "SpoonacularSearchCache"("cacheKey");

-- CreateIndex
CREATE INDEX "SpoonacularSearchCache_maxPrice_idx" ON "SpoonacularSearchCache"("maxPrice");

-- CreateIndex
CREATE INDEX "SpoonacularSearchCache_typeRepas_idx" ON "SpoonacularSearchCache"("typeRepas");

-- CreateIndex
CREATE INDEX "SpoonacularSearchCache_cacheKey_idx" ON "SpoonacularSearchCache"("cacheKey");
