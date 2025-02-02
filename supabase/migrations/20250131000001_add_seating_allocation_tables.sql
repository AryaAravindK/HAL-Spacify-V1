-- Add WFH limits table
CREATE TABLE wfh_limits (
  designation text PRIMARY KEY,
  monthly_limit integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert default WFH limits
INSERT INTO wfh_limits (designation, monthly_limit) VALUES
  ('manager', 4),
  ('senior', 6),
  ('junior', 8),
  ('intern', 8);

-- Add WFH tracking table
CREATE TABLE wfh_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id),
  date date NOT NULL,
  company_id uuid REFERENCES companies(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, date)
);

-- Add seating allocation history
CREATE TABLE seating_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id),
  seat_id uuid REFERENCES seats(id),
  allocation_date date NOT NULL,
  is_wfh boolean DEFAULT false,
  company_id uuid REFERENCES companies(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, allocation_date)
);

-- Add RLS policies
ALTER TABLE wfh_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE seating_history ENABLE ROW LEVEL SECURITY;

-- WFH records policy
CREATE POLICY "Admins can access their company WFH records"
  ON wfh_records
  FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id 
      FROM admins 
      WHERE admins.id = auth.uid()
    )
  );

-- Seating history policy
CREATE POLICY "Admins can access their company seating history"
  ON seating_history
  FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id 
      FROM admins 
      WHERE admins.id = auth.uid()
    )
  ); 