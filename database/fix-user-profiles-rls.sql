-- Script pour corriger les politiques RLS de user_profiles
-- À exécuter dans l'éditeur SQL de Supabase

-- 1. Supprimer les anciennes politiques pour user_profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;

-- 2. Créer de nouvelles politiques plus permissives
-- Politique pour permettre aux utilisateurs de voir leur propre profil
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

-- Politique pour permettre aux utilisateurs de voir les profils de leur commune
CREATE POLICY "Users can view commune profiles" ON user_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles current_user
            WHERE current_user.id = auth.uid()
            AND current_user.commune_id = user_profiles.commune_id
        )
    );

-- Politique pour permettre aux utilisateurs de modifier leur propre profil
CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- Politique pour permettre aux admins de modifier tous les profils de leur commune
CREATE POLICY "Admins can update commune profiles" ON user_profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_profiles current_user
            WHERE current_user.id = auth.uid()
            AND current_user.role = 'admin'
            AND current_user.commune_id = user_profiles.commune_id
        )
    );

-- Politique pour permettre aux admins de créer des profils dans leur commune
CREATE POLICY "Admins can insert commune profiles" ON user_profiles
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles current_user
            WHERE current_user.id = auth.uid()
            AND current_user.role = 'admin'
            AND current_user.commune_id = user_profiles.commune_id
        )
    );

-- Politique pour permettre aux admins de supprimer des profils de leur commune
CREATE POLICY "Admins can delete commune profiles" ON user_profiles
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_profiles current_user
            WHERE current_user.id = auth.uid()
            AND current_user.role = 'admin'
            AND current_user.commune_id = user_profiles.commune_id
        )
    );

-- 3. Vérifier que les politiques sont bien créées
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'user_profiles'
ORDER BY policyname; 