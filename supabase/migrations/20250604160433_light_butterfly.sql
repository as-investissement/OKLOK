/*
  # Initial Database Schema Setup

  1. Tables
    - companies: Store company information
    - users: Store user/employee information
    - projects: Store project/construction site information
    - timesheets: Store weekly timesheet records
    - timesheet_entries: Store daily time entries

  2. Security
    - RLS policies for each table
    - Authentication rules
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  email text,
  admin_email text,
  logo_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Companies are viewable by authenticated users"
  ON companies FOR SELECT
  TO authenticated
  USING (true);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'employee')),
  department text,
  company_id uuid REFERENCES companies(id),
  archived boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own data"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR role = 'admin');

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  reference text,
  address text,
  company_id uuid REFERENCES companies(id),
  active boolean DEFAULT true,
  archived boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Projects are viewable by authenticated users"
  ON projects FOR SELECT
  TO authenticated
  USING (true);

-- Timesheets table
CREATE TABLE IF NOT EXISTS timesheets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id),
  company_id uuid REFERENCES companies(id),
  week_starting date NOT NULL,
  week_ending date NOT NULL,
  total_hours numeric(5,2) DEFAULT 0,
  status text NOT NULL CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own timesheets"
  ON timesheets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
    AND users.company_id = timesheets.company_id
  ));

CREATE POLICY "Users can insert their own timesheets"
  ON timesheets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own draft timesheets"
  ON timesheets FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND status = 'draft'
  )
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'draft'
  );

-- Timesheet entries table
CREATE TABLE IF NOT EXISTS timesheet_entries (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  timesheet_id uuid REFERENCES timesheets(id),
  user_id uuid REFERENCES users(id),
  date date NOT NULL,
  project_id uuid REFERENCES projects(id),
  start_time time NOT NULL,
  end_time time NOT NULL,
  break_duration integer DEFAULT 0, -- in minutes
  normal_hours numeric(4,2) DEFAULT 0,
  overtime_hours numeric(4,2) DEFAULT 0,
  status text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE timesheet_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own timesheet entries"
  ON timesheet_entries FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
    AND users.company_id = (
      SELECT company_id FROM timesheets WHERE id = timesheet_entries.timesheet_id
    )
  ));

CREATE POLICY "Users can insert their own timesheet entries"
  ON timesheet_entries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending entries"
  ON timesheet_entries FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND status = 'pending'
  )
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
  );

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_timesheet_entries_timesheet_id ON timesheet_entries(timesheet_id);
CREATE INDEX IF NOT EXISTS idx_timesheet_entries_user_id ON timesheet_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_timesheet_entries_date ON timesheet_entries(date);
CREATE INDEX IF NOT EXISTS idx_timesheets_user_id ON timesheets(user_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_week_starting ON timesheets(week_starting);
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_projects_company_id ON projects(company_id);