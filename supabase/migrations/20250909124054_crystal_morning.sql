/*
  # Suppression des colonnes inutilisées dans timesheet_entries

  1. Colonnes supprimées
    - `start_time` (time without time zone) - Non utilisée dans l'interface
    - `end_time` (time without time zone) - Non utilisée dans l'interface  
    - `break_duration` (integer) - Non utilisée dans l'interface

  2. Justification
    - L'interface utilisateur ne permet que la saisie du nombre d'heures total
    - Les horaires de début/fin ne sont jamais saisis ni affichés
    - Ces colonnes occupent de l'espace inutilement
    - Simplification du modèle de données

  3. Impact
    - Aucun impact sur l'interface utilisateur
    - Réduction de la taille de la base de données
    - Simplification des requêtes
    - Modèle plus cohérent avec l'usage réel
*/

-- Supprimer les colonnes inutilisées
ALTER TABLE timesheet_entries 
DROP COLUMN IF EXISTS start_time,
DROP COLUMN IF EXISTS end_time,
DROP COLUMN IF EXISTS break_duration;