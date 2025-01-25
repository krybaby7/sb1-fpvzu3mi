-- Update display names for 5e students
DO $$
DECLARE
  ryan_updated boolean := false;
  hilal_updated boolean := false;
BEGIN
  -- Update first 5e student to Ryan
  UPDATE profiles
  SET display_name = 'Ryan'
  WHERE role = 'student'
  AND email LIKE '%@effsheleve5e.com'
  AND id = (
    SELECT id
    FROM profiles
    WHERE role = 'student'
    AND email LIKE '%@effsheleve5e.com'
    ORDER BY created_at ASC
    LIMIT 1
  )
  RETURNING true INTO ryan_updated;

  -- Update second 5e student to Hilal
  UPDATE profiles
  SET display_name = 'Hilal'
  WHERE role = 'student'
  AND email LIKE '%@effsheleve5e.com'
  AND id = (
    SELECT id
    FROM profiles
    WHERE role = 'student'
    AND email LIKE '%@effsheleve5e.com'
    ORDER BY created_at ASC
    OFFSET 1
    LIMIT 1
  )
  RETURNING true INTO hilal_updated;

  -- Raise notice about what was updated
  IF ryan_updated THEN
    RAISE NOTICE 'Updated first 5e student to Ryan';
  END IF;
  
  IF hilal_updated THEN
    RAISE NOTICE 'Updated second 5e student to Hilal';
  END IF;
  
  IF NOT (ryan_updated OR hilal_updated) THEN
    RAISE NOTICE 'No students were updated';
  END IF;
END $$;