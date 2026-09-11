'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './FusionBottomNav.module.css';

const tabs = [
  { key: 'anime', label: 'أنمي', href: '/', icon: 'anime' },
  { key: 'series', label: 'مسلسلات', href: '/drama/series', icon: 'series' },
  { key: 'movies', label: 'أفلام', href: '/drama/movies', icon: 'movies' },
  { key: 'channels', label: 'قنوات', href: '/drama/channels', icon: 'channels' },
] as const;

export default function FusionBottomNav() {
  const pathname = usePathname();
  return <nav className={styles.nav} aria-label="أقسام التطبيق">
    <div className={styles.inner}>
      {tabs.map(tab => {
        const active = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href);
        return <Link key={tab.key} href={tab.href} className={`${styles.tab} ${active ? styles.active : ''}`}>
          <TabIcon name={tab.icon} />
          <span>{tab.label}</span>
        </Link>;
      })}
    </div>
  </nav>;
}

function TabIcon({ name }: { name: 'anime'|'series'|'movies'|'channels' }) {
  const p = { width: 25, height: 25, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (name === 'anime') return <svg {...p}><path d="M4 11 12 4l8 7"/><path d="M6 10v10h12V10"/><path d="M9 14h6M12 11v6"/></svg>;
  if (name === 'series') return <svg {...p}><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M8 3l4 3 4-3"/><path d="M8 11h8M8 15h5"/></svg>;
  if (name === 'movies') return <svg {...p}><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 6l2 4m4-4 2 4m4-4 2 4"/></svg>;
  return <svg {...p}><rect x="3" y="6" width="18" height="13" rx="3"/><path d="M8 3l4 3 4-3"/><path d="M8 12h.01M12 12h.01M16 12h.01"/></svg>;
}
