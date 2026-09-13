-- Patient cases
CREATE TABLE public.patient_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL DEFAULT auth.uid(),
  patient_id UUID,
  patient_name TEXT NOT NULL,
  age INTEGER,
  gender TEXT,
  symptoms TEXT,
  diagnosis TEXT,
  vitals TEXT,
  source TEXT
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_cases TO authenticated;
GRANT ALL ON public.patient_cases TO service_role;

ALTER TABLE public.patient_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors can view their own cases"
  ON public.patient_cases FOR SELECT TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Doctors can insert their own cases"
  ON public.patient_cases FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Doctors can update their own cases"
  ON public.patient_cases FOR UPDATE TO authenticated
  USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());

CREATE POLICY "Doctors can delete their own cases"
  ON public.patient_cases FOR DELETE TO authenticated
  USING (created_by = auth.uid());

CREATE INDEX patient_cases_created_by_idx ON public.patient_cases (created_by, created_at DESC);

-- Roles enum
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('patient', 'doctor', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Roles table (authoritative, never on profiles)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
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

-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  full_name text,
  email text,
  age integer,
  gender text,
  phone text,
  blood_group text,
  allergies text,
  medical_history text
);

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Doctors can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'doctor'));

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Doctor review access on patient cases
CREATE POLICY "Doctors can view all cases"
ON public.patient_cases FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'doctor'));

CREATE POLICY "Doctors can update cases for review"
ON public.patient_cases FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'doctor'))
WITH CHECK (true);

-- Care assignments linking patients to doctors
CREATE TABLE IF NOT EXISTS public.care_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL UNIQUE,
  doctor_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.care_assignments TO authenticated;
GRANT ALL ON public.care_assignments TO service_role;
ALTER TABLE public.care_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own assignments"
ON public.care_assignments FOR SELECT TO authenticated
USING (patient_id = auth.uid() OR doctor_id = auth.uid());