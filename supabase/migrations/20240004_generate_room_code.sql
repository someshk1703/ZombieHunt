-- Migration: add generate_room_code() function
CREATE OR REPLACE FUNCTION generate_room_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code  TEXT;
  done  BOOLEAN := false;
BEGIN
  WHILE NOT done LOOP
    code := '';
    FOR i IN 1..6 LOOP
      code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    IF NOT EXISTS (SELECT 1 FROM rooms WHERE rooms.code = code) THEN
      done := true;
    END IF;
  END LOOP;
  RETURN code;
END;
$$;
