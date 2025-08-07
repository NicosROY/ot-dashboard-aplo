-- Script pour désactiver complètement le RLS sur onboarding_progress
-- À exécuter dans Supabase SQL Editor

-- 1. Désactiver RLS sur onboarding_progress
ALTER TABLE onboarding_progress DISABLE ROW LEVEL SECURITY;

-- 2. Supprimer toutes les politiques existantes
DROP POLICY IF EXISTS "Users can manage their own onboarding progress" ON onboarding_progress;
DROP POLICY IF EXISTS "Admins can view all onboarding progress" ON onboarding_progress;

-- 3. Vérifier que RLS est bien désactivé
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'onboarding_progress';

-- 4. Vérifier qu'il n'y a plus de politiques
SELECT 
    schemaname,
    tablename,
    policyname
FROM pg_policies 
WHERE tablename = 'onboarding_progress';

-- 5. Message de confirmation
SELECT 'RLS désactivé sur onboarding_progress avec succès' as status; 