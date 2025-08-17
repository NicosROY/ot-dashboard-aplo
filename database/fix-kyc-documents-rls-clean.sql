-- Fix des politiques RLS pour kyc_documents (nettoyage complet)
-- Dashboard OT - Correction KYC

-- 1. Supprimer toutes les politiques existantes
DROP POLICY IF EXISTS "Users can insert their own KYC documents" ON kyc_documents;
DROP POLICY IF EXISTS "Users can view their own KYC documents" ON kyc_documents;
DROP POLICY IF EXISTS "Users can update their own KYC documents" ON kyc_documents;
DROP POLICY IF EXISTS "Service role has full access to KYC documents" ON kyc_documents;

-- 2. Activer RLS sur la table kyc_documents
ALTER TABLE kyc_documents ENABLE ROW LEVEL SECURITY;

-- 3. Politique pour permettre l'insertion de ses propres documents KYC
CREATE POLICY "Users can insert their own KYC documents" ON kyc_documents
    FOR INSERT 
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- 4. Politique pour permettre la lecture de ses propres documents KYC
CREATE POLICY "Users can view their own KYC documents" ON kyc_documents
    FOR SELECT 
    TO authenticated
    USING (auth.uid() = user_id);

-- 5. Politique pour permettre la mise à jour de ses propres documents KYC
CREATE POLICY "Users can update their own KYC documents" ON kyc_documents
    FOR UPDATE 
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 6. Politique pour les admins (service_role) - accès complet
CREATE POLICY "Service role has full access to KYC documents" ON kyc_documents
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 7. Vérification des politiques créées
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'kyc_documents'
ORDER BY policyname; 