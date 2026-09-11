'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import styles from './DramaFusion.module.css';
import { type DramaItem, type DramaKind, asList, detailHref, dramaFetch, itemBackdrop, itemId, itemImage, itemRating, itemSubtitle, itemTitle, itemYear, kindLabel } from '@/lib/drama-client';

export default function DramaHubClient({ kind }: { kind: DramaKind }) {
  const [items, setItems] = useState<DramaItem[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [moreLoading, setMoreLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(true);

  const fetchPage = useCallback(async (nextPage: number, append: boolean) => {
    const payload = await dramaFetch(kind, kind === 'channels' ? { page: nextPage, category: 0, country: 0 } : { page: nextPage, genre: 0, order: 'created' });
    const next = asList(payload).filter(item => itemId(item));
    setItems(current => {
      if (!append) return next;
      const seen = new Set(current.map(itemId));
      return [...current, ...next.filter(item => !seen.has(itemId(item)))];
    });
    setHasMore(next.length > 0);
    setPage(nextPage);
  }, [kind]);

  useEffect(() => {
    let live = true;
    setLoading(true); setError(''); setItems([]); setPage(0); setHasMore(true);
    fetchPage(0, false).catch(() => { if (live) setError(`تعذر تحميل ${kindLabel(kind)} حالياً`); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [fetchPage, kind]);

  async function loadMore() {
    if (moreLoading || !hasMore) return;
    setMoreLoading(true);
    try { await fetchPage(page + 1, true); } catch { setHasMore(false); } finally { setMoreLoading(false); }
  }

  if (loading) return <Loading />;
  if (error && !items.length) return <div className={styles.empty}>{error}</div>;
  const hero = items[0];
  const content = hero ? items.slice(1) : items;
  const kindBadge = kind === 'series' ? 'مسلسل' : kind === 'movies' ? 'فيلم' : 'بث مباشر';

  return <div className={styles.page}>
    {hero && <Link href={detailHref(kind, hero)} className={styles.hero}>
      {itemBackdrop(hero) ? <img src={itemBackdrop(hero)} alt={itemTitle(hero)} /> : null}
      <div className={styles.heroShade}/><div className={styles.heroCopy}><b>{kindBadge}</b><h2>{itemTitle(hero)}</h2><p>{[itemYear(hero), itemSubtitle(hero)].filter(Boolean).join(' • ') || 'عالم الدراما'}</p></div>
    </Link>}
    <div className={styles.heading}><h1>{kind === 'series' ? 'أحدث المسلسلات' : kind === 'movies' ? 'أحدث الأفلام' : 'قنوات بث مباشر'}</h1><span className={styles.liveBadge}>عالم الدراما</span></div>
    {content.length ? <div className={styles.grid}>{content.map((item, index) => <DramaCard key={`${itemId(item)}-${index}`} kind={kind} item={item} />)}</div> : <div className={styles.empty}>لا يوجد محتوى متاح الآن.</div>}
    {hasMore && <div style={{display:'flex',justifyContent:'center',padding:'26px 0 3px'}}><button className="primary-button" onClick={loadMore} disabled={moreLoading}>{moreLoading ? 'جارٍ التحميل...' : 'عرض المزيد'}</button></div>}
  </div>;
}

export function DramaCard({ item, kind }: { item: DramaItem; kind: DramaKind }) {
  const image = itemImage(item);
  return <Link href={detailHref(kind, item)} className={styles.card}>
    <div className={`${styles.poster} ${kind === 'channels' ? styles.channelPoster : ''}`}>
      {image ? <img src={image} alt={itemTitle(item)} loading="lazy" /> : <div className={styles.placeholder}>AW</div>}
      {itemRating(item) ? <span className={styles.rating}>★ {itemRating(item)}</span> : null}
    </div>
    <strong className={styles.cardTitle}>{itemTitle(item)}</strong>
    <span className={styles.cardMeta}>{kind === 'channels' ? (itemSubtitle(item) || 'بث مباشر') : (itemYear(item) || itemSubtitle(item) || (kind === 'series' ? 'مسلسل' : 'فيلم'))}</span>
  </Link>;
}

export function Loading() { return <div className={styles.loading}><span className={styles.spinner}/></div>; }
