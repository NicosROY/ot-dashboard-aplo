-- Script pour ajouter les champs manquants et créer les nouvelles tables
-- À exécuter dans Supabase SQL Editor

-- 1. Ajouter les champs manquants à user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS function VARCHAR(100);

-- 2. Créer la table legal_acceptances
CREATE TABLE IF NOT EXISTS legal_acceptances (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    cgv_accepted BOOLEAN DEFAULT false,
    cgu_accepted BOOLEAN DEFAULT false,
    responsibility_accepted BOOLEAN DEFAULT false,
    cgv_accepted_at TIMESTAMP,
    cgu_accepted_at TIMESTAMP,
    responsibility_accepted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_legal_acceptances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_legal_acceptances_updated_at 
    BEFORE UPDATE ON legal_acceptances
    FOR EACH ROW EXECUTE FUNCTION update_legal_acceptances_updated_at();

-- RLS pour legal_acceptances
ALTER TABLE legal_acceptances ENABLE ROW LEVEL SECURITY;

-- Policies pour legal_acceptances
CREATE POLICY "Users can view their own legal acceptances" ON legal_acceptances
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own legal acceptances" ON legal_acceptances
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own legal acceptances" ON legal_acceptances
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. Créer la table team_invitations
CREATE TABLE IF NOT EXISTS team_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    commune_id INTEGER REFERENCES communes(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'editor', 'moderator')),
    invitation_token VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
    expires_at TIMESTAMP NOT NULL,
    accepted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_team_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_team_invitations_updated_at 
    BEFORE UPDATE ON team_invitations
    FOR EACH ROW EXECUTE FUNCTION update_team_invitations_updated_at();

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON team_invitations(email);
CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON team_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_team_invitations_status ON team_invitations(status);

-- RLS pour team_invitations
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

-- Policies pour team_invitations
CREATE POLICY "Admins can manage invitations for their commune" ON team_invitations
    FOR ALL USING (
        admin_user_id = auth.uid() OR
        commune_id IN (
            SELECT commune_id FROM user_profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Invited users can view their invitation" ON team_invitations
    FOR SELECT USING (email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
    ));

-- 4. Créer la table team_members
CREATE TABLE IF NOT EXISTS team_members (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    admin_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    commune_id INTEGER REFERENCES communes(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'editor', 'moderator')),
    invitation_id UUID REFERENCES team_invitations(id),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_team_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_team_members_updated_at 
    BEFORE UPDATE ON team_members
    FOR EACH ROW EXECUTE FUNCTION update_team_members_updated_at();

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_team_members_commune_id ON team_members(commune_id);
CREATE INDEX IF NOT EXISTS idx_team_members_admin_user_id ON team_members(admin_user_id);

-- RLS pour team_members
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Policies pour team_members
CREATE POLICY "Team members can view their team" ON team_members
    FOR SELECT USING (
        user_id = auth.uid() OR
        admin_user_id = auth.uid() OR
        commune_id IN (
            SELECT commune_id FROM user_profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage team members" ON team_members
    FOR ALL USING (
        admin_user_id = auth.uid() OR
        commune_id IN (
            SELECT commune_id FROM user_profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 5. Fonction pour générer les tokens d'invitation
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS VARCHAR(255) AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Vérification
SELECT 'Tables créées avec succès' as status; 