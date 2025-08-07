-- Script pour corriger les politiques RLS des invitations d'équipe
-- À exécuter dans l'éditeur SQL de Supabase

-- 1. Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Admins can manage invitations for their commune" ON team_invitations;
DROP POLICY IF EXISTS "Invited users can view their invitation" ON team_invitations;

-- 2. Désactiver RLS temporairement
ALTER TABLE team_invitations DISABLE ROW LEVEL SECURITY;

-- 3. Réactiver RLS
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

-- 4. Créer des politiques plus permissives pour les invitations

-- Politique pour permettre la création d'invitations
CREATE POLICY "Allow invitation creation" ON team_invitations
    FOR INSERT WITH CHECK (true);

-- Politique pour permettre aux utilisateurs de voir les invitations de leur commune
CREATE POLICY "Users can view invitations from their commune" ON team_invitations
    FOR SELECT USING (
        commune_id IN (
            SELECT commune_id FROM user_profiles WHERE id = auth.uid()
        )
    );

-- Politique pour permettre aux admins de gérer les invitations de leur commune
CREATE POLICY "Admins can manage invitations from their commune" ON team_invitations
    FOR ALL USING (
        admin_user_id = auth.uid() OR
        commune_id IN (
            SELECT commune_id FROM user_profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Politique pour permettre aux utilisateurs invités de voir leur invitation
CREATE POLICY "Invited users can view their own invitation" ON team_invitations
    FOR SELECT USING (
        email = (
            SELECT email FROM auth.users WHERE id = auth.uid()
        )
    );

-- 5. Vérifier que les politiques sont bien appliquées
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'team_invitations'; 