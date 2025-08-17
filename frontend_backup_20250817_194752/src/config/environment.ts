// Configuration de l'environnement
export const config = {
  // URL du backend
  backendUrl: process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001',
  
  // Clé publique Stripe
  stripePublishableKey: process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || 'pk_test_51Rl4vLQD7xuAt5fNHa8nNM4SHr0A9S9uSsDZga3adojFEDRoxJUaRr9RoI7Bs2LSxcKatVQGFSowpyAboyhK12qm00GH970U8K',
  
  // Configuration Supabase
  supabaseUrl: process.env.REACT_APP_SUPABASE_URL || 'https://idjcdrvevyszodiwlgnc.supabase.co',
  supabaseAnonKey: process.env.REACT_APP_SUPABASE_ANON_KEY || '',
  
  // Mode de développement
  isDevelopment: process.env.NODE_ENV === 'development',
}; 