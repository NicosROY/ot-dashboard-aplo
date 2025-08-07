-- Script pour corriger les utilisateurs orphelins
-- À exécuter dans Supabase SQL Editor

-- 1. Vérifier les utilisateurs Auth sans profil
SELECT 
    au.id,
    au.email,
    au.created_at as auth_created_at
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.id
WHERE up.id IS NULL;

-- 2. Créer les profils manquants pour les utilisateurs Auth existants
INSERT INTO user_profiles (id, email, role, first_name, last_name, created_at)
SELECT 
    au.id,
    au.email,
    'user' as role,
    COALESCE(au.raw_user_meta_data->>'first_name', '') as first_name,
    COALESCE(au.raw_user_meta_data->>'last_name', '') as last_name,
    au.created_at
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.id
WHERE up.id IS NULL;

-- 3. Vérifier les profils sans utilisateur Auth (nettoyer)
SELECT 
    up.id,
    up.email,
    up.created_at as profile_created_at
FROM user_profiles up
LEFT JOIN auth.users au ON up.id = au.id
WHERE au.id IS NULL;

-- 4. Supprimer les profils orphelins (optionnel - décommentez si nécessaire)
-- DELETE FROM user_profiles 
-- WHERE id IN (
--     SELECT up.id
--     FROM user_profiles up
--     LEFT JOIN auth.users au ON up.id = au.id
--     WHERE au.id IS NULL
-- );

-- 5. Vérifier le résultat final
SELECT 
    'Auth Users' as source,
    COUNT(*) as count
FROM auth.users
UNION ALL
SELECT 
    'User Profiles' as source,
    COUNT(*) as count
FROM user_profiles;

-- 6. Vérifier la correspondance
SELECT 
    'Matching profiles' as status,
    COUNT(*) as count
FROM auth.users au
INNER JOIN user_profiles up ON au.id = up.id
UNION ALL
SELECT 
    'Auth without profile' as status,
    COUNT(*) as count
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.id
WHERE up.id IS NULL
UNION ALL
SELECT 
    'Profile without auth' as status,
    COUNT(*) as count
FROM user_profiles up
LEFT JOIN auth.users au ON up.id = au.id
WHERE au.id IS NULL; 