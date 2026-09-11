-- ==========================================
-- PareFood Database Migration
-- 0005_security_functions.sql
-- Helper functions for RLS policies
-- ==========================================

-- Extract a role/claim for a user within RLS policies.
-- Priority:
--  1. JWT app_metadata (when accessed via PostgREST/gRPC)
--  2. profiles.role (PareFood's canonical role column)
--
-- SECURITY DEFINER + search_path pin lets policies read safely
-- without triggering RLS recursion on the profiles table.

CREATE OR REPLACE FUNCTION public.get_claim(uid uuid, claim text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    jwt_claim text;
BEGIN
    SELECT coalesce((auth.jwt() -> 'app_metadata' ->> claim), NULL)
    INTO jwt_claim;

    IF jwt_claim IS NOT NULL THEN
        RETURN jwt_claim;
    END IF;

    RETURN (SELECT role FROM profiles WHERE id = uid AND is_removed = FALSE);
END;
$$;

REVOKE ALL ON FUNCTION public.get_claim(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_claim(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_claim(uuid, text) TO service_role;