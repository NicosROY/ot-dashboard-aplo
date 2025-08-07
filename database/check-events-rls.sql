-- Script pour vérifier et corriger les politiques RLS sur events
-- À exécuter dans l'éditeur SQL de Supabase

-- 1. Vérifier les politiques RLS actuelles
SELECT 'Politiques RLS actuelles sur events:' as info;
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
WHERE tablename = 'events';

-- 2. Vérifier si RLS est activé
SELECT 'RLS activé sur events:' as info;
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'events';

-- 3. Supprimer les anciennes politiques restrictives
DROP POLICY IF EXISTS "Users can view events from their commune" ON events;
DROP POLICY IF EXISTS "Users can create events for their commune" ON events;
DROP POLICY IF EXISTS "Users can update events from their commune" ON events;
DROP POLICY IF EXISTS "Users can delete events from their commune" ON events;

-- 4. Créer une politique permissive pour l'admin ET le superadmin
CREATE POLICY "Admin and Superadmin can view all events" ON events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
        OR
        auth.uid() = '39d145c4-20d9-495a-9a57-5c4cd3553089' -- UUID du superadmin
    );

CREATE POLICY "Admin and Superadmin can create events" ON events
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
        OR
        auth.uid() = '39d145c4-20d9-495a-9a57-5c4cd3553089' -- UUID du superadmin
    );

CREATE POLICY "Admin and Superadmin can update events" ON events
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
        OR
        auth.uid() = '39d145c4-20d9-495a-9a57-5c4cd3553089' -- UUID du superadmin
    );

CREATE POLICY "Admin and Superadmin can delete events" ON events
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
        OR
        auth.uid() = '39d145c4-20d9-495a-9a57-5c4cd3553089' -- UUID du superadmin
    );

-- 5. Politique pour les utilisateurs normaux (optionnel)
CREATE POLICY "Users can view events from their commune" ON events
    FOR SELECT USING (
        commune_id IN (
            SELECT commune_id FROM user_profiles WHERE id = auth.uid()
        )
    );

-- 6. Vérifier les nouvelles politiques
SELECT 'Nouvelles politiques RLS:' as info;
SELECT 
  policyname,
  cmd,
  permissive
FROM pg_policies 
WHERE tablename = 'events'; 