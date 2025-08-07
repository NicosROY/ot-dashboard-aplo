const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase
const supabaseUrl = 'https://idjcdrvevyszodiwlgnc.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // À configurer

if (!supabaseServiceKey) {
  console.error('❌ Erreur: SUPABASE_SERVICE_ROLE_KEY manquante');
  console.log('📝 Pour obtenir votre clé service:');
  console.log('1. Allez dans votre projet Supabase');
  console.log('2. Settings → API');
  console.log('3. Copiez la "service_role" key');
  console.log('4. Ajoutez-la à votre .env: SUPABASE_SERVICE_ROLE_KEY=votre_clé');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createRealUser(email, password, firstName, lastName, role = 'user', communeId = null) {
  try {
    console.log(`🔧 Création de l'utilisateur: ${email}`);
    
    // 1. Créer l'utilisateur dans Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        role: role
      }
    });

    if (authError) {
      console.error(`❌ Erreur Auth: ${authError.message}`);
      return false;
    }

    // 2. Créer le profil utilisateur dans la table user_profiles
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: authData.user.id,
        email: email,
        first_name: firstName,
        last_name: lastName,
        role: role,
        commune_id: communeId,
        created_at: new Date().toISOString()
      });

    if (profileError) {
      console.error(`❌ Erreur Profil: ${profileError.message}`);
      return false;
    }

    console.log(`✅ Utilisateur créé avec succès: ${email}`);
    return true;
  } catch (error) {
    console.error(`❌ Erreur: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🚀 Création d\'utilisateurs réels pour le Dashboard OT\n');
  
  // Exemple de création d'utilisateurs réels
  const users = [
    {
      email: 'admin@votre-ot.fr',
      password: 'MotDePasseSecurise123!',
      firstName: 'Admin',
      lastName: 'Principal',
      role: 'admin'
    },
    {
      email: 'manager@votre-ot.fr',
      password: 'MotDePasseSecurise123!',
      firstName: 'Manager',
      lastName: 'Événements',
      role: 'admin'
    },
    {
      email: 'user@votre-ot.fr',
      password: 'MotDePasseSecurise123!',
      firstName: 'Utilisateur',
      lastName: 'Standard',
      role: 'user'
    }
  ];

  let successCount = 0;
  let errorCount = 0;

  for (const user of users) {
    const success = await createRealUser(
      user.email,
      user.password,
      user.firstName,
      user.lastName,
      user.role
    );
    
    if (success) {
      successCount++;
    } else {
      errorCount++;
    }
    
    console.log(''); // Ligne vide pour la lisibilité
  }

  console.log('📊 Résumé:');
  console.log(`✅ Utilisateurs créés: ${successCount}`);
  console.log(`❌ Erreurs: ${errorCount}`);
  
  if (successCount > 0) {
    console.log('\n🎉 Utilisateurs créés avec succès !');
    console.log('📝 Vous pouvez maintenant vous connecter avec ces comptes.');
  }
}

// Instructions d'utilisation
console.log('📋 INSTRUCTIONS:');
console.log('1. Configurez votre clé service Supabase dans .env');
console.log('2. Modifiez les emails et mots de passe dans ce script');
console.log('3. Exécutez: node create-real-users.js');
console.log('');

// Vérifier si on a la clé service
if (!supabaseServiceKey) {
  console.log('⚠️  Clé service manquante. Arrêt du script.');
  process.exit(1);
}

// Lancer le script
main().catch(console.error); 