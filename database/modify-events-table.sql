-- Modification de la table events pour le nouveau formulaire
-- Dashboard OT - Modifications

-- 1. Ajouter la colonne "nom_lieu" (nom du lieu)
ALTER TABLE events ADD COLUMN nom_lieu VARCHAR(255);

-- 2. Ajouter la colonne "adresse" (adresse complète)
ALTER TABLE events ADD COLUMN adresse TEXT;

-- 3. La colonne "location" existe déjà et reste pour le nom du lieu

-- 4. Les colonnes GPS existent déjà (gps_lat, gps_lng) - calculées par l'app

-- 5. Ajouter colonne pour gratuit/payant
ALTER TABLE events ADD COLUMN is_free BOOLEAN DEFAULT true;
ALTER TABLE events ADD COLUMN price DECIMAL(10,2);

-- 6. Supprimer d'abord la vue qui dépend de category_ids
DROP VIEW IF EXISTS events_with_details;

-- 7. Modifier category_ids pour une seule catégorie
ALTER TABLE events DROP COLUMN category_ids;
ALTER TABLE events ADD COLUMN category_id INTEGER REFERENCES categories(id);

-- 8. Modifier images pour une seule image uploadée
ALTER TABLE events DROP COLUMN images;
ALTER TABLE events ADD COLUMN uploaded_image_url TEXT;

-- 9. Mettre à jour les contraintes de statut
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_status_check;
ALTER TABLE events ADD CONSTRAINT events_status_check 
  CHECK (status IN ('pending', 'approved', 'rejected'));

-- 10. Index pour optimiser les recherches
CREATE INDEX IF NOT EXISTS idx_events_category_id ON events(category_id);
CREATE INDEX IF NOT EXISTS idx_events_is_free ON events(is_free);
CREATE INDEX IF NOT EXISTS idx_events_nom_lieu ON events(nom_lieu);

-- 11. Recréer la vue events_with_details avec les nouvelles colonnes
CREATE VIEW events_with_details AS
SELECT 
    e.*,
    c.name as commune_name,
    c.logo_url as commune_logo,
    up.first_name as created_by_first_name,
    up.last_name as created_by_last_name,
    cat.name as category_name
FROM events e
LEFT JOIN communes c ON e.commune_id = c.id
LEFT JOIN user_profiles up ON e.created_by = up.id
LEFT JOIN categories cat ON e.category_id = cat.id; 