-- Script de nettoyage des données de test
-- À exécuter dans Supabase SQL Editor

-- Supprimer tous les utilisateurs de test
DELETE FROM auth.users WHERE email LIKE '%@ot.fr';

-- Supprimer tous les événements de test
DELETE FROM events WHERE title LIKE '%Festival%' 
   OR title LIKE '%Exposition%' 
   OR title LIKE '%Salon%' 
   OR title LIKE '%Course%'
   OR title LIKE '%Fête%';

-- Supprimer tous les logs d'événements de test
DELETE FROM event_logs WHERE event_id IN (
  SELECT id FROM events WHERE title LIKE '%Festival%' 
     OR title LIKE '%Exposition%' 
     OR title LIKE '%Salon%' 
     OR title LIKE '%Course%'
     OR title LIKE '%Fête%'
);

-- Supprimer les communes de test (Paris, Lyon, Marseille, etc.)
DELETE FROM communes WHERE name IN ('Paris', 'Lyon', 'Marseille', 'Bordeaux', 'Nantes');

-- Supprimer les catégories de test
DELETE FROM categories WHERE name IN (
  'Culture', 'Spectacle', 'Sport', 'Gastronomie', 
  'Patrimoine', 'Nature', 'Festival', 'Commerce'
);

-- Nettoyer les profils utilisateur orphelins
DELETE FROM user_profiles WHERE email LIKE '%@ot.fr';

-- Réinitialiser les séquences si nécessaire
-- (Supabase gère automatiquement les séquences, mais au cas où)
-- SELECT setval('events_id_seq', (SELECT MAX(id) FROM events));
-- SELECT setval('communes_id_seq', (SELECT MAX(id) FROM communes));
-- SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories)); 