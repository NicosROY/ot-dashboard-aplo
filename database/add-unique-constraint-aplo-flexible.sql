-- Version alternative avec contrainte unique plus souple
-- À exécuter dans l'éditeur SQL de Supabase APLO

-- Option 1: Contrainte stricte (recommandée) - Même date + même lieu + même créateur
ALTER TABLE events 
ADD CONSTRAINT events_unique_strict 
UNIQUE (date_start, location, creator_id);

-- Option 2: Contrainte souple (seulement date + créateur)
-- ALTER TABLE events 
-- ADD CONSTRAINT events_unique_flexible 
-- UNIQUE (date_start, creator_id);

-- Option 3: Contrainte très souple (seulement lieu + créateur)
-- ALTER TABLE events 
-- ADD CONSTRAINT events_unique_very_flexible 
-- UNIQUE (location, creator_id);

-- Vérification
SELECT 
    constraint_name,
    constraint_type,
    table_name
FROM information_schema.table_constraints 
WHERE table_name = 'events' 
AND constraint_type = 'UNIQUE'; 