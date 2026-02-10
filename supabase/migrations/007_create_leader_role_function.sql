-- Migration: Create function to assign role to leader by email
-- This function finds a user in auth.users by email and creates a role for them

CREATE OR REPLACE FUNCTION create_leader_role(leader_email TEXT, role_name TEXT)
RETURNS UUID AS $$
DECLARE
  user_uuid UUID;
  role_id UUID;
BEGIN
  -- Find user by email in auth.users
  SELECT id INTO user_uuid
  FROM auth.users
  WHERE email = leader_email
  LIMIT 1;
  
  -- If user not found, raise exception
  IF user_uuid IS NULL THEN
    RAISE EXCEPTION 'User with email % does not exist. User must sign in first.', leader_email;
  END IF;
  
  -- Check if role already exists
  SELECT id INTO role_id
  FROM roles
  WHERE user_id = user_uuid;
  
  -- If role exists, update it
  IF role_id IS NOT NULL THEN
    UPDATE roles
    SET role = role_name
    WHERE user_id = user_uuid;
    RETURN role_id;
  ELSE
    -- Create new role
    INSERT INTO roles (user_id, role)
    VALUES (user_uuid, role_name)
    RETURNING id INTO role_id;
    RETURN role_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_leader_role IS 'Finds user by email and creates/updates their role. User must exist in auth.users first.';

