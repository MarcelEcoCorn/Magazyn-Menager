'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { WarehouseEntry, Warehouse, WAREHOUSE_COLS, WAREHOUSE_ROWS } from '@/lib/types';
import { Printer, RefreshCw, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface MagazynGridProps {
  warehouse: Warehouse;
  title: string;
}

type CellKey = string;
type MagazynField = 'kwit' | 'skrobia' | 'weight' | 'product' | 'client';

function cellKey(row: number, col: string, level: 'gora' | 'dol') {
  return `${row}_${col}_${level}`;
}

function inputId(row: number, col: string, level: 'gora' | 'dol', field: MagazynField) {
  return `inp_${row}_${col}_${level}_${field}`;
}

export default function MagazynGrid({ warehouse, title }: MagazynGridProps) {
  const supabase = createClient();
  const cols = WAREHOUSE_COLS[warehouse];
  const rows = WAREHOUSE_ROWS[warehouse];
  const today = format(new Date(), 'yyyy-MM-dd');
  const [date, setDate] = useState(today);
  const [entries, setEntries] = useState<Map<CellKey, WarehouseEntry>>(new Map());
  const [saving, setSaving] = useState<Set<CellKey>>(new Set());
  const [loading, setLoading] = useState(false);
  const saveTimers = useRef<Map<CellKey, ReturnType<typeof setTimeout>>>(new Map());

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('warehouse_entries')
      .select('*')
      .eq('warehouse', warehouse)
      .eq('entry_date', date);

    if (!error && data) {
      const map = new Map<CellKey, WarehouseEntry>();
      data.forEach(entry => {
        map.set(cellKey(entry.row_num, entry.col_label, entry.level), entry);
      });
      setEntries(map);
    }
    setLoading(false);
  }, [warehouse, date, supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  function getEntry(row: number, col: string, level: 'gora' | 'dol'): WarehouseEntry {
    const key = cellKey(row, col, level);
    return entries.get(key) || {
      warehouse, entry_date: date, row_num: row, col_label: col, level,
      kwit: '', skrobia: null, weight: null, product: '', client: '',
    };
  }

  function updateEntry(row: number, col: string, level: 'gora' | 'dol', field: MagazynField, value: string) {
    const key = cellKey(row, col, level);
    const existing = getEntry(row, col, level);
    const updated: WarehouseEntry = {
      ...existing,
      [field]: (field === 'weight' || field === 'skrobia')
        ? (value === '' ? null : parseFloat(value) || null)
        : value,
    };
    setEntries(prev => new Map(prev).set(key, updated));
    debounceSave(key, updated);
  }

  function debounceSave(key: CellKey, entry: WarehouseEntry) {
    if (saveTimers.current.has(key)) clearTimeout(saveTimers.current.get(key)!);
    const timer = setTimeout(() => saveEntry(key, entry), 800);
    saveTimers.current.set(key, timer);
  }

  async function saveEntry(key: CellKey, entry: WarehouseEntry) {
    setSaving(prev => new Set(prev).add(key));
    await supabase.from('warehouse_entries').upsert({
      warehouse: entry.warehouse,
      entry_date: entry.entry_date,
      row_num: entry.row_num,
      col_label: entry.col_label,
      level: entry.level,
      product: entry.product || null,
      weight: entry.weight ?? null,
      kwit: entry.kwit || null,
      skrobia: entry.skrobia ?? null,
      client: entry.client || null,
      notes: entry.notes || null,
    }, { onConflict: 'warehouse,entry_date,row_num,col_label,level' });
    setSaving(prev => { const s = new Set(prev); s.delete(key); return s; });
  }

  // Keyboard navigation: Tab moves right through fields, arrows move between cells
  function handleKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>,
    row: number, col: string, level: 'gora' | 'dol', field: MagazynField
  ) {
    const colIdx = cols.indexOf(col);
    const fieldOrder: MagazynField[] = ['kwit', 'skrobia', 'weight', 'product', 'client'];
    const fieldIdx = fieldOrder.indexOf(field);
    let nextId: string | null = null;

    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      if (fieldIdx < fieldOrder.length - 1) {
        nextId = inputId(row, col, level, fieldOrder[fieldIdx + 1]);
      } else {
        // next col
        if (colIdx < cols.length - 1) {
          nextId = inputId(row, cols[colIdx + 1], level, fieldOrder[0]);
        } else {
          nextId = inputId(row + 1 <= rows ? row + 1 : 1, cols[0], level, fieldOrder[0]);
        }
      }
    } else if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault();
      if (fieldIdx > 0) {
        nextId = inputId(row, col, level, fieldOrder[fieldIdx - 1]);
      } else if (colIdx > 0) {
        nextId = inputId(row, cols[colIdx - 1], level, fieldOrder[fieldOrder.length - 1]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (level === 'gora') nextId = inputId(row, col, 'dol', field);
      else if (row < rows) nextId = inputId(row + 1, col, 'gora', field);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (level === 'dol') nextId = inputId(row, col, 'gora', field);
      else if (row > 1) nextId = inputId(row - 1, col, 'dol', field);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      nextId = inputId(row, col, level === 'gora' ? 'dol' : 'gora', field);
    }

    if (nextId) document.getElementById(nextId)?.focus();
  }

  function colTotal(col: string) {
    let total = 0;
    for (let r = 1; r <= rows; r++) {
      const g = getEntry(r, col, 'gora').weight;
      const d = getEntry(r, col, 'dol').weight;
      if (g) total += g;
      if (d) total += d;
    }
    return total || null;
  }

  function grandTotal() {
    return cols.reduce((sum, col) => sum + (colTotal(col) || 0), 0) || null;
  }

  const FIELD_LABELS: Record<MagazynField, string> = {
    kwit: 'Kwit',
    skrobia: 'Skrobia %',
    weight: 'Waga kg',
    product: 'Towar',
    client: 'Klient',
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 no-print"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <div>
          <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Kwit wagowy · Skrobia · Waga — {cols.length} kolumn × {rows} rzędów
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <Calendar size={13} style={{ color: 'var(--text-muted)' }} />
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="text-xs outline-none"
              style={{ background: 'transparent', color: 'var(--text-primary)', border: 'none' }} />
          </div>
          <button onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            <Printer size={13} />
            Drukuj
          </button>
        </div>
      </div>

      <div className="print-only hidden p-4">
        <h2 className="text-xl font-bold">{title} — {date}</h2>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="overflow-x-auto">
          <table className="text-xs print-table" style={{ borderCollapse: 'separate', borderSpacing: '2px' }}>
            <thead>
              <tr>
                <th className="w-8" style={{ color: 'var(--text-muted)' }}>#</th>
                {cols.map(col => (
                  <th key={col} colSpan={5} className="text-center py-2 px-2 font-semibold rounded-t"
                    style={{
                      color: 'var(--accent)',
                      background: 'rgba(56,189,248,0.08)',
                      border: '1px solid rgba(56,189,248,0.15)',
                      minWidth: '320px',
                    }}>
                    {col}
                  </th>
                ))}
              </tr>
              <tr>
                <td />
                {cols.map(col => (
                  Object.entries(FIELD_LABELS).map(([f, label]) => (
                    <td key={`${col}-${f}`} className="text-center py-1"
                      style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
                      {label}
                    </td>
                  ))
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rows }, (_, i) => i + 1).map(row => (
                (['gora', 'dol'] as const).map(level => {
                  return (
                    <tr key={`${row}-${level}`}>
                      {level === 'gora' && (
                        <td rowSpan={2} className="text-center font-mono font-semibold"
                          style={{
                            color: 'var(--text-muted)',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border)',
                            borderRadius: '4px',
                            padding: '2px 6px',
                            verticalAlign: 'middle',
                          }}>
                          {row}
                        </td>
                      )}
                      {cols.map(col => {
                        const key = cellKey(row, col, level);
                        const entry = getEntry(row, col, level);
                        const isSaving = saving.has(key);
                        const isGora = level === 'gora';
                        const borderStyle = isGora
                          ? '1px solid var(--border)'
                          : '1px dashed var(--border)';

                        return (
                          <>
                            {/* KWIT */}
                            <td key="kwit" className="warehouse-cell"
                              style={{ padding: '3px 5px', minWidth: '72px', position: 'relative', borderTop: borderStyle }}>
                              {isSaving && <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full" style={{ background: 'var(--warning)' }} />}
                              <div style={{ fontSize: '9px', marginBottom: '1px' }}
                                className={isGora ? 'badge-gora px-1 rounded inline-block' : 'badge-dol px-1 rounded inline-block'}>
                                {isGora ? '↑ góra' : '↓ dół'}
                              </div>
                              <input
                                id={inputId(row, col, level, 'kwit')}
                                className="cell-input font-mono"
                                style={{ fontSize: '12px', color: 'var(--warning)' }}
                                value={entry.kwit || ''}
                                onChange={e => updateEntry(row, col, level, 'kwit', e.target.value)}
                                onKeyDown={e => handleKeyDown(e, row, col, level, 'kwit')}
                                placeholder="nr kwitu"
                              />
                            </td>
                            {/* SKROBIA */}
                            <td key="skrobia" className="warehouse-cell"
                              style={{ padding: '3px 5px', minWidth: '60px', borderTop: borderStyle }}>
                              <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginBottom: '1px' }}>skrobia</div>
                              <input
                                id={inputId(row, col, level, 'skrobia')}
                                className="cell-input"
                                style={{ color: '#c084fc', fontFamily: 'var(--font-mono)', fontSize: '12px' }}
                                value={entry.skrobia ?? ''}
                                onChange={e => updateEntry(row, col, level, 'skrobia', e.target.value)}
                                onKeyDown={e => handleKeyDown(e, row, col, level, 'skrobia')}
                                placeholder="%"
                              />
                            </td>
                            {/* WAGA */}
                            <td key="weight" className="warehouse-cell"
                              style={{ padding: '3px 5px', minWidth: '60px', borderTop: borderStyle }}>
                              <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginBottom: '1px' }}>kg</div>
                              <input
                                id={inputId(row, col, level, 'weight')}
                                className="cell-input weight-input"
                                type="number"
                                value={entry.weight ?? ''}
                                onChange={e => updateEntry(row, col, level, 'weight', e.target.value)}
                                onKeyDown={e => handleKeyDown(e, row, col, level, 'weight')}
                                placeholder="0"
                              />
                            </td>
                            {/* TOWAR */}
                            <td key="product" className="warehouse-cell"
                              style={{ padding: '3px 5px', minWidth: '80px', borderTop: borderStyle }}>
                              <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginBottom: '1px' }}>towar</div>
                              <input
                                id={inputId(row, col, level, 'product')}
                                className="cell-input"
                                value={entry.product || ''}
                                onChange={e => updateEntry(row, col, level, 'product', e.target.value)}
                                onKeyDown={e => handleKeyDown(e, row, col, level, 'product')}
                                placeholder="towar"
                              />
                            </td>
                            {/* KLIENT */}
                            <td key="client" className="warehouse-cell"
                              style={{ padding: '3px 5px', minWidth: '80px', borderTop: borderStyle }}>
                              <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginBottom: '1px' }}>klient</div>
                              <input
                                id={inputId(row, col, level, 'client')}
                                className="cell-input"
                                style={{ color: '#34d399' }}
                                value={entry.client || ''}
                                onChange={e => updateEntry(row, col, level, 'client', e.target.value)}
                                onKeyDown={e => handleKeyDown(e, row, col, level, 'client')}
                                placeholder="klient"
                              />
                            </td>
                          </>
                        );
                      })}
                    </tr>
                  );
                })
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td />
                {cols.map(col => {
                  const total = colTotal(col);
                  return (
                    <>
                      <td colSpan={2} key={`${col}-lbl`} className="text-right pr-2 font-medium pt-3"
                        style={{ color: 'var(--text-secondary)' }}>
                        kol. {col}:
                      </td>
                      <td key={`${col}-val`} className="font-mono font-bold pt-3"
                        style={{ color: total ? 'var(--success)' : 'var(--text-muted)' }}>
                        {total ? `${total.toLocaleString('pl-PL')} kg` : '—'}
                      </td>
                      <td colSpan={2} />
                    </>
                  );
                })}
              </tr>
              <tr>
                <td colSpan={cols.length * 5 + 1} className="text-right py-3 pr-4">
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>RAZEM: </span>
                  <span className="text-base font-bold font-mono" style={{ color: 'var(--accent)' }}>
                    {grandTotal() ? `${grandTotal()!.toLocaleString('pl-PL')} kg` : '—'}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
