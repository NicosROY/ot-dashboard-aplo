require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes');
  console.log('SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTables() {
  try {
    console.log('🔍 Vérification des tables...');
    
    // Vérifier la table subscriptions
    const { data: subscriptionsData, error: subscriptionsError } = await supabase
      .from('subscriptions')
      .select('count')
      .limit(1);
    
    console.log('Table subscriptions:', subscriptionsError ? '❌ N\'existe pas' : '✅ Existe');
    if (subscriptionsError) {
      console.log('   Erreur:', subscriptionsError.message);
    }
    
    // Vérifier la table payments
    const { data: paymentsData, error: paymentsError } = await supabase
      .from('payments')
      .select('count')
      .limit(1);
    
    console.log('Table payments:', paymentsError ? '❌ N\'existe pas' : '✅ Existe');
    if (paymentsError) {
      console.log('   Erreur:', paymentsError.message);
    }
    
    // Vérifier la table kyc_documents
    const { data: kycData, error: kycError } = await supabase
      .from('kyc_documents')
      .select('count')
      .limit(1);
    
    console.log('Table kyc_documents:', kycError ? '❌ N\'existe pas' : '✅ Existe');
    if (kycError) {
      console.log('   Erreur:', kycError.message);
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

checkTables(); 