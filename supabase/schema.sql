-- ============================================
-- SCHEMA: Aplikacja Zarządzania Magazynem
-- ============================================

-- Włącz RLS (Row Level Security)
-- Supabase Auth obsługuje użytkowników automatycznie

-- ============================================
-- TABELA: warehouse_entries
-- Główna tabela dla wszystkich magazynów
-- BLASZAK 1, BLASZAK 2, WIATA, MAG LEWA, MAG PRAWA
-- ============================================
CREATE TABLE IF NOT EXISTS warehouse_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  warehouse TEXT NOT NULL, -- 'BLASZAK_1', 'BLASZAK_2', 'WIATA', 'MAG_LEWA', 'MAG_PRAWA'
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  row_num INTEGER NOT NULL,         -- numer rzędu (1-12 etc.)
  col_label TEXT NOT NULL,          -- kolumna A-J
  level TEXT NOT NULL CHECK (level IN ('gora', 'dol')), -- góra / dół
  product TEXT,                     -- nazwa towaru / frakcja
  weight NUMERIC(10,2),             -- waga w kg
  -- Pola specyficzne dla MAGAZYN LEWA/PRAWA STRONA
  kwit TEXT,                        -- numer kwitu wagowego (może być "410/457")
  skrobia NUMERIC(5,2),             -- zawartość skrobi w %
  client TEXT,                      -- klient / przeznaczenie
  notes TEXT,                       -- dodatkowe uwagi
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(warehouse, entry_date, row_num, col_label, level)
);

-- ============================================
-- TABELA: warehouse_snapshots
-- Historia zmian - każdy zapis dnia
-- ============================================
CREATE TABLE IF NOT EXISTS warehouse_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  warehouse TEXT NOT NULL,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

-- ============================================
-- TABELA: containers
-- Zakładka KONTENERY - 6 kontenerów
-- ============================================
CREATE TABLE IF NOT EXISTS containers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  container_num INTEGER NOT NULL CHECK (container_num BETWEEN 1 AND 6),
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  product_1 TEXT,
  weight_1 NUMERIC(10,2),
  product_2 TEXT,
  weight_2 NUMERIC(10,2),
  product_3 TEXT,
  weight_3 NUMERIC(10,2),
  product_4 TEXT,
  weight_4 NUMERIC(10,2),
  client TEXT,                      -- przeznaczenie / klient
  notes TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(container_num, entry_date)
);

-- ============================================
-- TABELA: ambro_entries
-- Zakładka AMBRO - magazyn zewnętrzny
-- ============================================
CREATE TABLE IF NOT EXISTS ambro_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  product TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('in', 'out')), -- przyjęcie / wydanie
  quantity NUMERIC(10,2),
  unit TEXT DEFAULT 'kg',
  kwit TEXT,                        -- numer kwitu wagowego
  notes TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- WIDOK: inventory_summary
-- Podsumowanie dla zakładki MAGAZYN
-- ============================================
CREATE OR REPLACE VIEW inventory_summary AS
SELECT
  product,
  warehouse,
  entry_date,
  SUM(weight) AS total_weight_warehouse
FROM warehouse_entries
WHERE product IS NOT NULL
  AND weight IS NOT NULL
GROUP BY product, warehouse, entry_date;

-- ============================================
-- WIDOK: inventory_totals
-- Suma wszystkich magazynów per produkt
-- ============================================
CREATE OR REPLACE VIEW inventory_totals AS
SELECT
  product,
  entry_date,
  SUM(weight) AS total_weight_all
FROM warehouse_entries
WHERE product IS NOT NULL
  AND weight IS NOT NULL
GROUP BY product, entry_date;

-- ============================================
-- INDEKSY dla wydajności
-- ============================================
CREATE INDEX IF NOT EXISTS idx_warehouse_entries_warehouse ON warehouse_entries(warehouse);
CREATE INDEX IF NOT EXISTS idx_warehouse_entries_date ON warehouse_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_warehouse_entries_product ON warehouse_entries(product);
CREATE INDEX IF NOT EXISTS idx_ambro_entries_date ON ambro_entries(entry_date);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE warehouse_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE containers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ambro_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_snapshots ENABLE ROW LEVEL SECURITY;

-- Zalogowani użytkownicy mogą czytać i pisać
CREATE POLICY "Authenticated users can read warehouse_entries"
  ON warehouse_entries FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert warehouse_entries"
  ON warehouse_entries FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update warehouse_entries"
  ON warehouse_entries FOR UPDATE
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete warehouse_entries"
  ON warehouse_entries FOR DELETE
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can read containers"
  ON containers FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert containers"
  ON containers FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update containers"
  ON containers FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read ambro"
  ON ambro_entries FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert ambro"
  ON ambro_entries FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update ambro"
  ON ambro_entries FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete ambro"
  ON ambro_entries FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read snapshots"
  ON warehouse_snapshots FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert snapshots"
  ON warehouse_snapshots FOR INSERT TO authenticated WITH CHECK (true);
