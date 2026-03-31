'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { 
  LayoutDashboard, 
  Package, 
  Warehouse,
  Container,
  Truck,
  LogOut,
  ChevronRight
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Magazyn', sublabel: 'Podsumowanie inwentury', icon: LayoutDashboard },
  { href: '/blaszak-1', label: 'Blaszak 1', sublabel: 'Część A-J', icon: Package },
  { href: '/blaszak-2', label: 'Blaszak 2', sublabel: 'Część A-J', icon: Package },
  { href: '/magazyn-lewa', label: 'Mag. Lewa Strona', sublabel: 'Kostka / Kwity', icon: Warehouse },
  { href: '/magazyn-prawa', label: 'Mag. Prawa Strona', sublabel: 'Kostka / Kwity', icon: Warehouse },
  { href: '/wiata', label: 'Wiata', sublabel: 'Frakcje', icon: Package },
  { href: '/kontenery', label: 'Kontenery', sublabel: '6 kontenerów', icon: Container },
  { href: '/ambro', label: 'AMBRO', sublabel: 'Mag. zewnętrzny', icon: Truck },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <aside className="flex flex-col h-screen w-56 no-print"
      style={{ background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)' }}>
      
      {/* Logo */}
      <div className="px-4 py-5 flex items-center gap-3"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.25)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="#38bdf8" strokeWidth="2" strokeLinejoin="round"/>
            <path d="M9 22V12h6v10" stroke="#38bdf8" strokeWidth="2" strokeLinejoin="round"/>
          </svg>
        </div>
        <div>
          <div className="text-sm font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
            Magazyn
          </div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Manager</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        {NAV_ITEMS.map(({ href, label, sublabel, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link key={href} href={href}
              className="flex items-center gap-3 px-3 py-2.5 mx-2 rounded-lg my-0.5 transition-all group"
              style={{
                background: isActive ? 'rgba(56,189,248,0.12)' : 'transparent',
                border: isActive ? '1px solid rgba(56,189,248,0.2)' : '1px solid transparent',
              }}>
              <Icon size={15} style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)', flexShrink: 0 }} />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium truncate" 
                  style={{ color: isActive ? 'var(--accent)' : 'var(--text-primary)' }}>
                  {label}
                </div>
                <div className="text-xs truncate" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
                  {sublabel}
                </div>
              </div>
              {isActive && <ChevronRight size={12} style={{ color: 'var(--accent)', flexShrink: 0 }} />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ borderTop: '1px solid var(--border)' }} className="p-3">
        <button onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs transition-all"
          style={{ color: 'var(--text-muted)' }}
          onMouseOver={e => (e.currentTarget.style.color = 'var(--danger)')}
          onMouseOut={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
          <LogOut size={13} />
          Wyloguj się
        </button>
      </div>
    </aside>
  );
}
