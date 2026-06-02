/* ============================================================
   FOCUZ — top-level app (screen router, theme, i18n, persistence)
   ============================================================ */
const { useState: tUseState, useEffect: tUseEffect, useRef: tUseRef } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "cardStyle": "soft",
  "heroStyle": "aurora",
  "density": "cozy",
  "tilt": true,
  "accentBoost": 1
}/*EDITMODE-END*/;

const LS_PRODUCTS = 'focuz_products_v1';

/* ---- autenticação via API segura (JWT + bcrypt no servidor) ---- */
const API = '/api';

async function checkLogin(email, password) {
  try {
    const res = await fetch(`${API}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) return false;
    const { token } = await res.json();
    sessionStorage.setItem('focuz_token', token);
    return true;
  } catch {
    return false;
  }
}
window.checkLogin = checkLogin;

/* Helper para chamadas autenticadas à API */
window.apiRequest = async function(method, path, body) {
  const token = sessionStorage.getItem('focuz_token');
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    sessionStorage.removeItem('focuz_token');
    sessionStorage.removeItem('focuz_auth');
    location.reload();
    return null;
  }
  return res.json();
};

function loadProducts() {
  return [];
}

const SCREENS = ['home', 'store', 'how', 'admin'];
const hashToScreen = () => {
  const h = (location.hash || '').replace('#', '');
  return SCREENS.includes(h) ? h : 'home';
};

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  /* theme: follow system + manual override */
  const [theme, setTheme] = tUseState(() => {
    const saved = localStorage.getItem('focuz_theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  tUseEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('focuz_theme', theme);
  }, [theme]);
  tUseEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const fn = (e) => { if (!localStorage.getItem('focuz_theme_manual')) setTheme(e.matches ? 'dark' : 'light'); };
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);
  const toggleTheme = () => { localStorage.setItem('focuz_theme_manual', '1'); setTheme((x) => (x === 'dark' ? 'light' : 'dark')); };

  const [lang, setLang] = tUseState(() => localStorage.getItem('focuz_lang') || 'pt');
  tUseEffect(() => localStorage.setItem('focuz_lang', lang), [lang]);
  const L = window.FOCUZ_I18N[lang];

  /* screen router with Apple-style enter transition */
  const [screen, setScreen] = tUseState(hashToScreen);
  const [animKey, setAnimKey] = tUseState(0);
  tUseEffect(() => {
    const fn = () => { setScreen(hashToScreen()); setAnimKey((k) => k + 1); };
    window.addEventListener('hashchange', fn);
    return () => window.removeEventListener('hashchange', fn);
  }, []);
  const go = (s) => {
    if (s === screen) return;
    if (location.hash !== '#' + s) location.hash = s === 'home' ? '' : '#' + s;
    setScreen(s); setAnimKey((k) => k + 1);
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const [authed, setAuthed] = tUseState(() => sessionStorage.getItem('focuz_auth') === '1');
  tUseEffect(() => { authed ? sessionStorage.setItem('focuz_auth', '1') : sessionStorage.removeItem('focuz_auth'); }, [authed]);

  const [store, setStore] = tUseState('amazon');
  const [category, setCategory] = tUseState('all');
  const [query, setQuery] = tUseState('');

  const [products, setProducts] = tUseState(loadProducts);

  // Busca produtos da API ao carregar
  tUseEffect(() => {
    window.apiRequest('GET', '/products').then((data) => {
      if (Array.isArray(data) && data.length > 0) {
        setProducts(data);
        try { localStorage.setItem(LS_PRODUCTS, JSON.stringify(data)); } catch {}
      }
    }).catch(() => {/* mantém os dados locais em caso de erro */});
  }, []);

  const addProduct = async (p) => {
    const payload = { ...p, imageUrl: p.imageUrl || p.image || '' };
    const created = await window.apiRequest('POST', '/products', payload);
    if (created) setProducts((list) => [{ ...created, image: created.imageUrl }, ...list]);
  };
  const updateProduct = async (p) => {
    const payload = { ...p, imageUrl: p.imageUrl || p.image || '' };
    const updated = await window.apiRequest('PUT', `/products/${p.id}`, payload);
    if (updated) setProducts((list) => list.map((x) => (x.id === p.id ? { ...updated, image: updated.imageUrl } : x)));
  };
  const deleteProduct = async (p) => {
    await window.apiRequest('DELETE', `/products/${p.id}`);
    setProducts((list) => list.filter((x) => x.id !== p.id));
  };

  const goStore = (s) => { if (s) setStore(s); go('store'); };

  /* ---- ADMIN screen (own chrome) ---- */
  if (screen === 'admin') {
    return (
      <div className="app-root" data-store={store} style={{ '--accent-boost': t.accentBoost }}>
        <AdminApp
          L={L} lang={lang} setLang={setLang} theme={theme} toggleTheme={toggleTheme}
          authed={authed} setAuthed={setAuthed}
          products={products} addProduct={addProduct} updateProduct={updateProduct} deleteProduct={deleteProduct}
          onExit={() => go('home')} />
        <TweaksUI t={t} setTweak={setTweak} lang={lang} />
      </div>
    );
  }

  return (
    <div className="app-root" data-store={store} style={{ '--accent-boost': t.accentBoost }}>
      <TopNav L={L} lang={lang} setLang={setLang} theme={theme} toggleTheme={toggleTheme}
        screen={screen} go={go} />

      <ScreenWrap animKey={animKey}>
        {screen === 'home' && <Hero L={L} tw={t} stats={{ products: products.length }} onSeeDeals={() => goStore()} onHow={() => go('how')} />}
        {screen === 'how' && <HowItWorks L={L} lang={lang} onSeeDeals={() => goStore()} />}
        {screen === 'store' && (
          <div className="shell">
            <StoreSidebar L={L} lang={lang} store={store} setStore={setStore} category={category} setCategory={setCategory} products={products} />
            <ProductGrid L={L} lang={lang} tw={t} store={store} products={products} query={query} setQuery={setQuery} category={category} />
          </div>
        )}
      </ScreenWrap>

      {screen !== 'store' && <Footer L={L} onAdmin={() => go('admin')} go={go} />}
      {screen === 'store' && <FooterMini L={L} onAdmin={() => go('admin')} />}

      <TweaksUI t={t} setTweak={setTweak} lang={lang} />
    </div>
  );
}

/* ---------------- Screen wrapper (safe Apple-style enter) ---------------- */
function ScreenWrap({ animKey, children }) {
  const [entering, setEntering] = tUseState(true);
  tUseEffect(() => {
    setEntering(true);
    const t = setTimeout(() => setEntering(false), 650);
    return () => clearTimeout(t);
  }, [animKey]);
  return <div className={'screen' + (entering ? ' is-entering' : '')}>{children}</div>;
}

/* ---------------- Tweaks panel ---------------- */
function TweaksUI({ t, setTweak, lang }) {
  const en = lang === 'en';
  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label={en ? 'Product card' : 'Card de produto'} />
      <TweakRadio label={en ? 'Style' : 'Estilo'} value={t.cardStyle}
        options={['soft', 'glass', 'editorial']} onChange={(v) => setTweak('cardStyle', v)} />
      <TweakToggle label={en ? '3D tilt on hover' : 'Tilt 3D no hover'} value={t.tilt}
        onChange={(v) => setTweak('tilt', v)} />
      <TweakRadio label={en ? 'Grid density' : 'Densidade'} value={t.density}
        options={['cozy', 'compact']} onChange={(v) => setTweak('density', v)} />
      <TweakSection label="Hero" />
      <TweakRadio label={en ? 'Background' : 'Fundo'} value={t.heroStyle}
        options={['aurora', 'mesh', 'minimal']} onChange={(v) => setTweak('heroStyle', v)} />
      <TweakSection label={en ? 'Theme' : 'Tema'} />
      <TweakSlider label={en ? 'Accent intensity' : 'Intensidade do acento'} value={t.accentBoost}
        min={0.6} max={1.5} step={0.05} onChange={(v) => setTweak('accentBoost', v)} />
    </TweaksPanel>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
