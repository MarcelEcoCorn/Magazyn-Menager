'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AmbroEntry } from '@/lib/types';
import { Printer, RefreshCw, Calendar, Plus, Trash2, ArrowDown, ArrowUp } from 'lucide-react';
import { format } from 'date-fns';

export default function AmbroPage() {
  const supabase = createClient();
  const today = format(new Date(), 'yyyy-MM-dd');
  const [date, setDate] = useState(today);
  const [entries, setEntries] = useState<AmbroEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('ambro_entries')
      .select('*')
      .eq('entry_date', date)
      .order('created_at', { ascending: true });
    setEntries(data || []);
    setLoading(false);
  }, [date, supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  async function addRow(operation: 'in' | 'out') {
    const newEntry: AmbroEntry = {
      entry_date: date,
      product: '',
      operation,
      quantity: null,
      unit: 'kg',
      kwit: '',
      notes: '',
    };
    const { data } = await supabase.from('ambro_entries').insert(newEntry).select().single();
    if (data) setEntries(prev => [...prev, data]);
  }

  async function updateRow(id: string, field: keyof AmbroEntry, value: string) {
    const updated = entries.map(e => e.id === id
      ? { ...e, [field]: field === 'quantity' ? (value === '' ? null : parseFloat(value) || null) : value }
      : e
    );
    setEntries(updated);
    const entry = updated.find(e => e.id === id)!;
    await supabase.from('ambro_entries').update({
      product: entry.product,
      operation: entry.operation,
      quantity: entry.quantity,
      unit: entry.unit,
      kwit: entry.kwit,
      notes: entry.notes,
    }).eq('id', id);
  }

  async function deleteRow(id: string) {
    await supabase.from('ambro_entries').delete().eq('id', id);
    setEntries(prev => prev.filter(e => e.id !== id));
  }

  const totalIn = entries.filter(e => e.operation === 'in').reduce((s, e) => s + (e.quantity || 0), 0);
  const totalOut = entries.filter(e => e.operation === 'out').reduce((s, e) => s + (e.quantity || 0), 0);
  const balance = totalIn - totalOut;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 no-print"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <div>
          <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>AMBRO</h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Magazyn zewnętrzny — przyjęcia i wydania</p>
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
        <h2 className="text-xl font-bold">AMBRO — {date}</h2>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div style={{ maxWidth: '900px' }} className="space-y-4">

          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3 no-print">
            {[
              { label: 'Przyjęcia (+)', value: totalIn, color: 'var(--success)' },
              { label: 'Wydania (−)', value: totalOut, color: 'var(--danger)' },
              { label: 'Saldo', value: balance, color: balance >= 0 ? 'var(--success)' : 'var(--danger)' },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl px-4 py-3"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{label}</div>
                <div className="font-mono font-bold text-lg" style={{ color }}>
                  {value.toLocaleString('pl-PL')} kg
                </div>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 no-print">
            <button onClick={() => addRow('in')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all"
              style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.25)', color: 'var(--success)' }}>
              <Plus size={13} />
              <ArrowDown size={13} />
              Dodaj przyjęcie
            </button>
            <button onClick={() => addRow('out')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all"
              style={{ background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.25)', color: 'var(--danger)' }}>
              <Plus size={13} />
              <ArrowUp size={13} />
              Dodaj wydanie
            </button>
          </div>

          {/* Table */}
          {entries.length === 0 ? (
            <div className="text-center py-12 text-sm" style={{ color: 'var(--text-muted)' }}>
              Brak wpisów. Użyj przycisków powyżej.
            </div>
          ) : (
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              <table className="w-full text-xs print-table">
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                    {['Rodzaj', 'Towar', 'Ilość', 'Jm.', 'Nr kwitu', 'Uwagi', ''].map(h => (
                      <th key={h} className="text-left py-2.5 px-3 font-medium"
                        style={{ color: 'var(--text-secondary)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, i) => {
                    const isIn = entry.operation === 'in';
                    return (
                      <tr key={entry.id}
                        style={{
                          borderBottom: i < entries.length - 1 ? '1px solid var(--border)' : 'none',
                          background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                        }}>
                        <td className="py-2 px-3">
                          <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full w-fit"
                            style={{
                              background: isIn ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
                              color: isIn ? 'var(--success)' : 'var(--danger)',
                              border: `1px solid ${isIn ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)'}`,
                            }}>
                            {isIn ? <ArrowDown size={10} /> : <ArrowUp size={10} />}
                            {isIn ? '+' : '−'}
                          </span>
                        </td>
                        {(['product', 'quantity', 'unit', 'kwit', 'notes'] as const).map(field => (
                          <td key={field} className="py-1.5 px-2">
                            <input
                              className="rounded px-2 py-1 text-xs outline-none w-full transition-all"
                              style={{
                                background: 'var(--bg-secondary)',
                                border: '1px solid transparent',
                                color: field === 'quantity' ? 'var(--accent)' : 'var(--text-primary)',
                                fontFamily: field === 'quantity' ? 'var(--font-mono)' : 'var(--font-sans)',
                                textAlign: field === 'quantity' ? 'right' : 'left',
                              }}
                              type={field === 'quantity' ? 'number' : 'text'}
                              value={field === 'quantity' ? (entry[field] ?? '') : (entry[field] as string || '')}
                              onChange={e => entry.id && updateRow(entry.id, field, e.target.value)}
                              onFocus={e => e.target.style.borderColor = 'var(--border)'}
                              placeholder={
                                field === 'product' ? 'nazwa towaru' :
                                field === 'quantity' ? '0' :
                                field === 'unit' ? 'kg' :
                                field === 'kwit' ? 'nr kwitu' : 'uwagi'
                              }
                            />
                          </td>
                        ))}
                        <td className="py-1.5 px-2">
                          <button onClick={() => entry.id && deleteRow(entry.id)}
                            className="p-1 rounded transition-all no-print"
                            style={{ color: 'var(--text-muted)' }}
                            onMouseOver={e => (e.currentTarget.style.color = 'var(--danger)')}
                            onMouseOut={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
