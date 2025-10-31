/*
  # Synchronisation automatique Users → Employees

  1. Fonction de synchronisation
    - Synchronise automatiquement les données de `users` vers `employees`
    - Sépare le nom complet en prénom et nom
    - Mappe les champs correspondants

  2. Trigger automatique
    - Se déclenche à chaque INSERT/UPDATE sur `users`
    - Maintient la synchronisation en temps réel

  3. Synchronisation initiale
    - Synchronise tous les utilisateurs existants
    - Crée les enregistrements manquants dans `employees`
*/

-- Fonction pour synchroniser un utilisateur vers la table employees
CREATE OR REPLACE FUNCTION sync_user_to_employee()
RETURNS TRIGGER AS $$
BEGIN
  -- Séparer le nom complet en prénom et nom
  DECLARE
    name_parts TEXT[];
    first_name_val TEXT;
    last_name_val TEXT;
  BEGIN
    -- Diviser le nom par les espaces
    name_parts := string_to_array(NEW.name, ' ');
    
    -- Premier élément = prénom
    first_name_val := COALESCE(name_parts[1], '');
    
    -- Reste = nom de famille (rejoindre avec des espaces)
    IF array_length(name_parts, 1) > 1 THEN
      last_name_val := array_to_string(name_parts[2:], ' ');
    ELSE
      last_name_val := '';
    END IF;

    -- Insérer ou mettre à jour dans la table employees
    INSERT INTO employees (
      user_id,
      first_name,
      last_name,
      birth_date,
      hire_date,
      position,
      phone,
      address,
      emergency_contact,
      social_security,
      bank_info,
      profile_image_url
    ) VALUES (
      NEW.id,
      first_name_val,
      last_name_val,
      NEW.birth_date,
      NEW.hire_date,
      NEW.department,
      NULL, -- phone à remplir manuellement
      NULL, -- address à remplir manuellement
      NULL, -- emergency_contact à remplir manuellement
      NULL, -- social_security à remplir manuellement
      NULL, -- bank_info à remplir manuellement
      NULL  -- profile_image_url à remplir manuellement
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET
      first_name = first_name_val,
      last_name = last_name_val,
      birth_date = NEW.birth_date,
      hire_date = NEW.hire_date,
      position = NEW.department,
      updated_at = now();

    RETURN NEW;
  END;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger pour synchronisation automatique
DROP TRIGGER IF EXISTS sync_user_to_employee_trigger ON users;
CREATE TRIGGER sync_user_to_employee_trigger
  AFTER INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_to_employee();

-- Synchroniser tous les utilisateurs existants
DO $$
DECLARE
  user_record RECORD;
  name_parts TEXT[];
  first_name_val TEXT;
  last_name_val TEXT;
BEGIN
  FOR user_record IN 
    SELECT id, name, birth_date, hire_date, department 
    FROM users 
    WHERE role = 'employee'
  LOOP
    -- Séparer le nom complet
    name_parts := string_to_array(user_record.name, ' ');
    first_name_val := COALESCE(name_parts[1], '');
    
    IF array_length(name_parts, 1) > 1 THEN
      last_name_val := array_to_string(name_parts[2:], ' ');
    ELSE
      last_name_val := '';
    END IF;

    -- Insérer ou mettre à jour
    INSERT INTO employees (
      user_id,
      first_name,
      last_name,
      birth_date,
      hire_date,
      position
    ) VALUES (
      user_record.id,
      first_name_val,
      last_name_val,
      user_record.birth_date,
      user_record.hire_date,
      user_record.department
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET
      first_name = first_name_val,
      last_name = last_name_val,
      birth_date = user_record.birth_date,
      hire_date = user_record.hire_date,
      position = user_record.department,
      updated_at = now();
  END LOOP;
  
  RAISE NOTICE 'Synchronisation terminée pour tous les utilisateurs existants';
END $$;