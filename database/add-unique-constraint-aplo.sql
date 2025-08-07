-- Script pour ajouter une contrainte unique sur la table events APLO
-- À exécuter dans l'éditeur SQL de Supabase APLO

-- 1. Vérifier la structure actuelle de la table events
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'events' 
ORDER BY ordinal_position;

-- 2. Ajouter une contrainte unique pour empêcher les doublons
-- Un événement est considéré comme doublon si :
-- - Même date de début
-- - Même lieu
-- - Même créateur (creator_id)
-- 
-- Note: Le titre n'est PAS inclus dans la contrainte car deux événements
-- différents peuvent avoir le même titre mais pas au même endroit/date

ALTER TABLE events 
ADD CONSTRAINT events_unique_dashboard 
UNIQUE (date_start, location, creator_id);

-- 3. Vérifier que la contrainte a été ajoutée
SELECT 
    constraint_name,
    constraint_type,
    table_name
FROM information_schema.table_constraints 
WHERE table_name = 'events' 
AND constraint_type = 'UNIQUE';

-- 4. Optionnel : Ajouter un index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_events_unique_fields 
ON events (date_start, location, creator_id);

-- 5. Message de confirmation
SELECT 'Contrainte unique ajoutée avec succès !' as message; 