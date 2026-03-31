'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { WAREHOUSE_LABELS } from '@/lib/types';
import { Printer, Calendar, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

type ProductRow = {
  product: string;
  byWarehouse: Record<string, number>;
  total: number;
};

const WAREHOUSES = ['BLASZAK_1', 'BLASZAK_2', 'WIATA', 'MAG_LEWA', 'MAG_PRAWA'] as const;

export default function MagazynPage() {
  const supabase = createClient();
  const today = format(new Date(), 'yyyy-MM-dd');
  const [date, setDate] = useState(today);
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('warehouse_entries')
      .select('product, warehouse, weight')
      .eq('entry_date', date)
      .not('product', 'is', null)
      .not('weight', 'is', null);

    if (!error && data) {
      // Group by product
      const map = new Map<string, Record<string, number>>();
      data.forEach(({ product, warehouse, weight }) => {
        if (!product || !weight) return;
        const norm = product.trim();
        if (!map.has(norm)) map.set(norm, {});
        const wh = map.get(norm)!;
        wh[warehouse] = (wh[warehouse] || 0) + weight;
      });

      const result: ProductRow[] = [];
      map.forEach((byWarehouse, product) => {
        const total = Object.values(byWarehouse).reduce((a, b) => a + b, 0);
        result.push({ product, byWarehouse, total });
      });

      result.sort((a, b) => b.total - a.total);
      setRows(result);
    }
    setLoading(false);
  }, [date, supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  const grandTotal = rows.reduce((sum, r) => sum + r.total, 0);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 no-print"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <div>
          <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Podsumowanie Inwentury</h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Wszystkie magazyny — {rows.length} pozycji towarowych
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
            Odśwież
          </button>
          <button onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            <Printer size={13} />
            Drukuj
          </button>
        </div>
      </div>

      {/* Print header */}
      <div className="print-only hidden p-4">
        <h2 className="text-xl font-bold">Inwentura — {date}</h2>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Ładowanie danych...</div>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2">
            <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Brak danych dla wybranej daty</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Wprowadź dane w zakładkach magazynów</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs print-table" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  <th className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--text-secondary)', minWidth: '160px' }}>
                    Towar
                  </th>
                  {WAREHOUSES.map(wh => (
                    <th key={wh} className="text-right py-3 px-4 font-semibold"
                      style={{ color: 'var(--text-secondary)', minWidth: '110px' }}>
                      {WAREHOUSE_LABELS[wh]}
                    </th>
                  ))}
                  <th className="text-right py-3 px-4 font-semibold" style={{ color: 'var(--accent)' }}>
                    SUMA
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.product}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                    }}>
                    <td className="py-2.5 px-4 font-medium" style={{ color: 'var(--text-primary)' }}>
                      {row.product}
                    </td>
                    {WAREHOUSES.map(wh => (
                      <td key={wh} className="py-2.5 px-4 text-right font-mono"
                        style={{ color: row.byWarehouse[wh] ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        {row.byWarehouse[wh]
                          ? `${row.byWarehouse[wh].toLocaleString('pl-PL')} kg`
                          : '—'}
                      </td>
                    ))}
                    <td className="py-2.5 px-4 text-right font-mono font-bold"
                      style={{ color: 'var(--accent)' }}>
                      {row.total.toLocaleString('pl-PL')} kg
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--border)' }}>
                  <td className="py-3 px-4 font-bold" style={{ color: 'var(--text-primary)' }}>
                    RAZEM
                  </td>
                  {WAREHOUSES.map(wh => {
                    const total = rows.reduce((sum, r) => sum + (r.byWarehouse[wh] || 0), 0);
                    return (
                      <td key={wh} className="py-3 px-4 text-right font-mono font-bold"
                        style={{ color: total ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                        {total ? `${total.toLocaleString('pl-PL')} kg` : '—'}
                      </td>
                    );
                  })}
                  <td className="py-3 px-4 text-right font-mono text-base font-bold"
                    style={{ color: 'var(--success)' }}>
                    {grandTotal.toLocaleString('pl-PL')} kg
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
