'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ContainerEntry } from '@/lib/types';
import { Printer, RefreshCw, Calendar, Container } from 'lucide-react';
import { format } from 'date-fns';

const CONTAINER_COUNT = 6;

export default function KontenerPage() {
  const supabase = createClient();
  const today = format(new Date(), 'yyyy-MM-dd');
  const [date, setDate] = useState(today);
  const [containers, setContainers] = useState<ContainerEntry[]>(
    Array.from({ length: CONTAINER_COUNT }, (_, i) => ({
      container_num: i + 1,
      entry_date: today,
      product_1: '', weight_1: null,
      product_2: '', weight_2: null,
      product_3: '', weight_3: null,
      product_4: '', weight_4: null,
      client: '', notes: '',
    }))
  );
  const [saving, setSaving] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('containers')
      .select('*')
      .eq('entry_date', date);

    setContainers(
      Array.from({ length: CONTAINER_COUNT }, (_, i) => {
        const num = i + 1;
        const found = data?.find(d => d.container_num === num);
        return found || {
          container_num: num, entry_date: date,
          product_1: '', weight_1: null,
          product_2: '', weight_2: null,
          product_3: '', weight_3: null,
          product_4: '', weight_4: null,
          client: '', notes: '',
        };
      })
    );
    setLoading(false);
  }, [date, supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  function updateContainer(num: number, field: keyof ContainerEntry, value: string) {
    setContainers(prev => prev.map(c => c.container_num === num
      ? { ...c, [field]: field.startsWith('weight') ? (value === '' ? null : parseFloat(value) || null) : value }
      : c
    ));
  }

  async function saveContainer(num: number) {
    setSaving(prev => new Set(prev).add(num));
    const c = containers.find(x => x.container_num === num)!;
    await supabase.from('containers').upsert(
      { ...c, entry_date: date },
      { onConflict: 'container_num,entry_date' }
    );
    setSaving(prev => { const s = new Set(prev); s.delete(num); return s; });
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 no-print"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <div>
          <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Kontenery</h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>6 kontenerów · do 4 towarów · klient</p>
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
        <h2 className="text-xl font-bold">Kontenery — {date}</h2>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-1 gap-4" style={{ maxWidth: '1200px' }}>
          {/* 2 columns on wider screens */}
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(520px, 1fr))' }}>
            {containers.map(c => {
              const isSaving = saving.has(c.container_num);
const totalWeight = [c.weight_1, c.weight_2, c.weight_3, c.weight_4]
  .reduce((sum: number, w) => sum + (w || 0), 0);

              return (
                <div key={c.container_num} className="rounded-xl overflow-hidden"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  {/* Container header */}
                  <div className="flex items-center justify-between px-4 py-3"
                    style={{ background: 'rgba(56,189,248,0.06)', borderBottom: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.25)' }}>
                        <Container size={14} style={{ color: 'var(--accent)' }} />
                      </div>
                      <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                        Kontener {c.container_num}
                      </span>
                      {isSaving && (
                        <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(251,191,36,0.15)', color: 'var(--warning)', border: '1px solid rgba(251,191,36,0.25)' }}>
                          zapisywanie...
                        </span>
                      )}
                    </div>
                    {totalWeight > 0 && (
                      <span className="font-mono font-bold text-sm" style={{ color: 'var(--success)' }}>
                        {totalWeight.toLocaleString('pl-PL')} kg
                      </span>
                    )}
                  </div>

                  <div className="p-4 space-y-3">
                    {/* 4 products */}
                    {[1, 2, 3, 4].map(n => {
                      const prodKey = `product_${n}` as keyof ContainerEntry;
                      const weightKey = `weight_${n}` as keyof ContainerEntry;
                      return (
                        <div key={n} className="flex items-center gap-2">
                          <span className="text-xs w-4 text-center font-mono"
                            style={{ color: 'var(--text-muted)' }}>{n}.</span>
                          <input
                            className="flex-1 rounded px-2 py-1.5 text-xs outline-none transition-all"
                            style={{
                              background: 'var(--bg-secondary)',
                              border: '1px solid var(--border)',
                              color: 'var(--text-primary)',
                            }}
                            value={(c[prodKey] as string) || ''}
                            onChange={e => updateContainer(c.container_num, prodKey, e.target.value)}
                            onBlur={() => saveContainer(c.container_num)}
                            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                            placeholder={`Towar ${n}`}
                          />
                          <input
                            className="rounded px-2 py-1.5 text-xs outline-none font-mono text-right transition-all"
                            style={{
                              background: 'var(--bg-secondary)',
                              border: '1px solid var(--border)',
                              color: 'var(--accent)',
                              width: '80px',
                            }}
                            type="number"
                            value={(c[weightKey] as number) ?? ''}
                            onChange={e => updateContainer(c.container_num, weightKey, e.target.value)}
                            onBlur={() => saveContainer(c.container_num)}
                            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                            placeholder="kg"
                          />
                        </div>
                      );
                    })}

                    {/* Client + Notes */}
                    <div className="pt-2 space-y-2" style={{ borderTop: '1px solid var(--border)' }}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs w-14 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>Klient:</span>
                        <input
                          className="flex-1 rounded px-2 py-1.5 text-xs outline-none transition-all"
                          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: '#34d399' }}
                          value={c.client || ''}
                          onChange={e => updateContainer(c.container_num, 'client', e.target.value)}
                          onBlur={() => saveContainer(c.container_num)}
                          onFocus={e => e.target.style.borderColor = '#34d399'}
                          placeholder="przeznaczenie / klient"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs w-14 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>Uwagi:</span>
                        <input
                          className="flex-1 rounded px-2 py-1.5 text-xs outline-none transition-all"
                          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                          value={c.notes || ''}
                          onChange={e => updateContainer(c.container_num, 'notes', e.target.value)}
                          onBlur={() => saveContainer(c.container_num)}
                          placeholder="uwagi"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
