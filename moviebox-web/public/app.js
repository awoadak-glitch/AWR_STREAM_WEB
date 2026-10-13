const SOURCE='https://movieboxph.org';
const categories=[
 {id:'home',ar:'الرئيسية',en:'Home',ico:'⌂'},
 {id:'movies',ar:'أفلام',en:'Movies',ico:'◈'},
 {id:'shows',ar:'مسلسلات',en:'TV Shows',ico:'▤'},
 {id:'animation',ar:'أنمي وكرتون',en:'Animation',ico:'✦'},
 {id:'korean',ar:'دراما كورية',en:'K-Drama',ico:'❖'},
 {id:'shorts',ar:'مسلسلات قصيرة',en:'ShortTV',ico:'▣'},
 {id:'popular',ar:'الأكثر مشاهدة',en:'Most Watched',ico:'♛'}
];
const strings={ar:{discover:'اكتشف',original:'مكتبة AWR VISION',feature:'المختار لك اليوم',details:'التفاصيل والمشاهدة',explore:'تصفح المحتوى',content:'عنوان في الكتالوج',library:'مكتبة المحتوى',all:'الكل',favorites:'♡ المفضلة',search:'ابحث عن فيلم أو مسلسل أو أنمي...',fetched:'تم جلب القوائم مباشرة',loading:'جارٍ تحديث المكتبة...',offline:'تعذر تحديث المكتبة',no:'لا توجد نتائج مطابقة',try:'جرّب كلمة بحث أخرى، أو انتقل إلى قسم مختلف.',error:'تعذّر تحميل القوائم الآن',errorDesc:'قد يمنع موقع المصدر طلبات الخادم أو يتوقف مؤقتًا. حاول تحديث المكتبة لاحقًا.',watch:'▶ المشاهدة في AWR VISION',watchInside:'▶ تشغيل المشغل الخاص',watchExternal:'↗ فتح المشغل منفصلًا',saved:'♥ إزالة من المفضلة',save:'♡ أضف للمفضلة',title:'استكشف أحدث الإضافات',subtitle:'القوائم يتم تحديثها من مكتبة AWR VISION',new:'أحدث المحتوى',sync:'تم تحديث القوائم',favEmpty:'المفضلة فارغة',favEmptyDesc:'اضغط على ♡ في أي بطاقة لإضافتها هنا.'},en:{discover:'DISCOVER',original:'AWR VISION Library',feature:'Featured today',details:'Details & watch',explore:'Explore',content:'titles in catalogue',library:'CONTENT LIBRARY',all:'All',favorites:'♡ Favorites',search:'Search movies, TV shows or anime...',fetched:'Synced with source',loading:'Updating library...',offline:'Library is temporarily unavailable',no:'No matching titles',try:'Try another title or choose a section.',error:'Unable to refresh catalogue',errorDesc:'The source site may be temporarily unavailable or block server requests. Please refresh the library later.',watch:'▶ Watch on AWR VISION',watchInside:'▶ Open built-in player',watchExternal:'↗ Open source player',saved:'♥ Remove favorite',save:'♡ Add to favorites',title:'Discover what’s new',subtitle:'Live listings from the AWR VISION library',new:'Latest titles',sync:'Catalogue refreshed',favEmpty:'No favorites yet',favEmptyDesc:'Click ♡ on a card to add it here.'}};
const fallback=[
 {id:'take-charge-of-my-heart-hindi-oIO9IBe3Lt9',title:'Take Charge of My Heart [Hindi]',href:SOURCE+'/movies/take-charge-of-my-heart-hindi-oIO9IBe3Lt9',genre:'Comedy',score:'6.5',section:'Trending Now',image:''},
 {id:'khalifa-hindi-EgymqlOMMj3',title:'Khalifa [Hindi]',href:SOURCE+'/movies/khalifa-hindi-EgymqlOMMj3',genre:'Action',score:'6.2',section:'Trending Now',image:''},
 {id:'mandaadi-hindi-qxUx1r3QHW4',title:'Mandaadi [Hindi]',href:SOURCE+'/movies/mandaadi-hindi-qxUx1r3QHW4',genre:'Action',score:'9.2',section:'Trending Now',image:''},
 {id:'mobland-hindi-4YpgcZoqqL1',title:'MobLand [Hindi]',href:SOURCE+'/movies/mobland-hindi-4YpgcZoqqL1',genre:'Crime',score:'8.3',section:'Top Series',image:''},
 {id:'that-time-i-got-reincarnated-as-a-slime-hindi-2Rs9a5DXbr',title:'That Time I Got Reincarnated as a Slime [Hindi]',href:SOURCE+'/movies/that-time-i-got-reincarnated-as-a-slime-hindi-2Rs9a5DXbr',genre:'Anime',score:'8.0',section:'Animation',image:''},
 {id:'the-love-hypothesis-hindi-6r0FhQPfBi6',title:'The Love Hypothesis [Hindi]',href:SOURCE+'/movies/the-love-hypothesis-hindi-6r0FhQPfBi6',genre:'Comedy',score:'6.1',section:'Hollywood',image:''},
 {id:'the-runner-hindi-aRqAvNSfbk9',title:'The Runner [Hindi]',href:SOURCE+'/movies/the-runner-hindi-aRqAvNSfbk9',genre:'Action',score:'4.2',section:'Hollywood',image:''},
 {id:'bigg-boss-hindi-MithgQiSYf9',title:'Bigg Boss [Hindi]',href:SOURCE+'/movies/bigg-boss-hindi-MithgQiSYf9',genre:'Reality-TV',score:'3.8',section:'Top Series',image:''},
 {id:'neagley-hindi-yxufyS91IZ7',title:'Neagley [Hindi]',href:SOURCE+'/movies/neagley-hindi-yxufyS91IZ7',genre:'Action',score:'6.9',section:'Top Series',image:''}
];
const byId=id=>document.getElementById(id);
const state={page:'home',locale:localStorage.getItem('mb-locale')==='en'?'en':'ar',filter:'all',query:'',sections:[],featured:[],selected:null,source:'loading',favorites:new Set(JSON.parse(localStorage.getItem('mb-favorites')||'[]'))};
let requestSerial=0,toastTimer;
const t=key=>strings[state.locale][key]||key;
function escapeHTML(str){return String(str||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function safeImage(src){try{let u=new URL(src);return u.protocol==='https:'&&(/(^|\.)aoneroom\.com$|(^|\.)movieboxph\.org$/.test(u.hostname))?u.href:'';}catch{return '';}}
function safeLink(src){try{const u=new URL(src);return u.origin===SOURCE&&/^\/movies\/[a-z\d-]+$/i.test(u.pathname)?u.href:SOURCE;}catch{return SOURCE;}}
function playPageFor(item){const link=safeLink(item?.href||'');try{const u=new URL(link);if(!/^\/movies\/[a-z\d-]+$/i.test(u.pathname))return SOURCE;return SOURCE+'/play/'+u.pathname.split('/').pop();}catch{return SOURCE;}}
function categoryTitle(){return categories.find(c=>c.id===state.page)?.[state.locale]||'';}
function translate(){document.documentElement.lang=state.locale;document.documentElement.dir=state.locale==='ar'?'rtl':'ltr';document.querySelectorAll('[data-i18n]').forEach(el=>el.textContent=t(el.dataset.i18n));byId('langBtn').textContent=state.locale==='ar'?'EN':'AR';byId('searchInput').placeholder=t('search');byId('filterAll').textContent=t('all');byId('filterFav').textContent=t('favorites');byId('crumbTitle').textContent=categoryTitle();byId('pageTitle').textContent=state.page==='home'?t('title'):categoryTitle();byId('pageSub').textContent=t('subtitle');byId('heroSubtitle').textContent=t('subtitle');renderNavigation();render();}
function renderNavigation(){byId('nav').innerHTML=categories.map(c=>`<button class="nav-link ${c.id===state.page?'active':''}" data-page="${c.id}" type="button"><span class="nav-icon">${c.ico}</span><span>${escapeHTML(c[state.locale])}</span>${c.id==='shorts'?'<small>HOT</small>':''}</button>`).join('');}
function toast(message){clearTimeout(toastTimer);const el=byId('toast');el.textContent=message;el.classList.add('show');toastTimer=setTimeout(()=>el.classList.remove('show'),3500);}
function favoritesSave(){localStorage.setItem('mb-favorites',JSON.stringify([...state.favorites]));}
function toggleFavorite(item){state.favorites.has(item.id)?state.favorites.delete(item.id):state.favorites.add(item.id);favoritesSave();render();if(state.selected?.id===item.id)updateFavoriteDialog();}
function cardHTML(item){const fav=state.favorites.has(item.id);const image=safeImage(item.image);return `<article class="media-card" data-open="${escapeHTML(item.id)}" tabindex="0" role="button" aria-label="${escapeHTML(item.title)}"><div class="poster"><span class="poster-fallback">${escapeHTML(item.title.slice(0,2).toUpperCase())}</span>${image?`<img src="${escapeHTML(image)}" data-original="${escapeHTML(image)}" alt="${escapeHTML(item.title)}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"/>`:`<span class="poster-fallback">${escapeHTML(item.title.slice(0,2).toUpperCase())}</span>`}<span class="poster-badge">${escapeHTML(item.genre||'HD')}</span><button type="button" class="fav-card ${fav?'saved':''}" data-fav="${escapeHTML(item.id)}" aria-label="${fav?t('saved'):t('save')}">${fav?'♥':'♡'}</button><div class="poster-play">▶</div></div><h3 title="${escapeHTML(item.title)}">${escapeHTML(item.title)}</h3><div class="card-meta"><span>${escapeHTML(item.genre||'AWR VISION')}</span><span class="score">${item.score?'★ '+escapeHTML(item.score):'HD'}</span></div></article>`;}
function allItems(){const unique=new Map();for(const section of state.sections)for(const item of section.items)unique.set(item.id,item);return [...unique.values()];}
function findItem(id){return allItems().find(item=>item.id===id)||fallback.find(item=>item.id===id);}
function render(){const q=state.query.trim().toLowerCase();let sections=state.sections.map(s=>({...s,items:s.items.filter(item=>(state.filter!=='favorites'||state.favorites.has(item.id))&&(!q||`${item.title} ${item.genre||''}`.toLowerCase().includes(q)))})).filter(s=>s.items.length>0);
 const el=byId('catalogue');if(state.source==='loading'&&!state.sections.length)return;
 if(!sections.length){const f=state.filter==='favorites';el.innerHTML=`<div class="empty-state"><span class="empty-icon">${f?'♡':'⌕'}</span><h3>${t(f?'favEmpty':'no')}</h3><p>${t(f?'favEmptyDesc':'try')}</p></div>`;return;}
 el.innerHTML=sections.map(section=>`<section class="rail"><div class="rail-head"><h2 class="rail-title">${escapeHTML(section.title)}</h2><span class="rail-count">${section.items.length} ${state.locale==='ar'?'عنوان':'titles'}</span></div><div class="cards">${section.items.slice(0,state.page==='home'&&!q?18:96).map(cardHTML).join('')}</div></section>`).join('');}
function updateHero(){const main=state.featured[0]||allItems()[0];byId('itemCount').textContent=allItems().length||'—';if(main){byId('heroTitle').innerHTML=`${escapeHTML(main.title)}<br/><em>${state.locale==='ar'?'شاهد الآن':'Watch now'}</em>`;byId('heroGenre').textContent=(main.genre||'AWR VISION').toUpperCase();byId('heroWatch').disabled=false;}else{byId('heroTitle').innerHTML=state.locale==='ar'?'شاهد عالماً <em>بلا حدود</em>':'Stream <em>Beyond Limits</em>';byId('heroWatch').disabled=true;}}
function updateStatus(){const ok=state.source==='live';byId('sourceDot').classList.toggle('on',ok);byId('sourceStatus').textContent=state.source==='loading'?t('loading'):ok?t('fetched'):t('offline');}
function makeFallback(){return [];}
async function load(page){const token=++requestSerial;state.page=page;state.source='loading';state.sections=[];state.featured=[];state.query='';byId('searchInput').value='';byId('catalogue').innerHTML='<div class="loading-line"></div><div class="loading-grid"><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div></div>';history.replaceState({},'',page==='home'?'/':`/?category=${encodeURIComponent(page)}`);translate();updateStatus();closeMenu();
 try {const res=await fetch(`/api/catalog?page=${encodeURIComponent(page)}`,{headers:{'Accept':'application/json'}});const data=await res.json();if(!res.ok||!Array.isArray(data.sections)||!data.sections.length)throw new Error(data.details||data.error||'No source content');if(token!==requestSerial)return;state.sections=data.sections;state.featured=data.featured||[];state.source='live';}catch(e){if(token!==requestSerial)return;console.warn('Source catalogue not reachable:',e);state.sections=makeFallback();state.featured=state.sections[0]?.items||[];state.source='fallback';}
 updateHero();updateStatus();render();}
function updateFavoriteDialog(){if(!state.selected)return;byId('favDetail').textContent=state.favorites.has(state.selected.id)?t('saved'):t('save');}
function openDetail(item){if(!item)return;state.selected=item;byId('dialogTitle').textContent=item.title;const image=safeImage(item.image);byId('dialogPoster').style.backgroundImage=image?`linear-gradient(0deg,#0b152aa6,#0001),url("${image.replaceAll('"','%22')}")`:'';byId('dialogMeta').innerHTML=`<span>AWR VISION</span>${item.genre?`<span>${escapeHTML(item.genre)}</span>`:''}${item.score?`<span>★ ${escapeHTML(item.score)}</span>`:''}`;byId('watchInSite').textContent=t('watchInside');updateFavoriteDialog();byId('dialogBackdrop').hidden=false;document.body.style.overflow='hidden';}
function closeDetail(){byId('dialogBackdrop').hidden=true;document.body.style.overflow='';state.selected=null;}
function closeMenu(){byId('sidebar').classList.remove('open');byId('scrim').classList.remove('visible');}
let playerHls=null,playerDash=null,activeMedia=null,activePlayback=null;
const video=byId('awrVideo'),empty=byId('playerEmpty');
function playerMessage(title,details,showDemo=false){
 video.hidden=true;empty.hidden=false;byId('playerStatusTitle').textContent=title;byId('playerStatusDetail').textContent=details;byId('playerDemo').hidden=!showDemo;
}
function clearEngines(){
 if(playerHls){playerHls.destroy();playerHls=null;}
 if(playerDash){playerDash.reset();playerDash=null;}
 video.pause();video.removeAttribute('src');video.load();video.querySelectorAll('track').forEach(t=>t.remove());
}
function externalScript(url,globalName){
 return new Promise((resolve,reject)=>{
   if(window[globalName])return resolve(window[globalName]);
   const e=document.createElement('script');e.src=url;e.async=true;e.onload=()=>window[globalName]?resolve(window[globalName]):reject(Error('Missing player engine'));
   e.onerror=()=>reject(Error('Player engine unavailable'));document.head.append(e);
 });
}
async function setStream(stream){
 if(!activeMedia)return;
 clearEngines();const current=activeMedia.id;
 const url=new URL(stream.url);if(url.protocol!=='https:')throw Error('Invalid media URL');
 empty.hidden=true;video.hidden=false;
 const mime=stream.type;
 if(mime==='hls'&&!video.canPlayType('application/vnd.apple.mpegurl')){
   const Hls=await externalScript('https://cdn.jsdelivr.net/npm/hls.js@1.6.15/dist/hls.min.js','Hls');
   if(current!==activeMedia?.id)return;
   if(!Hls.isSupported())throw Error('HLS not supported in this browser');
   playerHls=new Hls({enableWorker:true,maxBufferLength:30});
   playerHls.loadSource(url.href);playerHls.attachMedia(video);
   playerHls.on(Hls.Events.ERROR,(_,event)=>{if(event.fatal)playerMessage('تعذر تشغيل البث','تعذر قراءة ملف البث أو رفض الخادم وصول المتصفح.',false);});
 }else if(mime==='dash'){
   const dashjs=await externalScript('https://cdn.jsdelivr.net/npm/dashjs@4.7.4/dist/dash.all.min.js','dashjs');
   if(current!==activeMedia?.id)return;
   playerDash=dashjs.MediaPlayer().create();playerDash.initialize(video,url.href,true);
 }else{video.src=url.href;video.load();}
 for(const sub of activePlayback?.subtitles||[]){
   const track=document.createElement('track');track.kind='subtitles';track.label=sub.label;track.srclang=sub.lang;track.src=sub.url;video.append(track);
 }
 video.playbackRate=Number(byId('speedPicker').value)||1;
 try{await video.play();}catch{ /* playback may need user gesture */ }
}
async function openPlayer(item){
 if(!item)return;
 closeDetail();activeMedia={...item};activePlayback=null;
 byId('playingTitle').textContent=item.title;
 byId('playerBackdrop').hidden=false;document.body.style.overflow='hidden';
 byId('sourcePicker').innerHTML='<option value="">جاري تجهيز المصادر...</option>';
 clearEngines();playerMessage('جاري تجهيز المشاهدة','يتم التحقق من توفر مصدر فيديو لهذا العنوان...');
 try{
  const response=await fetch('/api/playback?id='+encodeURIComponent(item.id),{cache:'no-store'});
  if(!response.ok)throw Error('The video service is temporarily unavailable');
  const data=await response.json();
  if(activeMedia?.id!==item.id)return;
  if(!data.available || !data.sources?.length){
   playerMessage('الفيديو غير متاح حاليًا','بيانات العنوان متاحة في مكتبتنا، لكن رابط البث المباشر لم يتم توفيره أو ترخيصه لهذا العنوان.',true);
   byId('sourcePicker').innerHTML='<option value="">لا توجد مصادر متاحة</option>';return;
  }
  activePlayback=data;
  byId('sourcePicker').innerHTML=data.sources.map((s,i)=>'<option value="'+i+'">'+escapeHTML(s.label)+'</option>').join('');
  await setStream(data.sources[0]);
 }catch(err){if(activeMedia?.id===item.id)playerMessage('تعذر بدء التشغيل',String(err.message||err).slice(0,180),true);}
}
function closePlayer(){
 activeMedia=null;activePlayback=null;clearEngines();
 byId('playerBackdrop').hidden=true;document.body.style.overflow='';
}
document.addEventListener('error',e=>{
 const img=e.target;
 if(img instanceof HTMLImageElement&&img.closest('.poster')&&img.dataset.original){
  if(!img.dataset.retry){
   img.dataset.retry='1';
   img.src='/api/poster?url='+encodeURIComponent(img.dataset.original);
  }else img.style.display='none';
 }
},true);
byId('watchInSite').addEventListener('click',()=>openPlayer(state.selected));
byId('playerClose').addEventListener('click',closePlayer);
byId('sourcePlayer').addEventListener('load',()=>{byId('theaterLoading').hidden=true;});
byId('playerFullscreen').addEventListener('click',()=>byId('playerFrameWrap').requestFullscreen?.());
byId('playerBackdrop').addEventListener('click',e=>{if(e.target===byId('playerBackdrop'))closePlayer();});
byId('nav').addEventListener('click',e=>{let button=e.target.closest('[data-page]');if(button)load(button.dataset.page);});
byId('catalogue').addEventListener('click',e=>{const fav=e.target.closest('[data-fav]');if(fav){e.stopPropagation();const item=findItem(fav.dataset.fav);if(item)toggleFavorite(item);return;}const card=e.target.closest('[data-open]');if(card)openDetail(findItem(card.dataset.open));});
byId('catalogue').addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-open]')){e.preventDefault();openDetail(findItem(e.target.dataset.open));}});
byId('searchInput').addEventListener('input',e=>{state.query=e.target.value;render();});
byId('filterAll').addEventListener('click',()=>{state.filter='all';byId('filterAll').classList.add('active');byId('filterFav').classList.remove('active');render();});
byId('filterFav').addEventListener('click',()=>{state.filter='favorites';byId('filterFav').classList.add('active');byId('filterAll').classList.remove('active');render();});
byId('refreshBtn').addEventListener('click',async()=>{await load(state.page);toast(t('sync'));});
byId('langBtn').addEventListener('click',()=>{state.locale=state.locale==='ar'?'en':'ar';localStorage.setItem('mb-locale',state.locale);translate();updateHero();updateStatus();});
byId('heroBrowse').addEventListener('click',()=>byId('catalogue').scrollIntoView({behavior:'smooth',block:'start'}));
byId('heroWatch').addEventListener('click',()=>openDetail(state.featured[0]||allItems()[0]));
byId('favDetail').addEventListener('click',()=>{if(state.selected)toggleFavorite(state.selected);});
byId('dialogClose').addEventListener('click',closeDetail);byId('dialogBackdrop').addEventListener('click',e=>{if(e.target===byId('dialogBackdrop'))closeDetail();});
byId('menuBtn').addEventListener('click',()=>{byId('sidebar').classList.toggle('open');byId('scrim').classList.toggle('visible');});byId('scrim').addEventListener('click',closeMenu);
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closePlayer();closeDetail();closeMenu();}if(e.key==='/'&&document.activeElement!==byId('searchInput')){e.preventDefault();byId('searchInput').focus();}});
load(new URLSearchParams(location.search).get('category')&&categories.some(c=>c.id===new URLSearchParams(location.search).get('category'))?new URLSearchParams(location.search).get('category'):'home');
