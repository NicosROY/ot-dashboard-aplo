-- Script pour corriger les politiques RLS pour l'onboarding et les paiements
-- À exécuter dans l'éditeur SQL de Supabase

-- 1. Corriger les politiques pour onboarding_progress
-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Users can manage their own onboarding progress" ON onboarding_progress;
DROP POLICY IF EXISTS "Admins can view all onboarding progress" ON onboarding_progress;

-- Désactiver RLS temporairement pour corriger
ALTER TABLE onboarding_progress DISABLE ROW LEVEL SECURITY;

-- Réactiver RLS avec des politiques correctes
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre l'insertion lors de la création du compte
CREATE POLICY "Allow onboarding creation" ON onboarding_progress
    FOR INSERT WITH CHECK (true);

-- Politique pour permettre la lecture/modification de ses propres données
CREATE POLICY "Users can manage their own onboarding progress" ON onboarding_progress
    FOR ALL USING (auth.uid() = id);

-- Politique pour permettre aux admins de voir toutes les données
CREATE POLICY "Admins can view all onboarding progress" ON onboarding_progress
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role = 'admin'
        )
    );

-- 2. Corriger les politiques pour subscriptions
-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Users can manage their own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON subscriptions;

-- Désactiver RLS temporairement
ALTER TABLE subscriptions DISABLE ROW LEVEL SECURITY;

-- Réactiver RLS avec des politiques correctes
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre la création d'abonnements
CREATE POLICY "Allow subscription creation" ON subscriptions
    FOR INSERT WITH CHECK (true);

-- Politique pour permettre la lecture/modification des abonnements de sa commune
CREATE POLICY "Users can manage commune subscriptions" ON subscriptions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.commune_id = subscriptions.commune_id
        )
    );

-- Politique pour permettre aux admins de voir toutes les données
CREATE POLICY "Admins can view all subscriptions" ON subscriptions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role = 'admin'
        )
    );

-- 3. Corriger les politiques pour payments
-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Users can manage their own payments" ON payments;
DROP POLICY IF EXISTS "Admins can view all payments" ON payments;

-- Désactiver RLS temporairement
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;

-- Réactiver RLS avec des politiques correctes
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre la création de paiements
CREATE POLICY "Allow payment creation" ON payments
    FOR INSERT WITH CHECK (true);

-- Politique pour permettre la lecture des paiements de sa commune
CREATE POLICY "Users can view commune payments" ON payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM subscriptions s
            JOIN user_profiles up ON up.commune_id = s.commune_id
            WHERE s.id = payments.subscription_id
            AND up.id = auth.uid()
        )
    );

-- Politique pour permettre aux admins de voir toutes les données
CREATE POLICY "Admins can view all payments" ON payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role = 'admin'
        )
    );

-- 4. Vérifier que les politiques sont bien appliquées
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
WHERE tablename IN ('onboarding_progress', 'subscriptions', 'payments')
ORDER BY tablename, policyname;

-- 5. Test de connexion
SELECT 
    'onboarding_progress' as table_name,
    COUNT(*) as record_count
FROM onboarding_progress
UNION ALL
SELECT 
    'subscriptions' as table_name,
    COUNT(*) as record_count
FROM subscriptions
UNION ALL
SELECT 
    'payments' as table_name,
    COUNT(*) as record_count
FROM payments; 