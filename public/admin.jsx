/* ============================================================
   FOCUZ — admin (login, dashboard, products table, product form)
   Exports: AdminApp
   ============================================================ */
const { useState: aUseState, useMemo: aUseMemo, useRef: aUseRef } = React;

/* ---------------- Login (hashed, no plaintext credentials in code) ---------------- */
function AdminLogin({ L, onLogin, onBack }) {
  const [user, setUser] = aUseState('');
  const [pass, setPass] = aUseState('');
  const [err, setErr] = aUseState(false);
  const [busy, setBusy] = aUseState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const ok = await window.checkLogin(user, pass);
    setBusy(false);
    if (ok) onLogin(); else setErr(true);
  };
  return (
    <div className="login">
      <div className="login__bg" aria-hidden="true">
        <div className="blob blob--1" /><div className="blob blob--2" />
      </div>
      <form className="login__card" onSubmit={submit}>
        <div className="login__logo">
          <span className="focuz-logo" style={{ height: 36, width: Math.round(36 * 4.231), display: 'block' }} role="img" aria-label="Proruja" />
        </div>
        <h1 className="login__title">{L.login_title}</h1>
        <p className="login__sub">{L.login_sub}</p>

        <label className="field">
          <span className="field__label">{L.login_user}</span>
          <div className="field__wrap">
            <input value={user} onChange={(e) => { setUser(e.target.value); setErr(false); }} autoFocus placeholder="admin@email.com" />
          </div>
        </label>
        <label className="field">
          <span className="field__label">{L.login_pass}</span>
          <div className="field__wrap">
            <input type="password" value={pass} onChange={(e) => { setPass(e.target.value); setErr(false); }} placeholder="••••••••" />
          </div>
        </label>

        {err && <div className="login__err">{L.login_err}</div>}

        <button className="btn btn--primary btn--lg login__btn" type="submit" disabled={busy}>
          {busy ? <span className="spin" /> : null} {L.login_btn}
        </button>


        <button type="button" className="login__back" onClick={onBack}>
          <Icon name="chevron" size={14} style={{ transform: 'rotate(90deg)' }} /> {L.login_back}
        </button>
      </form>
    </div>
  );
}

/* ---------------- Dashboard ---------------- */
function Dashboard({ L, lang, products }) {
  const stats = aUseMemo(() => {
    const total = products.length;
    const stores = new Set(products.map((p) => p.store)).size;
    const avg = total ? products.reduce((s, p) => s + p.price, 0) / total : 0;
    const discs = products.map((p) => discountPct(p.price, p.oldPrice)).filter(Boolean);
    const avgDisc = discs.length ? Math.round(discs.reduce((a, b) => a + b, 0) / discs.length) : 0;
    const byStore = window.FOCUZ_STORES.filter(s => s.id !== 'all').map(s => ({
      ...s, n: products.filter(p => p.store === s.id).length,
    }));
    const max = Math.max(1, ...byStore.map(s => s.n));
    return { total, stores, avg, avgDisc, byStore, max };
  }, [products]);

  const kpis = [
    { icon: 'box', label: L.kpi_total, val: stats.total },
    { icon: 'globe', label: L.kpi_stores, val: stats.stores + ' / 5' },
    { icon: 'tag', label: L.kpi_avg, val: fmtBRL(stats.avg) },
    { icon: 'trend', label: L.kpi_disc, val: stats.avgDisc + '%' },
  ];
  return (
    <div className="dash">
      <div className="kpis">
        {kpis.map((k) => (
          <div className="kpi" key={k.label}>
            <div className="kpi__icon"><Icon name={k.icon} size={18} /></div>
            <div className="kpi__val">{k.val}</div>
            <div className="kpi__label">{k.label}</div>
          </div>
        ))}
      </div>
      <div className="panel">
        <div className="panel__head"><h3>{lang === 'en' ? 'Products by store' : 'Produtos por loja'}</h3></div>
        <div className="bars">
          {stats.byStore.map((s) => (
            <div className="bar" key={s.id}>
              <span className="bar__name" data-store={s.id}>
                <StoreLogo store={s.id} size={22} />{s.short}
              </span>
              <div className="bar__track">
                <div className="bar__fill" data-store={s.id} style={{ width: (s.n / stats.max * 100) + '%' }} />
              </div>
              <span className="bar__n mono">{s.n}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Products Table ---------------- */
function ProductsTable({ L, lang, products, onEdit, onDelete, onNew, onRenew }) {
  const [q, setQ] = aUseState('');
  const [storeFilter, setStoreFilter] = aUseState('all');

  const getAge = (p) => p.createdAt ? (Date.now() - new Date(p.createdAt).getTime()) / 3600000 : 0;
  const getStatus = (p) => {
    const h = getAge(p);
    if (h >= 48) return 'expired';
    if (h >= 42) return 'expiring';
    if (h < 3) return 'new';
    return 'active';
  };

  const stores = ['all', ...new Set(products.map(p => p.store))];
  const list = products.filter((p) => {
    if (storeFilter !== 'all' && p.store !== storeFilter) return false;
    return (p.name + ' ' + (p.name_en || '')).toLowerCase().includes(q.toLowerCase());
  });

  const statusLabel = { new: 'Novo', active: 'Ativo', expiring: 'Expirando', expired: 'Expirado' };
  const statusCls   = { new: 'ptable__status--new', active: 'ptable__status--active', expiring: 'ptable__status--exp', expired: 'ptable__status--dead' };

  return (
    <div className="ptable-wrap">
      <div className="ptable-head">
        <label className="search search--admin">
          <Icon name="search" size={16} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={L.search_admin} />
        </label>
        <button className="btn btn--primary" onClick={onNew}><Icon name="plus" size={16} /> {L.admin_new}</button>
      </div>
      <div className="ptable-filters">
        {stores.map((s) => {
          const st = window.FOCUZ_STORE_MAP[s];
          return (
            <button key={s} className={'ptable-filter' + (storeFilter === s ? ' is-active' : '')} onClick={() => setStoreFilter(s)}>
              {s === 'all' ? 'Todas' : <><StoreLogo store={s} size={16} className="store-logo--bare" />{st?.short}</>}
            </button>
          );
        })}
      </div>
      <div className="ptable">
        <div className="ptable__row ptable__row--head">
          <span>{L.tbl_product}</span><span>{L.tbl_store}</span><span>Status</span>
          <span>{L.tbl_price}</span><span className="ptable__act">{L.tbl_actions}</span>
        </div>
        {list.map((p) => {
          const store = window.FOCUZ_STORE_MAP[p.store];
          const status = getStatus(p);
          const imgSrc = p.imageUrl || p.image || null;
          return (
            <div className={'ptable__row' + (status === 'expired' ? ' ptable__row--expired' : '')} key={p.id}>
              <span className="ptable__prod">
                <span className="ptable__thumb">{imgSrc ? <img src={imgSrc} alt="" /> : <Icon name="image" size={16} />}</span>
                <span className="ptable__pname">{lang === 'en' && p.name_en ? p.name_en : p.name}</span>
              </span>
              <span><span className="pill" data-store={p.store}><StoreLogo store={p.store} size={18} className="store-logo--bare" />{store.short}</span></span>
              <span><span className={'ptable__status ' + statusCls[status]}>{statusLabel[status]}</span></span>
              <span className="ptable__price">{fmtBRL(p.price)}</span>
              <span className="ptable__act">
                {status === 'expired'
                  ? <button className="btn btn--sm btn--ghost" onClick={() => onRenew && onRenew(p)} title="Renovar por mais 48h">Renovar</button>
                  : <button className="iconbtn iconbtn--sm" onClick={() => onEdit(p)} title={L.f_edit}><Icon name="edit" size={15} /></button>
                }
                <button className="iconbtn iconbtn--sm iconbtn--danger" onClick={() => onDelete(p)} title={L.f_delete}><Icon name="trash" size={15} /></button>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Product Form (+ URL import) ---------------- */
const blank = { name: '', name_en: '', desc: '', description: '', category: 'tech', store: 'amazon', price: '', oldPrice: '', image: '', url: '' };

function ProductForm({ L, lang, editing, onSave, onCancel }) {
  const editingNorm = editing ? { ...editing, image: editing.image || editing.imageUrl || '' } : null;
  const [f, setF] = aUseState(editingNorm ? { ...blank, ...editingNorm } : { ...blank });
  const [importUrl, setImportUrl] = aUseState('');
  const [importing, setImporting] = aUseState(false);
  const [flash, setFlash] = aUseState('');
  const [errs, setErrs] = aUseState({});
  const set = (k) => (e) => setF((o) => ({ ...o, [k]: e.target.value }));

  const looksImage = (u) => /\.(png|jpe?g|webp|gif|avif)(\?|$)/i.test(u);

  const hostGuessStore = (host) =>
    /amazon/.test(host) ? 'amazon' : /mercadolivre|mercadolibre/.test(host) ? 'ml' :
    /shopee/.test(host) ? 'shopee' : /magal|magazine/.test(host) ? 'magalu' :
    /aliexpress|ali/.test(host) ? 'ali' : '';

  const runImport = async () => {
    const url = importUrl.trim();
    if (!url) return;
    setImporting(true); setFlash(L.importing);
    let host = 'loja.com';
    try { host = new URL(url).hostname.replace('www.', ''); } catch (e) {}

    const catIds = window.FOCUZ_CATEGORIES.filter((c) => c.id !== 'all').map((c) => c.id).join(', ');
    const storeIds = 'amazon, ml, shopee, magalu, ali';
    const prompt =
`You are a product data extractor for a Brazilian affiliate deals site.
Read this product URL and infer the product from its slug, path and domain: ${url}

Return ONLY a JSON object (no markdown, no commentary) with exactly these keys:
{"name": "<product name in Portuguese>", "name_en": "<product name in English>", "category": "<one of: ${catIds}>", "store": "<one of: ${storeIds}>", "price": <number BRL or null>, "oldPrice": <number BRL or null>, "desc": "<one short sentence in Portuguese>"}
Pick the closest category. Infer the store from the domain. If price is unknown use null.`;

    let data = null;
    try {
      const raw = await window.claude.complete(prompt);
      const m = raw.match(/\{[\s\S]*\}/);
      data = JSON.parse(m ? m[0] : raw);
    } catch (e) { data = null; }

    const validCat = (c) => window.FOCUZ_CAT_MAP[c] ? c : f.category;
    const validStore = (s) => window.FOCUZ_STORE_MAP[s] && s !== 'all' ? s : (hostGuessStore(host) || f.store);

    if (data && (data.name || data.store)) {
      setF((o) => ({
        ...o,
        name: data.name || o.name,
        name_en: data.name_en || o.name_en,
        desc: data.desc || o.desc,
        category: validCat(data.category),
        store: validStore(data.store),
        price: (data.price != null ? String(data.price) : o.price),
        oldPrice: (data.oldPrice != null ? String(data.oldPrice) : o.oldPrice),
        image: looksImage(url) ? url : o.image,
        url,
      }));
      setImporting(false); setFlash(L.imported);
    } else {
      // graceful fallback: domain heuristic only
      setF((o) => ({ ...o, store: hostGuessStore(host) || o.store, image: looksImage(url) ? url : o.image, url }));
      setImporting(false); setFlash(L.f_import_fail);
    }
    setTimeout(() => setFlash(''), 3200);
  };

  const submit = (e) => {
    e.preventDefault();
    const er = {};
    if (!f.name.trim()) er.name = true;
    if (!f.price || isNaN(parseFloat(f.price))) er.price = true;
    if (!f.url.trim()) er.url = true;
    setErrs(er);
    if (Object.keys(er).length) { setFlash(L.f_required); return; }
    onSave({
      ...f,
      price: parseFloat(f.price),
      oldPrice: f.oldPrice ? parseFloat(f.oldPrice) : 0,
      rating: editing?.rating || (4 + Math.random()).toFixed(1) * 1,
      reviews: editing?.reviews || Math.floor(50 + Math.random() * 2000),
    });
  };

  const fieldCls = (k) => 'field__wrap' + (errs[k] ? ' is-error' : '');

  return (
    <form className="pform" onSubmit={submit}>
      <div className="pform__main">
        <div className="panel">
          <div className="panel__head">
            <h3>{editing ? L.form_edit : L.form_new}</h3>
          </div>

          {/* import block */}
          <div className="import">
            <div className="import__label"><Icon name="link" size={14} /> {L.f_import}</div>
            <div className="import__row">
              <input value={importUrl} onChange={(e) => setImportUrl(e.target.value)} placeholder={L.f_import_ph} />
              <button type="button" className="btn btn--primary" onClick={runImport} disabled={importing}>
                {importing ? <span className="spin" /> : <Icon name="bolt" size={15} />}
                {L.f_import_btn}
              </button>
            </div>
            <div className="import__note mono">{L.f_import_note}</div>
          </div>

          <div className="pform__grid">
            <label className="field field--full">
              <span className="field__label">{L.f_name} *</span>
              <div className={fieldCls('name')}><input value={f.name} onChange={set('name')} placeholder="Ex.: Fone Bluetooth ANC" /></div>
            </label>
            <label className="field field--full">
              <span className="field__label">{L.f_desc}</span>
              <div className="field__wrap field__wrap--area">
                <textarea value={f.desc} onChange={set('desc')} rows={3} placeholder="…" />
              </div>
            </label>
            <label className="field">
              <span className="field__label">{L.f_store}</span>
              <div className="field__wrap">
                <select value={f.store} onChange={set('store')}>
                  {window.FOCUZ_STORES.filter(s => s.id !== 'all').map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </label>
            <label className="field">
              <span className="field__label">{L.f_cat}</span>
              <div className="field__wrap">
                <select value={f.category} onChange={set('category')}>
                  {window.FOCUZ_CATEGORIES.filter(c => c.id !== 'all').map((c) => <option key={c.id} value={c.id}>{c[lang]}</option>)}
                </select>
              </div>
            </label>
            <label className="field">
              <span className="field__label">{L.f_price} *</span>
              <div className={fieldCls('price')}><input value={f.price} onChange={set('price')} inputMode="decimal" placeholder="289.90" /></div>
            </label>
            <label className="field">
              <span className="field__label">{L.f_old}</span>
              <div className="field__wrap"><input value={f.oldPrice} onChange={set('oldPrice')} inputMode="decimal" placeholder="549.00" /></div>
            </label>
            <label className="field field--full">
              <span className="field__label">{L.f_img}</span>
              <div className="field__wrap"><Icon name="image" size={16} /><input value={f.image} onChange={set('image')} placeholder="https://…/foto.jpg" /></div>
            </label>
            <label className="field field--full">
              <span className="field__label">{L.f_link} *</span>
              <div className={fieldCls('url')}><Icon name="link" size={16} /><input value={f.url} onChange={set('url')} placeholder="https://…link-afiliado" /></div>
            </label>
          </div>

          {flash && <div className="pform__flash"><Icon name="check" size={14} /> {flash}</div>}

          <div className="pform__actions">
            <button type="button" className="btn btn--ghost" onClick={onCancel}>{L.f_cancel}</button>
            <button type="submit" className="btn btn--primary"><Icon name="check" size={16} /> {L.f_save}</button>
          </div>
        </div>
      </div>

      {/* live preview */}
      <div className="pform__side">
        <div className="eyebrow" style={{ marginBottom: 12 }}>{lang === 'en' ? 'Live preview' : 'Prévia ao vivo'}</div>
        <ProductCard
          tw={{ cardStyle: 'soft', tilt: false }}
          L={L} lang={lang}
          p={{
            ...f,
            id: 'preview',
            price: parseFloat(f.price) || 0,
            oldPrice: parseFloat(f.oldPrice) || 0,
            rating: editing?.rating || 4.7, reviews: editing?.reviews || 320,
            name: f.name || (lang === 'en' ? 'Product name' : 'Nome do produto'),
            name_en: f.name_en || f.name,
          }} />
      </div>
    </form>
  );
}

/* ---------------- Admin App shell ---------------- */
function AdminApp({ L, lang, setLang, theme, toggleTheme, authed, setAuthed, products, addProduct, updateProduct, deleteProduct, onExit }) {
  const [view, setView] = aUseState('dash'); // dash | products | form
  const [editing, setEditing] = aUseState(null);
  const [botRunning, setBotRunning] = aUseState(false);
  const [botResult, setBotResult] = aUseState(null);

  const renewProduct = async (p) => {
    // Renovar: atualiza created_at para agora via PUT
    const payload = { ...p, imageUrl: p.imageUrl || p.image || '', _renew: true };
    const updated = await window.apiRequest('PUT', `/products/${p.id}`, payload);
    if (updated) {
      const fresh = { ...updated, image: updated.imageUrl, createdAt: new Date().toISOString() };
      window.apiRequest('GET', '/products').then((data) => {
        if (Array.isArray(data)) {
          // Força reload dos produtos
          window.location.reload();
        }
      });
    }
  };

  const runBot = async () => {
    setBotRunning(true);
    setBotResult(null);
    try {
      const res = await window.apiRequest('POST', '/ml/run-bot');
      setBotResult(res);
      if (res && res.totalAdded > 0) {
        // Recarrega produtos após o bot rodar
        const updated = await window.apiRequest('GET', '/products');
        if (Array.isArray(updated)) window.location.reload();
      }
    } catch (e) {
      setBotResult({ error: e.message });
    }
    setBotRunning(false);
  };

  if (!authed) return <AdminLogin L={L} onLogin={() => setAuthed(true)} onBack={onExit} />;

  const goNew = () => { setEditing(null); setView('form'); };
  const goEdit = (p) => { setEditing(p); setView('form'); };
  const save = (p) => { editing ? updateProduct({ ...editing, ...p }) : addProduct(p); setView('products'); setEditing(null); };

  const nav = [
    { id: 'dash', icon: 'layout', label: L.admin_dash },
    { id: 'products', icon: 'grid', label: L.admin_products },
    { id: 'form', icon: 'plus', label: L.admin_new },
  ];

  return (
    <div className="admin">
      <aside className="admin__nav">
        <button className="brand admin__brand" onClick={onExit}>
          <span className="focuz-logo" style={{ height: 22, width: 76 }} role="img" aria-label="Focuz" />
          <span className="admin__badge mono">admin</span>
        </button>
        <nav className="admin__menu">
          {nav.map((n) => (
            <button key={n.id} className={'admin__link' + (view === n.id ? ' is-active' : '')}
              onClick={() => { if (n.id === 'form') goNew(); else setView(n.id); }}>
              <Icon name={n.icon} size={17} /> {n.label}
            </button>
          ))}
        </nav>
        <div className="admin__navfoot">
          <button className="admin__link" onClick={() => setLang(lang === 'pt' ? 'en' : 'pt')}>
            <Icon name="globe" size={17} /> <span className="mono">{lang.toUpperCase()}</span>
          </button>

          <button className="admin__link" onClick={onExit}><Icon name="external" size={17} /> {L.admin_view_site}</button>
          <button className="admin__link admin__logout" onClick={() => { setAuthed(false); onExit(); }}>
            <Icon name="lock" size={17} /> {L.admin_logout}
          </button>
        </div>
      </aside>

      <main className="admin__main">
        {/* Barra mobile — voltar ao site + sair */}
        <div className="admin__mobilebar">
          <button className="admin__mobilebtn" onClick={onExit}>
            <Icon name="external" size={15} /> Ver site
          </button>
          <span className="admin__mobiletitle">Admin</span>
          <button className="admin__mobilebtn admin__mobilebtn--danger" onClick={() => { setAuthed(false); onExit(); }}>
            <Icon name="lock" size={15} /> Sair
          </button>
        </div>
        <div className="admin__topbar">
          <h2 className="admin__h">
            {view === 'dash' ? L.admin_dash : view === 'products' ? L.admin_products : (editing ? L.form_edit : L.form_new)}
          </h2>
          {view !== 'form' && <button className="btn btn--primary" onClick={goNew}><Icon name="plus" size={16} /> {L.admin_new}</button>}
        </div>
        <div className="admin__content">
          {view === 'dash' && <Dashboard L={L} lang={lang} products={products} />}
          {view === 'dash' && (
            <div style={{margin:'1.5rem 0', padding:'1.25rem', background:'var(--surface-2)', borderRadius:'12px', border:'1px solid var(--border)'}}>
              <div style={{display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'0.75rem'}}>
                <span style={{fontSize:'1.25rem'}}>🤖</span>
                <strong>Bot do Mercado Livre</strong>
                <span style={{fontSize:'0.75rem', color:'var(--text-2)', marginLeft:'auto'}}>Roda automaticamente todo dia às 8h</span>
              </div>
              <button
                className="btn btn--primary"
                onClick={runBot}
                disabled={botRunning}
                style={{display:'flex', alignItems:'center', gap:'0.5rem'}}
              >
                {botRunning ? <span className="spin" /> : <Icon name="trend" size={15} />}
                {botRunning ? 'Buscando promoções...' : 'Rodar agora'}
              </button>
              {botResult && !botResult.error && (
                <div style={{marginTop:'0.75rem', color:'var(--success, #22c55e)', fontSize:'0.875rem'}}>
                  ✅ {botResult.totalAdded} produtos adicionados, {botResult.totalSkipped} ignorados
                </div>
              )}
              {botResult && botResult.error && (
                <div style={{marginTop:'0.75rem', color:'var(--error, #ef4444)', fontSize:'0.875rem'}}>
                  ❌ {botResult.error}
                </div>
              )}
            </div>
          )}
          {view === 'products' && <ProductsTable L={L} lang={lang} products={products} onEdit={goEdit} onDelete={deleteProduct} onNew={goNew} onRenew={renewProduct} />}
          {view === 'form' && <ProductForm L={L} lang={lang} editing={editing} onSave={save} onCancel={() => setView('products')} />}
        </div>
      </main>
    </div>
  );
}

Object.assign(window, { AdminApp });
