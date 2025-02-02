/*
  # Initial Schema Setup for Office Seating Manager

  1. New Tables
    - companies
      - Basic company information
      - One-to-many relationship with branches and admins
    - branches
      - Branch details including floors and capacity
      - One-to-many relationship with seats
    - employees
      - Employee information
      - One-to-one relationship with seats
    - seats
      - Individual seat assignments
      - Many-to-one relationship with branches and employees
    - admins
      - Admin user information
      - Many-to-one relationship with companies

  2. Security
    - RLS enabled on all tables
    - Policies for authenticated users to access their company data
*/

-- Companies table
CREATE TABLE companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL,
  website_url text,
  social_media_links jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Branches table
CREATE TABLE branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) NOT NULL,
  name text NOT NULL,
  address text NOT NULL,
  num_floors integer NOT NULL,
  total_capacity integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Employees table
CREATE TABLE employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) NOT NULL,
  employee_id text NOT NULL,
  name text NOT NULL,
  designation text NOT NULL,
  email text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, employee_id)
);

-- Seats table
CREATE TABLE seats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid REFERENCES branches(id) NOT NULL,
  floor_number integer NOT NULL,
  seat_number text NOT NULL,
  employee_id uuid REFERENCES employees(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(branch_id, floor_number, seat_number)
);

-- Admins table (extends Supabase auth.users)
CREATE TABLE admins (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  company_id uuid REFERENCES companies(id),
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can access their company"
  ON companies
  FOR ALL
  TO authenticated
  USING (
    id IN (
      SELECT company_id 
      FROM admins 
      WHERE admins.id = auth.uid()
    )
  );

CREATE POLICY "Admins can access their company branches"
  ON branches
  FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id 
      FROM admins 
      WHERE admins.id = auth.uid()
    )
  );

CREATE POLICY "Admins can access their company employees"
  ON employees
  FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id 
      FROM admins 
      WHERE admins.id = auth.uid()
    )
  );

CREATE POLICY "Admins can access their company seats"
  ON seats
  FOR ALL
  TO authenticated
  USING (
    branch_id IN (
      SELECT branches.id 
      FROM branches 
      JOIN admins ON branches.company_id = admins.company_id 
      WHERE admins.id = auth.uid()
    )
  );

CREATE POLICY "Users can access their own admin record"
  ON admins
  FOR ALL
  TO authenticated
  USING (id = auth.uid());

-- Functions
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_branches_updated_at
  BEFORE UPDATE ON branches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_seats_updated_at
  BEFORE UPDATE ON seats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_admins_updated_at
  BEFORE UPDATE ON admins
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();