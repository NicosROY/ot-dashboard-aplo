-- Script pour vérifier le statut d'onboarding d'un utilisateur
-- À exécuter dans Supabase SQL Editor

-- 1. Vérifier si l'utilisateur existe dans auth.users
SELECT 
    'Auth User' as source,
    id,
    email,
    created_at,
    raw_user_meta_data
FROM auth.users 
WHERE email = 'elibusinezz@gmail.com';

-- 2. Vérifier si l'utilisateur a un profil
SELECT 
    'User Profile' as source,
    id,
    email,
    role,
    first_name,
    last_name,
    commune_id,
    is_active,
    created_at
FROM user_profiles 
WHERE email = 'elibusinezz@gmail.com';

-- 3. Vérifier si l'utilisateur a un onboarding en cours
SELECT 
    'Onboarding Progress' as source,
    id,
    current_step,
    admin_info,
    commune_data,
    kyc_data,
    team_data,
    legal_data,
    subscription_data,
    created_at,
    updated_at
FROM onboarding_progress 
WHERE id = (
    SELECT id FROM auth.users WHERE email = 'elibusinezz@gmail.com'
);

-- 4. Résumé complet
SELECT 
    au.email,
    CASE 
        WHEN up.id IS NOT NULL THEN '✅ Profil créé'
        ELSE '❌ Pas de profil'
    END as profile_status,
    CASE 
        WHEN op.id IS NOT NULL THEN '🔄 Onboarding en cours (étape ' || op.current_step || ')'
        ELSE '✅ Pas d\'onboarding en cours'
    END as onboarding_status,
    CASE 
        WHEN up.is_active = true THEN '✅ Compte actif'
        WHEN up.is_active = false THEN '❌ Compte inactif'
        ELSE '❓ Statut inconnu'
    END as account_status
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.id
LEFT JOIN onboarding_progress op ON au.id = op.id
WHERE au.email = 'elibusinezz@gmail.com';

-- 5. Si l'utilisateur a un onboarding en cours, afficher les détails
SELECT 
    'Détails onboarding' as info,
    current_step,
    CASE current_step
        WHEN 1 THEN 'Informations administrateur'
        WHEN 2 THEN 'Sélection de commune'
        WHEN 3 THEN 'KYC'
        WHEN 4 THEN 'Configuration équipe'
        WHEN 5 THEN 'Acceptation légale'
        WHEN 6 THEN 'Souscription'
        WHEN 7 THEN 'Terminé'
        ELSE 'Inconnu'
    END as step_name,
    admin_info,
    commune_data,
    kyc_data,
    team_data,
    legal_data,
    subscription_data
FROM onboarding_progress 
WHERE id = (
    SELECT id FROM auth.users WHERE email = 'elibusinezz@gmail.com'
); 