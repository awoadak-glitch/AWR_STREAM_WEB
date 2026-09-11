'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import FusionBottomNav from '@/components/FusionBottomNav';

type IconName = 'home'|'list'|'animation'|'calendar'|'chart'|'upcoming'|'grid'|'heart'|'history'|'download'|'person'|'clock'|'news'|'settings'|'search'|'filter'|'back';

function Icon({ name }: { name: IconName }) {
  const common = { width: 28, height: 28, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const paths: Record<IconName, React.ReactNode> = {
    home: <><path d="M3 11 12 3l9 8"/><path d="M5 10v10h14V10M9 20v-6h6v6"/></>,
    list: <><path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6h.01M4 12h.01M4 18h.01"/></>,
    animation: <><rect x="4" y="4" width="16" height="16" rx="1"/><path d="M4 9h16M4 15h16M9 4v16M15 4v16"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/></>,
    chart: <><path d="M5 20v-7M12 20V5M19 20v-11"/></>,
    upcoming: <><path d="M4 15h16v5H4zM7 12l5-7 5 7M12 5v10"/></>,
    grid: <><path d="M4 5h16M4 10h16M4 15h16M4 20h16"/><path d="M7 3v18"/></>,
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.9-8.6a5.5 5.5 0 0 0-.1-7.8Z"/>,
    history: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/></>,
    download: <><path d="M12 3v12M7 10l5 5 5-5M4 20h16"/></>,
    person: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v6h5"/></>,
    news: <><path d="M4 4h16v16H4zM8 8h8M8 12h8M8 16h5"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19 13.5v-3l-2-.7a7 7 0 0 0-.7-1.7l.9-1.9-2.1-2.1-1.9.9a7 7 0 0 0-1.7-.7L10.5 2h-3l-.7 2.3a7 7 0 0 0-1.7.7l-1.9-.9-2.1 2.1.9 1.9a7 7 0 0 0-.7 1.7L-1 10.5v3l2.3.7a7 7 0 0 0 .7 1.7l-.9 1.9 2.1 2.1 1.9-.9a7 7 0 0 0 1.7.7l.7 2.3h3l.7-2.3a7 7 0 0 0 1.7-.7l1.9.9 2.1-2.1-.9-1.9a7 7 0 0 0 .7-1.7z" transform="translate(3 0) scale(.75)"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    filter: <path d="M3 4h18l-7 8v7l-4 2v-9z"/>,
    back: <><path d="m15 18-6-6 6-6"/></>,
  };
  return <svg {...common} aria-hidden="true">{paths[name]}</svg>;
}

const items: Array<[IconName,string,string,number]> = [
  ['home','الصفحة الرئيسية','/',0], ['list','قائمة الأنمي','/catalog/anime',0], ['animation','قائمة الأنميشن','/catalog/animation',0], ['calendar','المواسم','/seasons',0],
  ['chart','الاحصائيات العالمية','/rankings',1], ['upcoming','قادم قريبا','/catalog/upcoming',1], ['grid','قائمتي','/favorites',2], ['heart','أنمياتي المفضلة','/favorites',2],
  ['heart','شخصياتي المفضلة','/favorites?tab=characters',2], ['history','اخر المشاهدات','/history',2], ['download','تحميلاتي','/history?tab=downloads',2], ['person','الشخصيات','/characters',3],
  ['clock','جدول الحلقات','/show-times',3], ['news','الأخبار','/news',3], ['settings','الاعدادات','/settings',4],
];

function categoryTitle(pathname: string) { try { return decodeURIComponent(pathname.split('/').filter(Boolean).pop() || 'التصنيف'); } catch { return 'التصنيف'; } }
function dramaKind(pathname: string) { if (pathname.startsWith('/drama/movies')) return 'movies'; if (pathname.startsWith('/drama/channels')) return 'channels'; return 'series'; }
function pageTitle(pathname: string) {
  if (pathname === '/') return 'الصفحة الرئيسية';
  if (pathname.startsWith('/drama/search')) return 'البحث';
  if (pathname.startsWith('/drama/series')) return 'المسلسلات';
  if (pathname.startsWith('/drama/movies')) return 'الأفلام';
  if (pathname.startsWith('/drama/channels')) return 'القنوات';
  if (pathname.startsWith('/catalog/anime')) return 'قائمة الأنمي';
  if (pathname.startsWith('/catalog/animation')) return 'قائمة الأنميشن';
  if (pathname.startsWith('/catalog/upcoming')) return 'قادم قريبا';
  if (pathname.startsWith('/category/')) return categoryTitle(pathname);
  if (pathname.startsWith('/search')) return 'البحث';
  if (pathname.startsWith('/rankings')) return 'الاحصائيات العالمية';
  if (pathname.startsWith('/show-times')) return 'جدول الحلقات';
  if (pathname.startsWith('/seasons')) return 'المواسم';
  if (pathname.startsWith('/favorites')) return 'قائمتي';
  if (pathname.startsWith('/history')) return 'اخر المشاهدات';
  if (pathname.startsWith('/characters')) return 'الشخصيات';
  if (pathname.startsWith('/news')) return 'الأخبار';
  if (pathname.startsWith('/settings')) return 'الاعدادات';
  return 'Anime Witcher';
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const dramaDetail = /^\/drama\/(?:series|movies|channels)\/[^/]+/.test(pathname);
  const immersive = pathname.startsWith('/anime/') || pathname.startsWith('/watch/') || dramaDetail;
  const useBack = pathname.startsWith('/rankings') || pathname.startsWith('/category/');
  const showFilter = pathname.startsWith('/catalog/anime') || pathname.startsWith('/catalog/animation');
  const isDrama = pathname.startsWith('/drama/');
  const searchHref = isDrama ? `/drama/search?kind=${dramaKind(pathname)}` : '/search';
  let lastGroup = -1;

  return <div className={`app-shell ${immersive ? 'immersive-route' : ''}`}>
    {!immersive && <header className="topbar native-topbar">
      <button className="icon-button menu-button" aria-label={useBack ? 'رجوع' : 'القائمة'} onClick={() => useBack ? router.back() : setOpen(true)}>{useBack ? <Icon name="back" /> : <span className="hamburger-lines"><i/><i/><i/></span>}</button>
      <strong className="appbar-title">{pageTitle(pathname)}</strong>
      <div className="top-actions"><Link className="icon-button search-icon" href={searchHref} aria-label="البحث"><Icon name="search" /></Link>{showFilter && <button className="icon-button catalog-filter-button" aria-label="تصفية" onClick={() => window.dispatchEvent(new CustomEvent('aw:catalog-filter'))}><Icon name="filter" /></button>}</div>
    </header>}
    <aside className={`drawer native-drawer ${open ? 'drawer-open' : ''}`}><nav>{items.map(([icon,label,href,group]) => {
      const divider = lastGroup !== -1 && group !== lastGroup; lastGroup = group;
      const path = href.split('?')[0]; const active = href === '/' ? pathname === '/' : pathname.startsWith(path);
      return <div className="drawer-item-wrap" key={`${label}-${href}`}>{divider && <div className="drawer-divider"/>}<Link href={href} className={active ? 'active' : ''} onClick={() => setOpen(false)}><b><Icon name={icon}/></b><span>{label}</span></Link></div>;
    })}</nav></aside>
    {open && <button aria-label="إغلاق القائمة" className="scrim" onClick={() => setOpen(false)} />}
    <main className="page-content" style={!immersive ? { paddingBottom: 105 } : undefined}>{children}</main>
    {!immersive && <FusionBottomNav />}
  </div>;
}
