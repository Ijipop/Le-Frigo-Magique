// Script de migration avec gestion d'erreur améliorée et vérification préalable
const { execSync } = require('child_process');

function getDirectConnectionUrl() {
  const dbUrl = process.env.DATABASE_URL || '';
  
  // Si l'URL contient -pooler, la remplacer par une connexion directe
  if (dbUrl.includes('-pooler')) {
    const directUrl = dbUrl.replace('-pooler', '');
    console.log('🔄 Remplacement de -pooler par une connexion directe');
    return directUrl;
  }
  
  // Si DATABASE_URL_DIRECT est défini, l'utiliser
  if (process.env.DATABASE_URL_DIRECT) {
    console.log('✅ Utilisation de DATABASE_URL_DIRECT');
    return process.env.DATABASE_URL_DIRECT;
  }
  
  return dbUrl;
}

function checkMigrationsStatus() {
  try {
    const directUrl = getDirectConnectionUrl();
    const env = { 
      ...process.env, 
      DATABASE_URL: directUrl 
    };
    
    // Vérifier le statut des migrations
    const output = execSync('npx prisma migrate status', {
      encoding: 'utf-8',
      env: env,
      timeout: 30000
    });
    
    // Si toutes les migrations sont appliquées, on peut skip
    if (output.includes('Database schema is up to date') || 
        output.includes('All migrations have been applied')) {
      console.log('✅ Toutes les migrations sont déjà appliquées');
      return true;
    }
    
    return false;
  } catch (error) {
    // Si la vérification échoue, on continue quand même
    console.log('⚠️ Impossible de vérifier le statut des migrations, continuation...');
    return false;
  }
}

async function runMigration() {
  const directUrl = getDirectConnectionUrl();
  console.log('🔗 Connexion directe configurée');
  
  // Vérifier si les migrations sont déjà appliquées
  if (checkMigrationsStatus()) {
    console.log('✅ Aucune migration à appliquer');
    process.exit(0);
  }
  
  try {
    console.log('🔄 Application des migrations...');
    
    const env = { 
      ...process.env, 
      DATABASE_URL: directUrl 
    };
    
    // Utiliser migrate deploy avec timeout augmenté
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      env: env,
      timeout: 120000 // 120 secondes
    });
    
    console.log('✅ Migration réussie!');
    process.exit(0);
  } catch (error) {
    const errorOutput = error.stdout?.toString() || error.stderr?.toString() || error.message || '';
    
    // Vérifier différents cas d'erreur
    if (errorOutput.includes('already applied') || 
        errorOutput.includes('No pending migrations') ||
        errorOutput.includes('Database schema is up to date')) {
      console.log('✅ Migrations déjà appliquées (détecté après erreur)');
      process.exit(0);
    }
    
    if (errorOutput.includes('advisory lock') || errorOutput.includes('P1002')) {
      console.error('❌ Timeout de verrou PostgreSQL');
      console.error('');
      console.error('💡 Solutions:');
      console.error('   1. Vérifiez que DATABASE_URL_DIRECT est configuré sur Vercel');
      console.error('   2. Utilisez une URL sans -pooler pour les migrations');
      console.error('   3. Attendez quelques minutes et redéployez');
    } else {
      console.error('❌ Erreur de migration:', errorOutput.substring(0, 500));
    }
    
    process.exit(1);
  }
}

runMigration();

