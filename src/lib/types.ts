export type Warehouse =
  | 'BLASZAK_1'
  | 'BLASZAK_2'
  | 'WIATA'
  | 'MAG_LEWA'
  | 'MAG_PRAWA';

export const WAREHOUSE_LABELS: Record<Warehouse, string> = {
  BLASZAK_1: 'Blaszak 1',
  BLASZAK_2: 'Blaszak 2',
  WIATA: 'Wiata',
  MAG_LEWA: 'Magazyn Lewa Strona',
  MAG_PRAWA: 'Magazyn Prawa Strona',
};

// Konfiguracja kolumn dla każdego magazynu
export const WAREHOUSE_COLS: Record<Warehouse, string[]> = {
  BLASZAK_1: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],
  BLASZAK_2: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],
  WIATA:     ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
  MAG_LEWA:  ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
  MAG_PRAWA: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
};

// Liczba rzędów dla każdego magazynu
export const WAREHOUSE_ROWS: Record<Warehouse, number> = {
  BLASZAK_1: 5,
  BLASZAK_2: 8,
  WIATA:     10,
  MAG_LEWA:  12,
  MAG_PRAWA: 10,
};

// Typy magazynów - różne pola
export type WarehouseType = 'blaszak' | 'magazyn'; // blaszak = frakcja+waga, magazyn = kwit+skrobia+waga

export const WAREHOUSE_TYPES: Record<Warehouse, WarehouseType> = {
  BLASZAK_1: 'blaszak',
  BLASZAK_2: 'blaszak',
  WIATA:     'blaszak',
  MAG_LEWA:  'magazyn',
  MAG_PRAWA: 'magazyn',
};

export interface WarehouseEntry {
  id?: string;
  warehouse: Warehouse;
  entry_date: string;
  row_num: number;
  col_label: string;
  level: 'gora' | 'dol';
  product?: string | null;
  weight?: number | null;
  // Tylko dla magazyn lewa/prawa
  kwit?: string | null;
  skrobia?: number | null;
  client?: string | null;
  notes?: string | null;
  updated_by?: string | null;
  updated_at?: string;
}

export interface ContainerEntry {
  id?: string;
  container_num: number;
  entry_date: string;
  product_1?: string | null;
  weight_1?: number | null;
  product_2?: string | null;
  weight_2?: number | null;
  product_3?: string | null;
  weight_3?: number | null;
  product_4?: string | null;
  weight_4?: number | null;
  client?: string | null;
  notes?: string | null;
}

export interface AmbroEntry {
  id?: string;
  entry_date: string;
  product: string;
  operation: 'in' | 'out';
  quantity?: number | null;
  unit?: string;
  kwit?: string | null;
  notes?: string | null;
}

export interface InventorySummary {
  product: string;
  warehouse: string;
  entry_date: string;
  total_weight_warehouse: number;
}
