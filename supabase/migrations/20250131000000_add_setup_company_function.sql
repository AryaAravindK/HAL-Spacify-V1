-- Create the setup_company function
CREATE OR REPLACE FUNCTION public.setup_company(
  p_user_id uuid,
  p_company_name text,
  p_company_address text,
  p_website_url text DEFAULT NULL,
  p_social_media_links jsonb DEFAULT NULL,
  p_admin_name text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
BEGIN
  -- Insert company first
  INSERT INTO public.companies (
    name,
    address,
    website_url,
    social_media_links
  ) 
  VALUES (
    p_company_name,
    p_company_address,
    p_website_url,
    p_social_media_links
  )
  RETURNING id INTO v_company_id;

  -- Insert admin record
  INSERT INTO public.admins (
    id,
    company_id,
    name
  ) 
  VALUES (
    p_user_id,
    v_company_id,
    p_admin_name
  );

  RETURN true;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.setup_company TO authenticated;

-- Update RLS policies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can access their company" ON public.companies;
CREATE POLICY "Admins can access their company"
ON public.companies
FOR ALL
TO authenticated
USING (
  id IN (
    SELECT company_id 
    FROM public.admins 
    WHERE admins.id = auth.uid()
  )
);

-- Add policy for initial company creation
DROP POLICY IF EXISTS "Allow initial company creation" ON public.companies;
CREATE POLICY "Allow initial company creation"
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (
  NOT EXISTS (
    SELECT 1 
    FROM public.admins 
    WHERE admins.id = auth.uid()
  )
); 