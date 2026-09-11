'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './DramaFusion.module.css';
import { DramaCard, Loading } from './DramaHubClient';
import { type DramaItem, type DramaKind, asList, dramaFetch, itemTitle, itemType, kindLabel } from '@/lib/drama-client';

export default function DramaSearchClient({ kind }: { kind: DramaKind }) {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<DramaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [channelPool, setChannelPool] = useState<DramaItem[]>([]);

  useEffect(() => {
    if (kind !== 'channels' || channelPool.length) return;
    dramaFetch('channels', { page: 0, category: 0, country: 0 }).then(payload => setChannelPool(asList(payload))).catch(() => setChannelPool([]));
  }, [kind, channelPool.length]);

  useEffect(() => {
    const needle = query.trim();
    if (!needle) { setItems([]); setLoading(false); return; }
    if (kind === 'channels') {
      const lowered = needle.toLocaleLowerCase('ar');
      setItems(channelPool.filter(item => itemTitle(item).toLocaleLowerCase('ar').includes(lowered)));
      return;
    }
    const timer = window.setTimeout(() => {
      setLoading(true);
      dramaFetch('search', { query: needle, page: 0 }).then(payload => {
        setItems(asList(payload).filter(item => { const type = itemType(item); return type === 'unknown' || type === kind; }));
      }).catch(() => setItems([])).finally(() => setLoading(false));
    }, 320);
    return () => window.clearTimeout(timer);
  }, [query, kind, channelPool]);

  const hint = useMemo(() => kind === 'series' ? 'ابحث عن مسلسل...' : kind === 'movies' ? 'ابحث عن فيلم...' : 'ابحث عن قناة...', [kind]);
  return <div className={styles.page}>
    <div className={styles.searchWrap}><input className={styles.search} autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder={hint} /></div>
    <p className={styles.topSearchHint}>نتائج البحث تأتي من نفس مصادر عالم الدراما — {kindLabel(kind)}</p>
    {loading ? <Loading /> : !query.trim() ? <div className={styles.empty}>اكتب اسم العمل الذي تريد البحث عنه.</div> : items.length ? <div className={styles.grid}>{items.map((item,index) => <DramaCard key={`${item.id ?? index}-${index}`} item={item} kind={kind} />)}</div> : <div className={styles.empty}>لا توجد نتائج مطابقة.</div>}
  </div>;
}
