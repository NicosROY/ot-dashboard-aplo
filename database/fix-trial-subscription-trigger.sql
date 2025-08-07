-- Script pour corriger la fonction create_trial_subscription
-- À exécuter dans Supabase SQL Editor

-- 1. Désactiver temporairement le trigger
DROP TRIGGER IF EXISTS trigger_create_trial_subscription ON user_profiles;

-- 2. Corriger la fonction pour faire une jointure avec communes
CREATE OR REPLACE FUNCTION create_trial_subscription()
RETURNS TRIGGER AS $$
DECLARE
    commune_population INTEGER;
BEGIN
    -- Récupérer la population de la commune via jointure
    SELECT population INTO commune_population
    FROM communes 
    WHERE id = NEW.commune_id;
    
    -- Si pas de population trouvée, utiliser une valeur par défaut
    IF commune_population IS NULL THEN
        commune_population := 5000; -- Valeur par défaut pour petite commune
    END IF;
    
    INSERT INTO subscriptions (
        commune_id,
        status,
        plan_type,
        amount_monthly,
        trial_start,
        trial_end
    ) VALUES (
        NEW.commune_id,
        'trial',
        CASE WHEN commune_population < 10000 THEN 'small' ELSE 'large' END,
        CASE WHEN commune_population < 10000 THEN 79.00 ELSE 149.00 END,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP + INTERVAL '7 days'
    );
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- En cas d'erreur, on log mais on ne bloque pas la creation du profil
        RAISE WARNING 'Erreur lors de la creation de l''abonnement d''essai: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Recréer le trigger
CREATE TRIGGER trigger_create_trial_subscription
    AFTER INSERT ON user_profiles
    FOR EACH ROW 
    WHEN (NEW.commune_id IS NOT NULL)
    EXECUTE FUNCTION create_trial_subscription();

-- 4. Vérifier que la fonction est corrigée
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'create_trial_subscription';

-- 5. Message de confirmation
SELECT 'Trigger create_trial_subscription corrigé avec succès' as status; 