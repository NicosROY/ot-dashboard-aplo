-- Suppression du trigger create_trial_subscription
-- Ce trigger créait automatiquement des abonnements d'essai gratuits

-- 1. Supprimer le trigger
DROP TRIGGER IF EXISTS trigger_create_trial_subscription ON user_profiles;

-- 2. Supprimer la fonction associée
DROP FUNCTION IF EXISTS create_trial_subscription();

-- 3. Vérification que tout est supprimé
SELECT 'Trigger et fonction supprimés avec succès' as status; 