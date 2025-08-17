-- Script pour vérifier tous les triggers existants
-- À exécuter dans Supabase SQL Editor

-- 1. Vérifier les triggers sur auth.users
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'users' 
AND event_object_schema = 'auth';

-- 2. Vérifier les triggers sur user_profiles
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'user_profiles' 
AND event_object_schema = 'public';

-- 3. Vérifier toutes les fonctions qui contiennent "user" dans le nom
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name LIKE '%user%' 
AND routine_schema = 'public';

-- 4. Vérifier spécifiquement la fonction handle_new_user si elle existe
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user'; 