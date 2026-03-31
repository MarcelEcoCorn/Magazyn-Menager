'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { WarehouseEntry, Warehouse, WAREHOUSE_COLS, WAREHOUSE_ROWS } from '@/lib/types';
import { Printer, Save, RefreshCw, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface BlaszakGridProps {
  warehouse: Warehouse;
  title: string;
  initialDate?: string;
}

type CellKey = string; // `${row}_${col}_${level}`
type CellField = 'product' | 'weight';

function cellKey(row: number, col: string, level: 'gora' | 'dol') {
  return `${row}_${col}_${level}`;
}

function inputId(row: number, col: string, level: 'gora' | 'dol', field: CellField) {
  return `inp_${row}_${col}_${level}_${field}`;
}

export default function BlaszakGrid({ warehouse, title, initialDate }: BlaszakGridProps) {
  const supabase = createClient();
  const cols = WAREHOUSE_COLS[warehouse];
  const rows = WAREHOUSE_ROWS[warehouse];
  const today = format(new Date(), 'yyyy-MM-dd');
  const [date, setDate] = useState(initialDate || today);
  const [entries, setEntries] = useState<Map<CellKey, WarehouseEntry>>(new Map());
  const [saving, setSaving] = useState<Set<CellKey>>(new Set());
  const [loading, setLoading] = useState(false);
  const saveTimers = useRef<Map<CellKey, ReturnType<typeof setTimeout>>>(new Map());

  // Load data
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
    return entries.get(key) || { warehouse, entry_date: date, row_num: row, col_label: col, level, product: '', weight: null };
  }

  function updateEntry(row: number, col: string, level: 'gora' | 'dol', field: CellField, value: string) {
    const key = cellKey(row, col, level);
    const existing = getEntry(row, col, level);
    const updated: WarehouseEntry = {
      ...existing,
      [field]: field === 'weight' ? (value === '' ? null : parseFloat(value) || null) : value,
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
    
    const payload = {
      warehouse: entry.warehouse,
      entry_date: entry.entry_date,
      row_num: entry.row_num,
      col_label: entry.col_label,
      level: entry.level,
      product: entry.product || null,
      weight: entry.weight ?? null,
    };

    const { error } = await supabase
      .from('warehouse_entries')
      .upsert(payload, {
        onConflict: 'warehouse,entry_date,row_num,col_label,level',
      });

    setSaving(prev => { const s = new Set(prev); s.delete(key); return s; });
    if (!error) {
      // Refresh to get ID
      loadData();
    }
  }

  // Keyboard navigation between cells
  function handleKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>,
    row: number, col: string, level: 'gora' | 'dol', field: CellField
  ) {
    const colIdx = cols.indexOf(col);
    let nextId: string | null = null;

    if (e.key === 'ArrowRight' || (e.key === 'Tab' && !e.shiftKey)) {
      e.preventDefault();
      if (field === 'product') {
        nextId = inputId(row, col, level, 'weight');
      } else {
        // Move to next col, same level
        if (colIdx < cols.length - 1) {
          nextId = inputId(row, cols[colIdx + 1], level, 'product');
        } else {
          // Wrap to next row, same level
          nextId = inputId(row + 1 <= rows ? row + 1 : 1, cols[0], level, 'product');
        }
      }
    } else if (e.key === 'ArrowLeft' || (e.key === 'Tab' && e.shiftKey)) {
      e.preventDefault();
      if (field === 'weight') {
        nextId = inputId(row, col, level, 'product');
      } else {
        if (colIdx > 0) {
          nextId = inputId(row, cols[colIdx - 1], level, 'weight');
        }
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (level === 'gora') {
        nextId = inputId(row, col, 'dol', field);
      } else {
        if (row < rows) nextId = inputId(row + 1, col, 'gora', field);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (level === 'dol') {
        nextId = inputId(row, col, 'gora', field);
      } else {
        if (row > 1) nextId = inputId(row - 1, col, 'dol', field);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      nextId = inputId(row, col, level === 'gora' ? 'dol' : 'gora', field);
    }

    if (nextId) {
      document.getElementById(nextId)?.focus();
    }
  }

  // Calculate column totals
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
    let total = 0;
    cols.forEach(col => { total += colTotal(col) || 0; });
    return total || null;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 no-print"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <div>
          <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {loading ? 'Ładowanie...' : `${cols.length} kolumn × ${rows} rzędów`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Date picker */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <Calendar size={13} style={{ color: 'var(--text-muted)' }} />
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="text-xs outline-none"
              style={{ background: 'transparent', color: 'var(--text-primary)', border: 'none' }}
            />
          </div>

          <button onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Odśwież
          </button>

          <button onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            <Printer size={13} />
            Drukuj
          </button>
        </div>
      </div>

      {/* Print header */}
      <div className="print-only hidden p-4">
        <h2 className="text-xl font-bold">{title} — {date}</h2>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-xs print-table" style={{ borderCollapse: 'separate', borderSpacing: '2px' }}>
            <thead>
              <tr>
                <th className="w-8 text-center" style={{ color: 'var(--text-muted)' }}>#</th>
                {cols.map(col => (
                  <th key={col} colSpan={2} className="text-center py-2 px-1 font-semibold rounded-t-md"
                    style={{
                      color: 'var(--accent)',
                      background: 'rgba(56,189,248,0.08)',
                      border: '1px solid rgba(56,189,248,0.15)',
                      minWidth: '160px',
                    }}>
                    {col}
                  </th>
                ))}
              </tr>
              <tr>
                <td />
                {cols.map(col => (
                  <>
                    <td key={`${col}-prod`} className="text-center py-1"
                      style={{ color: 'var(--text-muted)', fontSize: '10px', width: '100px' }}>towar</td>
                    <td key={`${col}-wag`} className="text-center py-1"
                      style={{ color: 'var(--text-muted)', fontSize: '10px', width: '60px' }}>kg</td>
                  </>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rows }, (_, i) => i + 1).map(row => (
                <>
                  {/* GÓRA row */}
                  <tr key={`${row}-gora`}>
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
                    {cols.map(col => {
                      const key = cellKey(row, col, 'gora');
                      const entry = getEntry(row, col, 'gora');
                      const isSaving = saving.has(key);
                      return (
                        <>
                          <td key={`${col}-prod`} className="warehouse-cell rounded-tl-md rounded-bl-none"
                            style={{ padding: '3px 5px', position: 'relative' }}>
                            {isSaving && (
                              <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full"
                                style={{ background: 'var(--warning)' }} />
                            )}
                            <div style={{ fontSize: '9px', color: 'var(--accent)', marginBottom: '1px' }} className="badge-gora px-1 rounded inline-block">↑ góra</div>
                            <input
                              id={inputId(row, col, 'gora', 'product')}
                              className="cell-input"
                              value={entry.product || ''}
                              onChange={e => updateEntry(row, col, 'gora', 'product', e.target.value)}
                              onKeyDown={e => handleKeyDown(e, row, col, 'gora', 'product')}
                              placeholder="frakcja"
                            />
                          </td>
                          <td key={`${col}-wag`} className="warehouse-cell"
                            style={{ padding: '3px 5px', textAlign: 'right' }}>
                            <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginBottom: '1px' }}>kg</div>
                            <input
                              id={inputId(row, col, 'gora', 'weight')}
                              className="cell-input weight-input"
                              type="number"
                              value={entry.weight ?? ''}
                              onChange={e => updateEntry(row, col, 'gora', 'weight', e.target.value)}
                              onKeyDown={e => handleKeyDown(e, row, col, 'gora', 'weight')}
                              placeholder="0"
                            />
                          </td>
                        </>
                      );
                    })}
                  </tr>

                  {/* DÓŁ row */}
                  <tr key={`${row}-dol`}>
                    {cols.map(col => {
                      const key = cellKey(row, col, 'dol');
                      const entry = getEntry(row, col, 'dol');
                      const isSaving = saving.has(key);
                      return (
                        <>
                          <td key={`${col}-prod`} className="warehouse-cell"
                            style={{ padding: '3px 5px', position: 'relative', borderTop: '1px dashed var(--border)' }}>
                            {isSaving && (
                              <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full"
                                style={{ background: 'var(--warning)' }} />
                            )}
                            <div style={{ fontSize: '9px', color: '#6ee7b7', marginBottom: '1px' }} className="badge-dol px-1 rounded inline-block">↓ dół</div>
                            <input
                              id={inputId(row, col, 'dol', 'product')}
                              className="cell-input"
                              value={entry.product || ''}
                              onChange={e => updateEntry(row, col, 'dol', 'product', e.target.value)}
                              onKeyDown={e => handleKeyDown(e, row, col, 'dol', 'product')}
                              placeholder="frakcja"
                            />
                          </td>
                          <td key={`${col}-wag`} className="warehouse-cell"
                            style={{ padding: '3px 5px', textAlign: 'right', borderTop: '1px dashed var(--border)' }}>
                            <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginBottom: '1px' }}>kg</div>
                            <input
                              id={inputId(row, col, 'dol', 'weight')}
                              className="cell-input weight-input"
                              type="number"
                              value={entry.weight ?? ''}
                              onChange={e => updateEntry(row, col, 'dol', 'weight', e.target.value)}
                              onKeyDown={e => handleKeyDown(e, row, col, 'dol', 'weight')}
                              placeholder="0"
                            />
                          </td>
                        </>
                      );
                    })}
                  </tr>
                </>
              ))}
            </tbody>

            {/* Totals footer */}
            <tfoot>
              <tr>
                <td className="text-center text-xs font-bold py-2" style={{ color: 'var(--text-muted)' }}>Σ</td>
                {cols.map(col => {
                  const total = colTotal(col);
                  return (
                    <>
                      <td key={`${col}-lbl`} className="text-right pr-2 text-xs font-medium"
                        style={{ color: 'var(--text-secondary)', paddingTop: '8px' }}>
                        kolumna {col}:
                      </td>
                      <td key={`${col}-val`} className="text-right font-mono font-semibold"
                        style={{ color: total ? 'var(--success)' : 'var(--text-muted)', paddingTop: '8px', paddingRight: '5px' }}>
                        {total ? `${total.toLocaleString('pl-PL')} kg` : '—'}
                      </td>
                    </>
                  );
                })}
              </tr>
              <tr>
                <td colSpan={cols.length * 2 + 1} className="text-right py-3 pr-4">
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
