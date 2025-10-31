/*
  # Ajouter les entreprises de démonstration

  1. Nouvelles données
    - Ajoute 4 entreprises de démonstration :
      - NUMELEC (électricité)
      - BBSE (bâtiment)
      - QUADRO CAB (maintenance)
      - JLCR (travaux publics)
    
  2. Informations incluses
    - Nom de l'entreprise
    - Email de contact
    - Email administrateur
    - URL du logo (pour NUMELEC)
    
  3. Notes importantes
    - Les IDs sont fixes pour correspondre aux données de l'application
    - Utilise INSERT ... ON CONFLICT pour éviter les doublons
*/

-- Insérer les 4 entreprises de démonstration
INSERT INTO companies (id, name, email, admin_email, logo_url, created_at, updated_at)
VALUES 
  (
    '550e8400-e29b-41d4-a716-446655440011',
    'NUMELEC',
    'contact@numelec.fr',
    'admin@numelec.fr',
    '/logos/LOGO-NUMELEC.png',
    now(),
    now()
  ),
  (
    '550e8400-e29b-41d4-a716-446655440012',
    'BBSE',
    'contact@bbse.fr',
    'admin@bbse.fr',
    null,
    now(),
    now()
  ),
  (
    '550e8400-e29b-41d4-a716-446655440013',
    'QUADRO CAB',
    'contact@quadrocab.fr',
    'admin@quadrocab.fr',
    null,
    now(),
    now()
  ),
  (
    '550e8400-e29b-41d4-a716-446655440014',
    'JLCR',
    'contact@jlcr.fr',
    'admin@jlcr.fr',
    null,
    now(),
    now()
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  admin_email = EXCLUDED.admin_email,
  logo_url = EXCLUDED.logo_url,
  updated_at = now();