-- Move the role-check helper out of the API-exposed schema
CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated;

-- Repoint policies at the private helper
DROP POLICY "Doctors can view all profiles" ON public.profiles;
CREATE POLICY "Doctors can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'doctor'));

DROP POLICY "Doctors can view all cases" ON public.patient_cases;
CREATE POLICY "Doctors can view all cases"
ON public.patient_cases FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'doctor'));

DROP POLICY "Doctors can update cases for review" ON public.patient_cases;
CREATE POLICY "Doctors can update cases for review"
ON public.patient_cases FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(), 'doctor'))
WITH CHECK (true);