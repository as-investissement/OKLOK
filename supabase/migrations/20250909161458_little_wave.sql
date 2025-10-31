/*
  # Créer la fonction is_admin() manquante

  1. Fonction is_admin()
    - Vérifie si l'utilisateur connecté est admin
    - Utilise auth.uid() pour récupérer l'ID utilisateur
    - Retourne true si role = 'admin' dans la table users

  2. Sécurité
    - SECURITY DEFINER pour permettre l'accès aux données
    - Fonction stable et sécurisée
    - Utilisée par toutes les policies RLS
*/

-- Créer la fonction is_admin() si elle n'existe pas
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
$$;

-- Accorder les permissions d'exécution
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin() TO anon;

-- Test de la fonction (optionnel - pour vérification)
-- SELECT is_admin(); -- Décommentez pour tester