-- Drop existing indexes
DROP INDEX IF EXISTS "SpoonacularRecipeCache_recipeId_idx";
DROP INDEX IF EXISTS "SpoonacularRecipeCache_recipeId_key";

-- Add new json column
ALTER TABLE "SpoonacularRecipeCache" ADD COLUMN IF NOT EXISTS "json" JSONB;

-- Migrate existing data to json format (if any exists)
UPDATE "SpoonacularRecipeCache"
SET "json" = jsonb_build_object(
  'id', "recipeId",
  'title', "title",
  'extendedIngredients', "ingredientsJson"::jsonb,
  'servings', "servings"
)
WHERE "json" IS NULL;

-- Rename recipeId to spoonacularId
ALTER TABLE "SpoonacularRecipeCache" RENAME COLUMN "recipeId" TO "spoonacularId";

-- Make json column NOT NULL
ALTER TABLE "SpoonacularRecipeCache" ALTER COLUMN "json" SET NOT NULL;

-- Drop old columns
ALTER TABLE "SpoonacularRecipeCache" DROP COLUMN IF EXISTS "title";
ALTER TABLE "SpoonacularRecipeCache" DROP COLUMN IF EXISTS "ingredientsJson";
ALTER TABLE "SpoonacularRecipeCache" DROP COLUMN IF EXISTS "servings";

-- Create new unique index on spoonacularId
CREATE UNIQUE INDEX IF NOT EXISTS "SpoonacularRecipeCache_spoonacularId_key" ON "SpoonacularRecipeCache"("spoonacularId");

-- Create new index on spoonacularId
CREATE INDEX IF NOT EXISTS "SpoonacularRecipeCache_spoonacularId_idx" ON "SpoonacularRecipeCache"("spoonacularId");

