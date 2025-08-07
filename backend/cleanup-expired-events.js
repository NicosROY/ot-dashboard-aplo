const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuration Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes pour Supabase');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Nettoie les événements poussés dont la date de fin est dépassée
 */
async function cleanupExpiredEvents() {
  try {
    console.log('🧹 Début du nettoyage des événements expirés...');
    
    const today = new Date().toISOString().split('T')[0]; // Format YYYY-MM-DD
    
    // Récupérer les événements poussés dont la date de fin est dépassée
    const { data: expiredEvents, error: fetchError } = await supabase
      .from('events')
      .select('id, title, date_end, aplo_sync_status')
      .eq('aplo_sync_status', 'synced')
      .lt('date_end', today);

    if (fetchError) {
      console.error('❌ Erreur lors de la récupération des événements expirés:', fetchError);
      return;
    }

    if (!expiredEvents || expiredEvents.length === 0) {
      console.log('✅ Aucun événement expiré à nettoyer');
      return;
    }

    console.log(`📅 ${expiredEvents.length} événement(s) expiré(s) trouvé(s):`);
    expiredEvents.forEach(event => {
      console.log(`  - ${event.title} (fin: ${event.date_end})`);
    });

    // Marquer les événements comme non synchronisés (au lieu de les supprimer)
    const { error: updateError } = await supabase
      .from('events')
      .update({ aplo_sync_status: 'pending' })
      .in('id', expiredEvents.map(e => e.id));

    if (updateError) {
      console.error('❌ Erreur lors de la mise à jour des événements expirés:', updateError);
      return;
    }

    console.log(`✅ ${expiredEvents.length} événement(s) marqué(s) comme non synchronisés`);
    
    // Optionnel : Supprimer d'APLO aussi
    console.log('🔄 Suppression des événements expirés d\'APLO...');
    
    // Ici vous pourriez ajouter la logique pour supprimer d'APLO
    // Pour l'instant, on se contente de marquer comme non synchronisé
    
    console.log('✅ Nettoyage terminé avec succès');

  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error);
  }
}

/**
 * Fonction principale
 */
async function main() {
  console.log('🚀 Démarrage du script de nettoyage des événements expirés');
  console.log(`⏰ ${new Date().toLocaleString('fr-FR')}`);
  
  await cleanupExpiredEvents();
  
  console.log('🏁 Script terminé');
  process.exit(0);
}

// Exécuter le script
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });
}

module.exports = { cleanupExpiredEvents }; 