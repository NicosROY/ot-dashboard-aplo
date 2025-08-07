-- Ajouter le champ deleted_at pour le soft delete
ALTER TABLE events ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Créer un index pour optimiser les requêtes
CREATE INDEX idx_events_deleted_at ON events(deleted_at);

-- Mettre à jour les politiques RLS pour exclure les événements supprimés
DROP POLICY IF EXISTS "Users can view their commune events" ON events;
CREATE POLICY "Users can view their commune events" ON events
  FOR SELECT USING (
    commune_id = auth.jwt() ->> 'commune_id'::text 
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS "Users can delete their commune events" ON events;
CREATE POLICY "Users can delete their commune events" ON events
  FOR UPDATE USING (
    commune_id = auth.jwt() ->> 'commune_id'::text
  ); 