-- Supabase PostgreSQL schema and seed for BAI
-- Safe to run multiple times
BEGIN;

-- Required extension for bcrypt hashing via crypt()/gen_salt()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- USERS
CREATE TABLE IF NOT EXISTS public.users (
  id            BIGSERIAL NOT NULL,
  account_id    VARCHAR(100) NOT NULL,
  username      VARCHAR(100) NOT NULL,
  email         VARCHAR(255) NOT NULL,
  full_name     VARCHAR(200),
  hashed_password VARCHAR(255) NOT NULL,
  is_active     BOOLEAN DEFAULT TRUE,
  is_admin      BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ,
  PRIMARY KEY (account_id, id)
);

-- Uniqueness for auth flows
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_username_acc ON public.users(account_id, username);
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_account ON public.users(account_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_id ON public.users(id);

-- CUSTOMERS (minimal shape used by PostgresCustomerService)
CREATE TABLE IF NOT EXISTS public.customers (
  id            BIGSERIAL NOT NULL,
  account_id    VARCHAR(100) NOT NULL,
  name          VARCHAR(200) NOT NULL,
  email         VARCHAR(255),
  phone         VARCHAR(50),
  address       TEXT,
  state         VARCHAR(100),
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ,
  PRIMARY KEY (account_id, id)
);
CREATE INDEX IF NOT EXISTS idx_customers_account ON public.customers(account_id);
CREATE INDEX IF NOT EXISTS idx_customers_name_acc ON public.customers(account_id, name);

-- ITEMS (columns used by PostgresInventoryService)
CREATE TABLE IF NOT EXISTS public.items (
  id                 BIGSERIAL NOT NULL,
  account_id         VARCHAR(100) NOT NULL,
  item_code          VARCHAR(50) NOT NULL,
  name               VARCHAR(200) NOT NULL,
  description        TEXT,
  category           VARCHAR(100),
  unit               VARCHAR(20) DEFAULT 'pcs',
  purchase_price     NUMERIC(10,2),
  selling_price      NUMERIC(10,2) NOT NULL,
  tax_rate           NUMERIC(5,2) DEFAULT 0.00,
  stock_quantity     NUMERIC(10,3) DEFAULT 0.000,
  reorder_level      NUMERIC(10,3) DEFAULT 0.000,
  is_active          BOOLEAN DEFAULT TRUE,
  current_stock      NUMERIC(10,3) DEFAULT 0.000,
  cost_price         NUMERIC(10,2),
  minimum_stock      NUMERIC(10,3) DEFAULT 0.000,
  maximum_stock      NUMERIC(10,3),
  sku                VARCHAR(50),
  barcode            VARCHAR(50),
  hsn_code           VARCHAR(50),
  category_account_id VARCHAR(100),
  category_id        INTEGER,
  mrp                NUMERIC(10,2),
  weight             NUMERIC(8,3),
  dimensions         VARCHAR(100),
  is_service         BOOLEAN DEFAULT FALSE,
  track_inventory    BOOLEAN DEFAULT TRUE,
  has_expiry         BOOLEAN DEFAULT FALSE,
  shelf_life_days    INTEGER,
  expiry_date        TIMESTAMP,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ,
  PRIMARY KEY (account_id, id)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_items_acc_code ON public.items(account_id, item_code);
CREATE INDEX IF NOT EXISTS idx_items_account ON public.items(account_id);
CREATE INDEX IF NOT EXISTS idx_items_created ON public.items(created_at DESC);

-- Ensure composite primary keys even if tables already existed
-- (idempotent: drops existing PK and re-adds with (account_id, id))
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE public.users ADD CONSTRAINT users_pkey PRIMARY KEY (account_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_id ON public.users(id);

ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_pkey;
ALTER TABLE public.customers ADD CONSTRAINT customers_pkey PRIMARY KEY (account_id, id);

ALTER TABLE public.items DROP CONSTRAINT IF EXISTS items_pkey;
ALTER TABLE public.items ADD CONSTRAINT items_pkey PRIMARY KEY (account_id, id);

-- INVENTORY LOGS (used by PostgresInventoryService.log_inventory_action)
CREATE TABLE IF NOT EXISTS public.inventory_logs (
  id                      BIGSERIAL PRIMARY KEY,
  item_id                 BIGINT NOT NULL,
  item_account_id         VARCHAR(100) NOT NULL,
  action                  VARCHAR(50) NOT NULL,
  notes                   TEXT,
  recorded_by             INTEGER,
  recorded_by_account_id  VARCHAR(100),
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT fk_inventory_logs_item FOREIGN KEY (item_account_id, item_id)
    REFERENCES public.items(account_id, id) ON DELETE CASCADE
);
-- Ensure old single-column FK is replaced with composite FK (idempotent)
ALTER TABLE public.inventory_logs DROP CONSTRAINT IF EXISTS inventory_logs_item_id_fkey;
DO $$
BEGIN
  -- Recreate composite FK if missing
  IF NOT EXISTS (
    SELECT 1
    FROM   information_schema.table_constraints tc
    WHERE  tc.table_name = 'inventory_logs'
    AND    tc.constraint_type = 'FOREIGN KEY'
    AND    tc.constraint_name = 'fk_inventory_logs_item'
  ) THEN
    ALTER TABLE public.inventory_logs
      ADD CONSTRAINT fk_inventory_logs_item FOREIGN KEY (item_account_id, item_id)
      REFERENCES public.items(account_id, id) ON DELETE CASCADE;
  END IF;
END$$;
CREATE INDEX IF NOT EXISTS idx_inventory_logs_acc ON public.inventory_logs(item_account_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_item_acc ON public.inventory_logs(item_account_id, item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_created ON public.inventory_logs(created_at DESC);

-- Seed a default admin user (password: postgres)
INSERT INTO public.users (account_id, username, email, full_name, hashed_password, is_active, is_admin)
SELECT 'TestAccount', 'admin', 'admin@example.com', 'Admin User', crypt('postgres', gen_salt('bf', 12)), TRUE, TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM public.users WHERE account_id = 'TestAccount' AND username = 'admin'
);

-- Seed a couple of customers
INSERT INTO public.customers (account_id, name, email, phone, address, state)
SELECT 'TestAccount', 'Acme Corp', 'contact@acme.example', '+91-9876543210', '123 Business St, Chennai', 'Tamil Nadu'
WHERE NOT EXISTS (SELECT 1 FROM public.customers WHERE account_id='TestAccount' AND name='Acme Corp');

INSERT INTO public.customers (account_id, name, email, phone, address, state)
SELECT 'TestAccount', 'Globex Ltd', 'sales@globex.example', '+91-9123456780', '456 Market Ave, Bengaluru', 'Karnataka'
WHERE NOT EXISTS (SELECT 1 FROM public.customers WHERE account_id='TestAccount' AND name='Globex Ltd');

-- Seed a couple of items
INSERT INTO public.items (
  account_id, item_code, name, selling_price, description, category, unit,
  purchase_price, tax_rate, stock_quantity, reorder_level, is_active,
  current_stock, cost_price, minimum_stock, maximum_stock, sku, barcode,
  category_account_id, category_id, mrp, weight, dimensions, is_service,
  track_inventory, has_expiry, shelf_life_days
) SELECT
  'TestAccount','SKU-001','Sample Item 1', 499.00, 'First sample item','General','pcs',
  350.00, 18.00, 100.000, 10.000, TRUE,
  100.000, 350.00, 10.000, NULL, 'SKU-001', NULL,
  'TestAccount', 1, 499.00, NULL, NULL, FALSE,
  TRUE, FALSE, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.items WHERE account_id='TestAccount' AND item_code='SKU-001');

INSERT INTO public.items (
  account_id, item_code, name, selling_price, description, category, unit,
  purchase_price, tax_rate, stock_quantity, reorder_level, is_active,
  current_stock, cost_price, minimum_stock, maximum_stock, sku, barcode,
  category_account_id, category_id, mrp, weight, dimensions, is_service,
  track_inventory, has_expiry, shelf_life_days
) SELECT
  'TestAccount','SKU-002','Sample Item 2', 799.00, 'Second sample item','General','pcs',
  600.00, 18.00, 50.000, 5.000, TRUE,
  50.000, 600.00, 5.000, NULL, 'SKU-002', NULL,
  'TestAccount', 1, 799.00, NULL, NULL, FALSE,
  TRUE, FALSE, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.items WHERE account_id='TestAccount' AND item_code='SKU-002');

-- Add user profile columns if missing
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS first_name        VARCHAR(100),
  ADD COLUMN IF NOT EXISTS last_name         VARCHAR(100),
  ADD COLUMN IF NOT EXISTS phone             VARCHAR(20),
  ADD COLUMN IF NOT EXISTS mobile            VARCHAR(20),
  ADD COLUMN IF NOT EXISTS address           TEXT,
  ADD COLUMN IF NOT EXISTS city              VARCHAR(100),
  ADD COLUMN IF NOT EXISTS state             VARCHAR(100),
  ADD COLUMN IF NOT EXISTS postal_code       VARCHAR(20),
  ADD COLUMN IF NOT EXISTS company           VARCHAR(200),
  ADD COLUMN IF NOT EXISTS designation       VARCHAR(200),
  ADD COLUMN IF NOT EXISTS last_login        TIMESTAMPTZ;

-- Create organizations table for organization profile/settings
CREATE TABLE IF NOT EXISTS public.organizations (
  id                         BIGSERIAL PRIMARY KEY,
  account_id                 VARCHAR(255) NOT NULL UNIQUE,
  company_name               VARCHAR(255) NOT NULL,
  business_type              VARCHAR(100),
  industry                   VARCHAR(100),
  founded_year               VARCHAR(10),
  employee_count             VARCHAR(50),
  registration_number        VARCHAR(100),
  tax_id                     VARCHAR(100),
  gst_number                 VARCHAR(100),
  pan_number                 VARCHAR(100),
  phone                      VARCHAR(50),
  email                      VARCHAR(255),
  website                    VARCHAR(255),
  currency                   VARCHAR(10)  DEFAULT 'INR',
  timezone                   VARCHAR(100) DEFAULT 'Asia/Kolkata',
  fiscal_year_start          VARCHAR(10),
  address                    TEXT,
  city                       VARCHAR(100),
  state                      VARCHAR(100),
  postal_code                VARCHAR(20),
  country                    VARCHAR(100) DEFAULT 'India',
  bank_name                  VARCHAR(255),
  bank_account_number        VARCHAR(50),
  bank_account_holder_name   VARCHAR(255),
  bank_ifsc_code             VARCHAR(20),
  bank_branch_name           VARCHAR(255),
  bank_branch_address        TEXT,
  bank_account_type          VARCHAR(50),
  bank_swift_code            VARCHAR(20),
  description                TEXT,
  logo_url                   VARCHAR(500),
  logo_data                  TEXT,
  is_verified                BOOLEAN      DEFAULT FALSE,
  created_at                 TIMESTAMPTZ  DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_organizations_account_id ON public.organizations(account_id);

-- New columns for invoice enhancements
-- Add terms and conditions to organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS terms_and_conditions TEXT;

-- Add digital signature preferences to users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS signature_name VARCHAR(200),
  ADD COLUMN IF NOT EXISTS signature_style VARCHAR(50);

COMMIT;
