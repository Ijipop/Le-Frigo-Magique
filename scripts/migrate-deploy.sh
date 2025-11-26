#!/bin/bash
# Script de migration avec retry pour Neon/PostgreSQL

MAX_RETRIES=3
RETRY_DELAY=5

for i in $(seq 1 $MAX_RETRIES); do
  echo "🔄 Tentative de migration $i/$MAX_RETRIES..."
  
  # Utiliser DATABASE_URL_DIRECT si disponible (connexion directe pour migrations)
  if [ -n "$DATABASE_URL_DIRECT" ]; then
    DATABASE_URL=$DATABASE_URL_DIRECT npx prisma migrate deploy
  else
    npx prisma migrate deploy
  fi
  
  EXIT_CODE=$?
  
  if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ Migration réussie!"
    exit 0
  fi
  
  if [ $i -lt $MAX_RETRIES ]; then
    echo "⏳ Attente de ${RETRY_DELAY}s avant de réessayer..."
    sleep $RETRY_DELAY
  fi
done

echo "❌ Migration échouée après $MAX_RETRIES tentatives"
exit 1

