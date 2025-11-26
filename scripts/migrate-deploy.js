// Script de migration avec retry pour Neon/PostgreSQL (version Node.js)
const { execSync } = require('child_process');

const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 secondes

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getDirectConnectionUrl() {
  // Pour Neon, utiliser la connexion directe (sans -pooler) pour les migrations
  const dbUrl = process.env.DATABASE_URL || '';
  
  // Si l'URL contient -pooler, la remplacer par une connexion directe
  if (dbUrl.includes('-pooler')) {
    return dbUrl.replace('-pooler', '');
  }
  
  // Si DATABASE_URL_DIRECT est défini, l'utiliser
  if (process.env.DATABASE_URL_DIRECT) {
    return process.env.DATABASE_URL_DIRECT;
  }
  
  return dbUrl;
}

async function runMigration() {
  const directUrl = getDirectConnectionUrl();
  console.log('🔗 Utilisation de la connexion directe pour les migrations');
  console.log('🔗 URL:', directUrl.replace(/:[^:@]+@/, ':****@')); // Masquer le mot de passe
  
  for (let i = 1; i <= MAX_RETRIES; i++) {
    try {
      console.log(`🔄 Tentative de migration ${i}/${MAX_RETRIES}...`);
      
      const env = { 
        ...process.env, 
        DATABASE_URL: directUrl,
        // Augmenter le timeout pour Prisma (en millisecondes)
        PRISMA_MIGRATE_LOCK_TIMEOUT: '30000' // 30 secondes
      };
      
      // Utiliser --skip-seed pour éviter les problèmes supplémentaires
      execSync('npx prisma migrate deploy --skip-seed', {
        stdio: 'inherit',
        env: env,
        timeout: 90000 // 90 secondes de timeout pour la commande complète
      });
      
      console.log('✅ Migration réussie!');
      process.exit(0);
    } catch (error) {
      const errorMsg = error.message || String(error);
      const errorOutput = error.stdout?.toString() || error.stderr?.toString() || '';
      
      // Vérifier si les migrations sont déjà appliquées
      if (errorOutput.includes('already applied') || errorOutput.includes('No pending migrations')) {
        console.log('✅ Toutes les migrations sont déjà appliquées');
        process.exit(0);
      }
      
      // Vérifier si c'est un timeout de verrou
      if (errorOutput.includes('advisory lock') || errorOutput.includes('P1002')) {
        console.error(`❌ Timeout de verrou PostgreSQL (tentative ${i}/${MAX_RETRIES})`);
        console.error('💡 Cela peut arriver si une autre migration est en cours');
      } else {
        console.error(`❌ Erreur lors de la migration (tentative ${i}/${MAX_RETRIES})`);
      }
      
      if (i < MAX_RETRIES) {
        const delay = RETRY_DELAY * i; // Délai progressif
        console.log(`⏳ Attente de ${delay / 1000}s avant de réessayer...`);
        await sleep(delay);
      } else {
        console.error('❌ Migration échouée après', MAX_RETRIES, 'tentatives');
        console.error('');
        console.error('💡 Solutions possibles:');
        console.error('   1. Vérifiez que votre DATABASE_URL utilise une connexion directe (sans -pooler)');
        console.error('   2. Ajoutez DATABASE_URL_DIRECT sur Vercel avec votre URL sans -pooler');
        console.error('   3. Attendez quelques minutes et réessayez (une autre migration peut être en cours)');
        console.error('   4. Vérifiez que votre base de données Neon est accessible');
        process.exit(1);
      }
    }
  }
}

runMigration();

