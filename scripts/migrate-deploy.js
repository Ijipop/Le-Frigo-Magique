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
  
  for (let i = 1; i <= MAX_RETRIES; i++) {
    try {
      console.log(`🔄 Tentative de migration ${i}/${MAX_RETRIES}...`);
      
      const env = { 
        ...process.env, 
        DATABASE_URL: directUrl 
      };
      
      execSync('npx prisma migrate deploy', {
        stdio: 'inherit',
        env: env,
        timeout: 60000 // 60 secondes de timeout
      });
      
      console.log('✅ Migration réussie!');
      process.exit(0);
    } catch (error) {
      const errorMsg = error.message || String(error);
      console.error(`❌ Erreur lors de la migration (tentative ${i}/${MAX_RETRIES})`);
      
      if (i < MAX_RETRIES) {
        console.log(`⏳ Attente de ${RETRY_DELAY / 1000}s avant de réessayer...`);
        await sleep(RETRY_DELAY);
      } else {
        console.error('❌ Migration échouée après', MAX_RETRIES, 'tentatives');
        console.error('💡 Astuce: Vérifiez que votre DATABASE_URL utilise une connexion directe (sans -pooler) pour les migrations');
        process.exit(1);
      }
    }
  }
}

runMigration();

