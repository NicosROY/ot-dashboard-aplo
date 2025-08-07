-- Script pour désactiver temporairement le trigger on_auth_user_created
-- À exécuter dans Supabase SQL Editor

-- 1. Désactiver le trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;

-- 2. Vérifier que le trigger est bien supprimé
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- 3. Message de confirmation
SELECT 'Trigger on_auth_user_created désactivé avec succès' as status;

-- Note: Pour réactiver le trigger plus tard, exécutez:
-- CREATE TRIGGER on_auth_user_created
--     AFTER INSERT ON auth.users
--     FOR EACH ROW EXECUTE FUNCTION handle_new_user(); 