-- Server time sync function for client clock skew correction

CREATE OR REPLACE FUNCTION get_server_time()
RETURNS TIMESTAMPTZ AS $$
  SELECT now();
$$ LANGUAGE SQL SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_server_time() TO authenticated, anon;
