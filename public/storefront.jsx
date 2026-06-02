/* ============================================================
   FOCUZ — storefront screens (nav, hero, how-it-works, store grid)
   ============================================================ */
const { useState, useRef, useEffect } = React;

const fmtBRL = (n) =>
  'R$ ' + Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const discountPct = (p, old) => (old && old > p ? Math.round((1 - p / old) * 100) : 0);

/* ---------- Proruja logo ---------- */
function FocuzLogo({ height = 32, onClick }) {
  return (
    <button className="brand" onClick={onClick} aria-label="Proruja — início">
      <span className="focuz-logo" style={{ height, width: Math.round(height * 4.231) }} role="img" aria-label="Proruja" />
    </button>
  );
}

/* ---------- store logo (real brand mark in a tile) ---------- */
function StoreLogo({ store, size = 40, className = '' }) {
  const s = window.FOCUZ_STORE_MAP[store] || {};
  if (!s.logo) {
    return <span className={'store-logo store-logo--all ' + className} style={{ width: size, height: size, fontSize: size * 0.4 }}>{s.initial}</span>;
  }
  return (
    <span className={'store-logo ' + className} style={{ width: size, height: size }}>
      <img src={s.logo} alt={s.name} loading="lazy" />
    </span>
  );
}

/* ---------- image placeholder ---------- */
function Placeholder({ label = 'product shot', ratio = '4 / 3' }) {
  return (
    <div className="ph" style={{ aspectRatio: ratio }}>
      <div className="ph__stripes" />
      <span className="ph__label mono">{label}</span>
    </div>
  );
}

/* ============================ TOP NAV ============================ */
function TopNav({ L, lang, setLang, theme, toggleTheme, screen, go }) {
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);
  const links = [
    { id: 'home', label: L.nav_home },
    { id: 'store', label: L.nav_stores },
    { id: 'how', label: L.nav_how },
  ];
  return (
    <header className={'nav' + (scrolled ? ' nav--scrolled' : '')}>
      <div className="nav__inner">
        <FocuzLogo onClick={() => go('home')} />
        <nav className="nav__links">
          {links.map((l) => (
            <button key={l.id} className={'nav__link' + (screen === l.id ? ' is-active' : '')} onClick={() => go(l.id)}>
              {l.label}
            </button>
          ))}
        </nav>
        <div className="nav__actions">
          <button className="iconbtn" onClick={() => setLang(lang === 'pt' ? 'en' : 'pt')} title="Language">
            <span className="mono nav__lang">{lang.toUpperCase()}</span>
          </button>

          <button className="btn btn--primary nav__admin" onClick={() => go('admin')}>
            <Icon name="lock" size={15} /> {L.nav_admin}
          </button>
          <button className="iconbtn nav__burger" onClick={() => setMenu((m) => !m)} title="Menu">
            <Icon name={menu ? 'x' : 'menu'} size={20} />
          </button>
        </div>
      </div>
      <div className={'nav__drawer' + (menu ? ' is-open' : '')}>
        {links.map((l) => (
          <button key={l.id} className={'nav__draweritem' + (screen === l.id ? ' is-active' : '')} onClick={() => { go(l.id); setMenu(false); }}>
            {l.label}
          </button>
        ))}
        <button className="nav__draweritem" onClick={() => { go('admin'); setMenu(false); }}><Icon name="lock" size={15} /> {L.nav_admin}</button>
      </div>
    </header>
  );
}

/* ============================ HERO (home) ============================ */
function Hero({ L, tw, stats, onSeeDeals, onHow }) {
  const [p, setP] = useState({ x: 0, y: 0 });
  useEffect(() => {
    if (tw.heroStyle === 'minimal') return;
    const fn = (e) => {
      const w = window.innerWidth, h = window.innerHeight;
      setP({ x: (e.clientX / w - 0.5) * 2, y: (e.clientY / h - 0.5) * 2 });
    };
    window.addEventListener('mousemove', fn);
    return () => window.removeEventListener('mousemove', fn);
  }, [tw.heroStyle]);
  const px = (f) => ({ transform: `translate3d(${p.x * f}px, ${p.y * f}px, 0)` });

  const tiles = [
    { id: 'amazon', cls: 'htile--1', size: 78, f: 16 },
    { id: 'ml',     cls: 'htile--2', size: 66, f: -22 },
    { id: 'shopee', cls: 'htile--3', size: 60, f: 26 },
    { id: 'magalu', cls: 'htile--4', size: 70, f: -16 },
    { id: 'ali',    cls: 'htile--5', size: 58, f: 22 },
  ];

  return (
    <section className={'hero hero--' + tw.heroStyle}>
      <div className="hero__bg" aria-hidden="true">
        <div className="hero__grid" />
        <div className="blob blob--1" style={px(-26)} />
        <div className="blob blob--2" style={px(20)} />
        <div className="blob blob--3" style={px(-14)} />
        <div className="hero__noise" />
      </div>

      <div className="hero__inner">
        <div className="hero__content">
          <div className="hero__eyebrow"><span className="pulse" /> <span className="mono">{L.hero_eyebrow}</span></div>
          <h1 className="hero__title">{L.hero_title_a}<br /><span className="hero__title-accent">{L.hero_title_b}</span></h1>
          <p className="hero__sub">{L.hero_sub}</p>
          <div className="hero__cta">
            <button className="btn btn--primary btn--lg" onClick={() => onSeeDeals()}>{L.hero_cta} <Icon name="chevronR" size={17} /></button>
            <button className="btn btn--ghost btn--lg" onClick={onHow}>{L.hero_cta2}</button>
          </div>
          <div className="hero__stores">
            {window.FOCUZ_STORES.filter((s) => s.id !== 'all').map((s) => (
              <button key={s.id} className="hero__store" onClick={() => onSeeDeals(s.id)} title={s.name}>
                <StoreLogo store={s.id} size={34} />
              </button>
            ))}
          </div>
          <div className="hero__stats hero__stats--desktop">
            <div className="stat"><b>5000+</b><span>{L.stat_products}</span></div>
            <div className="stat__div" />
            <div className="stat"><b>5</b><span>{L.stat_stores}</span></div>
            <div className="stat__div" />
            <div className="stat"><b>120</b><span>{L.stat_daily}</span></div>
          </div>
        </div>

        <div className="hero__visual" aria-hidden="true">
          <div className="hero__ring" style={px(-8)} />
          <div className="hero__ring hero__ring--2" style={px(6)} />

          {/* featured deal card */}
          <div className="hero-deal" style={px(10)}>
            <div className="hero-deal__media"><div className="hero-deal__stripes" /><span className="hero-deal__disc mono">-58%</span></div>
            <div className="hero-deal__row">
              <StoreLogo store="amazon" size={26} />
              <div className="hero-deal__bars"><span /><span /></div>
            </div>
            <div className="hero-deal__price">
              <span className="hero-deal__old mono">R$ 689</span>
              <span className="hero-deal__now">R$ 289<span>,90</span></span>
            </div>
          </div>

          {/* orbiting store tiles */}
          {tiles.map((t) => (
            <div key={t.id} className={'htile ' + t.cls} style={px(t.f)}>
              <StoreLogo store={t.id} size={t.size} />
            </div>
          ))}

          {/* deal bubbles */}
          <div className="hero-bubble hero-bubble--star" style={px(-18)}><Icon name="star" size={13} fill="currentColor" stroke={0} /> 4.9</div>
          <div className="hero-bubble hero-bubble--bolt" style={px(14)}><Icon name="bolt" size={13} /> {L.hero_eyebrow}</div>
        </div>
      </div>
    </section>
  );
}

/* ============================ HOW IT WORKS ============================ */
function HowItWorks({ L, lang, onSeeDeals }) {
  const steps = [
    { icon: 'spark', t: L.how_s1_t, d: L.how_s1_d },
    { icon: 'grid',  t: L.how_s2_t, d: L.how_s2_d },
    { icon: 'shield', t: L.how_s3_t, d: L.how_s3_d },
    { icon: 'tag',   t: L.how_s4_t, d: L.how_s4_d },
  ];
  return (
    <section className="how">
      <div className="how__bg" aria-hidden="true"><div className="blob blob--1" /><div className="blob blob--2" /></div>
      <div className="how__head">
        <div className="eyebrow how__eyebrow">{L.how_eyebrow}</div>
        <h1 className="how__title">{L.how_title}</h1>
        <p className="how__intro">{L.how_intro}</p>
      </div>
      <div className="how__steps">
        {steps.map((s, i) => (
          <div className="howstep" key={i} style={{ '--i': i }}>
            <div className="howstep__num mono">0{i + 1}</div>
            <div className="howstep__icon"><Icon name={s.icon} size={22} /></div>
            <h3 className="howstep__title">{s.t}</h3>
            <p className="howstep__desc">{s.d}</p>
          </div>
        ))}
      </div>
      <div className="how__stores">
        {window.FOCUZ_STORES.filter((s) => s.id !== 'all').map((s) => (
          <div className="how__store" key={s.id}><StoreLogo store={s.id} size={30} /><span>{s.short}</span></div>
        ))}
      </div>
      <div className="how__cta">
        <button className="btn btn--primary btn--lg" onClick={() => onSeeDeals()}>{L.how_cta} <Icon name="chevronR" size={17} /></button>
      </div>
    </section>
  );
}

/* ============================ STORE SIDEBAR ============================ */
function StoreSidebar({ L, lang, store, setStore, category, setCategory, products }) {
  const [open, setOpen] = useState(false);
  const stores = window.FOCUZ_STORES;
  const current = window.FOCUZ_STORE_MAP[store];
  const others = stores.filter((s) => s.id !== store);
  const countFor = (catId) =>
    products.filter((p) => (store === 'all' || p.store === store) && (catId === 'all' || p.category === catId)).length;

  return (
    <aside className="sidebar">
      <div className="storepicker">
        <div className="eyebrow storepicker__label">{L.stores_title}</div>
        <div className={'storepicker__stack' + (open ? ' is-open' : '')}>
          <button className="storepicker__main" onClick={() => setOpen((o) => !o)}>
            <StoreLogo store={store} size={64} />
            <span className="storepicker__caret" style={{ transform: open ? 'rotate(180deg)' : 'none' }}><Icon name="chevron" size={16} /></span>
          </button>
          <div className="storepicker__current">{current.short}</div>
          <div className="storepicker__others" style={{ maxHeight: open ? others.length * 60 + 'px' : 0 }}>
            {others.map((s, i) => (
              <button key={s.id} className="storepicker__opt" style={{ transitionDelay: (open ? i * 45 : 0) + 'ms' }}
                onClick={() => { setStore(s.id); setOpen(false); }}>
                <StoreLogo store={s.id} size={34} />
                <span className="storepicker__optname">{s.short}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="catfilter">
        <div className="eyebrow catfilter__label"><Icon name="filter" size={13} /> {L.filters_title}</div>
        {/* Dropdown no mobile, chips no desktop */}
        <select className="catfilter__dropdown" value={category} onChange={(e) => setCategory(e.target.value)}>
          {window.FOCUZ_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>{c[lang]} ({countFor(c.id)})</option>
          ))}
        </select>
        <div className="catfilter__list catfilter__list--chips">
          {window.FOCUZ_CATEGORIES.map((c) => (
            <button key={c.id} className={'chip' + (category === c.id ? ' is-active' : '')} onClick={() => setCategory(c.id)}>
              <span>{c[lang]}</span>
              <span className="chip__count mono">{countFor(c.id)}</span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}

/* ============================ PRODUCT CARD ============================ */

/* ============================ PRODUCT MODAL ============================ */
function ProductModal({ p, L, lang, onClose }) {
  const store = window.FOCUZ_STORE_MAP[p.store];
  const cat = window.FOCUZ_CAT_MAP[p.category];
  const disc = discountPct(p.price, p.oldPrice);
  const name = lang === 'en' && p.name_en ? p.name_en : p.name;
  const imgSrc = p.imageUrl || p.image || null;
  const ageBadge = (() => {
    if (!p.createdAt) return null;
    const ageH = (Date.now() - new Date(p.createdAt).getTime()) / 3600000;
    if (ageH < 3) return { label: 'Novo', cls: 'card__timebadge card__timebadge--new' };
    if (ageH >= 42) return { label: 'Expirando', cls: 'card__timebadge card__timebadge--exp' };
    return null;
  })();

  // Fechar com ESC ou clique no overlay
  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', fn);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', fn); document.body.style.overflow = ''; };
  }, []);

  return (
    <div className="pmodal__overlay" onClick={onClose}>
      <div className="pmodal" onClick={(e) => e.stopPropagation()}>
        <button className="pmodal__close" onClick={onClose} aria-label="Fechar">✕</button>

        <div className="pmodal__media">
          {imgSrc
            ? <img src={imgSrc} alt={name} onError={(e) => e.target.style.display='none'} />
            : <div className="pmodal__placeholder"><span>{store.short}</span></div>}
          {disc > 0 && <span className="card__disc mono pmodal__disc">-{disc}%</span>}
        </div>

        <div className="pmodal__body">
          <div className="pmodal__meta">
            <StoreLogo store={p.store} size={22} />
            <span className="pmodal__cat mono">{cat[lang]}</span>
          </div>

          <h2 className="pmodal__name">{name}</h2>
          {ageBadge && <span className={ageBadge.cls} style={{display:'inline-block',marginBottom:'8px'}}>{ageBadge.label}</span>}

          {(p.desc || p.description) && (
            <p className="pmodal__desc">{p.desc || p.description}</p>
          )}

          {p.rating && (
            <div className="pmodal__rating">
              {'★★★★★'.slice(0, Math.round(p.rating))}{'☆☆☆☆☆'.slice(0, 5 - Math.round(p.rating))}
              <b>{Number(p.rating).toFixed(1)}</b>
              <span>· {p.reviews?.toLocaleString('pt-BR')} avaliações</span>
            </div>
          )}

          <div className="pmodal__pricing">
            {p.oldPrice > p.price && (
              <span className="pmodal__old">{fmtBRL(p.oldPrice)}</span>
            )}
            <span className="pmodal__price">{fmtBRL(p.price)}</span>
            {disc > 0 && <span className="pmodal__saving">Economia de {fmtBRL(p.oldPrice - p.price)}</span>}
          </div>

          <a
            className="btn btn--primary btn--lg pmodal__buy"
            href={p.url || '#'}
            target={p.url && p.url !== '#' ? '_blank' : undefined}
            rel="noopener noreferrer"
            onClick={onClose}
          >
            Comprar agora
          </a>

          <p className="pmodal__disclaimer">
            Você será redirecionado para {store.name}
          </p>
        </div>
      </div>
    </div>
  );
}

function ProductCard({ p, L, lang, tw, i = 0, onOpenModal }) {
  const ref = useRef(null);
  const store = window.FOCUZ_STORE_MAP[p.store];
  const cat = window.FOCUZ_CAT_MAP[p.category];
  const disc = discountPct(p.price, p.oldPrice);
  const name = lang === 'en' && p.name_en ? p.name_en : p.name;
  const imgSrc = p.imageUrl || p.image || null;

  // Badge de tempo: "NOVO" se < 3h, "EXPIRANDO" se > 42h
  const ageBadge = (() => {
    if (!p.createdAt) return null;
    const ageH = (Date.now() - new Date(p.createdAt).getTime()) / 3600000;
    if (ageH < 3) return { label: 'Novo', cls: 'card__timebadge card__timebadge--new' };
    if (ageH >= 42) return { label: 'Expirando', cls: 'card__timebadge card__timebadge--exp' };
    return null;
  })();

  const onMove = (e) => {
    if (!tw.tilt || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const rx = ((e.clientY - r.top) / r.height - 0.5) * -7;
    const ry = ((e.clientX - r.left) / r.width - 0.5) * 9;
    ref.current.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg)`;
  };
  const onLeave = () => { if (ref.current) ref.current.style.transform = ''; };

  return (
    <article className={'card card--' + tw.cardStyle} ref={ref} onMouseMove={onMove} onMouseLeave={onLeave}
      style={{ '--i': Math.min(i, 18), cursor: 'pointer' }}
      onClick={() => onOpenModal && onOpenModal(p)}>
      <div className="card__media">
        {imgSrc
          ? <img src={imgSrc} alt={name} loading="lazy" onError={(e) => { e.target.style.display = 'none'; }} />
          : <Placeholder label={'foto · ' + store.short.toLowerCase()} />}
        {disc > 0 && <span className="card__disc mono">-{disc}%</span>}
        {ageBadge && <span className={ageBadge.cls}>{ageBadge.label}</span>}
        <span className="card__store"><StoreLogo store={p.store} size={18} className="store-logo--bare" />{store.short}</span>
      </div>
      <div className="card__body">
        <div className="card__cat mono">{cat[lang]}</div>
        <h3 className="card__name">{name}</h3>
        {p.rating && (
          <div className="card__rating">
            <Icon name="star" size={13} fill="currentColor" stroke={0} />
            <b>{Number(p.rating).toFixed(1)}</b>
            <span>· {p.reviews?.toLocaleString(lang === 'en' ? 'en-US' : 'pt-BR')} {L.reviews}</span>
          </div>
        )}
        <div className="card__pricing">
          <div className="card__price-wrap">
            {p.oldPrice > p.price && <span className="card__old">{fmtBRL(p.oldPrice)}</span>}
            <span className="card__price">{fmtBRL(p.price)}</span>
          </div>
          <a className="card__buy" href={p.url || '#'} target={p.url && p.url !== '#' ? '_blank' : undefined} rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}>
            {L.buy} <Icon name="cart" size={15} />
          </a>
        </div>
      </div>
    </article>
  );
}

/* ============================ PRODUCT GRID ============================ */
function ProductGrid({ L, lang, tw, store, products, query, setQuery, category }) {
  const [sort, setSort] = useState('relevance');
  const [modalProduct, setModalProduct] = useState(null);

  let list = products.filter((p) => {
    if (store !== 'all' && p.store !== store) return false;
    if (category !== 'all' && p.category !== category) return false;
    if (query) { const n = (p.name + ' ' + (p.name_en || '')).toLowerCase(); if (!n.includes(query.toLowerCase())) return false; }
    return true;
  });
  list = [...list].sort((a, b) => {
    if (sort === 'price_low') return a.price - b.price;
    if (sort === 'price_high') return b.price - a.price;
    if (sort === 'discount') return discountPct(b.price, b.oldPrice) - discountPct(a.price, a.oldPrice);
    return 0;
  });

  /* staggered entrance whenever the filter signature changes */
  const sig = store + '|' + category + '|' + query + '|' + sort;
  const [entering, setEntering] = useState(true);
  useEffect(() => {
    setEntering(true);
    const ms = Math.min(list.length, 18) * 38 + 560;
    const t = setTimeout(() => setEntering(false), ms);
    return () => clearTimeout(t);
  }, [sig]);

  const cur = window.FOCUZ_STORE_MAP[store];

  return (
    <>
    <section className="grid-wrap">
      <div className="grid-head">
        <div className="grid-head__title">
          {store !== 'all' && <StoreLogo store={store} size={40} />}
          <div>
            <h2 className="grid-title">{store === 'all' ? L.grid_title : cur.name}</h2>
            <div className="grid-sub mono">{list.length} {L.grid_sub}</div>
          </div>
        </div>
        <div className="grid-tools">
          <label className="search">
            <Icon name="search" size={16} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={L.search_ph} />
          </label>
          <div className="sortsel">
                        <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="relevance">{L.sort_relevance}</option>
              <option value="price_low">{L.sort_price_low}</option>
              <option value="price_high">{L.sort_price_high}</option>
              <option value="discount">{L.sort_discount}</option>
            </select>
          </div>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="empty">
          <div className="empty__icon"><Icon name="box" size={30} /></div>
          <h3>{L.empty_title}</h3><p>{L.empty_sub}</p>
        </div>
      ) : (
        <div className={'grid grid--' + tw.density + (entering ? ' is-entering' : '')}>
          {list.map((p, i) => <ProductCard key={p.id} p={p} L={L} lang={lang} tw={tw} i={i} onOpenModal={setModalProduct} />)}
        </div>
      )}
    </section>
    {modalProduct && (
      <ProductModal p={modalProduct} L={L} lang={lang} onClose={() => setModalProduct(null)} />
    )}
    </>
  );
}

/* ============================ FOOTERS ============================ */
function Footer({ L, onAdmin, go }) {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__brand">
          <span className="focuz-logo" style={{ height: 24, width: Math.round(24 * 4.231) }} role="img" aria-label="Proruja" />
          <div className="footer__tag mono">{L.footer_made}</div>
        </div>
        <div className="footer__stores">
          {window.FOCUZ_STORES.filter((s) => s.id !== 'all').map((s) => (
            <div key={s.id} className="footer__store"><StoreLogo store={s.id} size={22} /><span>{s.short}</span></div>
          ))}
        </div>
        <button className="footer__admin" onClick={onAdmin}><Icon name="lock" size={14} /> {L.footer_admin}</button>
      </div>
    </footer>
  );
}
function FooterMini({ L, onAdmin }) {
  return (
    <div className="footer-mini">
      <button className="footer__admin" onClick={onAdmin}><Icon name="lock" size={14} /> {L.footer_admin}</button>
    </div>
  );
}

Object.assign(window, { TopNav, Hero, HowItWorks, StoreSidebar, ProductGrid, ProductCard, Footer, FooterMini, StoreLogo, FocuzLogo, Placeholder, fmtBRL, discountPct });
