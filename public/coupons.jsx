/* ============================================================
   COUPONS PAGE — tela pública de cupons
   ============================================================ */
const { useState: cUseState, useEffect: cUseEffect } = React;
const _fmtBRL = (v) => (window.fmtBRL ? window._fmtBRL(v) : 'R$ ' + Number(v).toFixed(2).replace('.',','));
const _StoreLogo = (props) => window.StoreLogo ? React.createElement(window.StoreLogo, props) : null;

/* Countdown timer hook */
function calcTime(expiresAt) {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return { expired: true, d:0, h:0, m:0, s:0 };
  return {
    expired: false,
    d: Math.floor(diff / 86400000),
    h: Math.floor((diff % 86400000) / 3600000),
    m: Math.floor((diff % 3600000) / 60000),
    s: Math.floor((diff % 60000) / 1000)
  };
}

function useCountdown(expiresAt) {
  const [time, setTime] = cUseState(() => calcTime(expiresAt));
  cUseEffect(() => {
    if (!expiresAt) return;
    setTime(calcTime(expiresAt));
    const t = setInterval(() => setTime(calcTime(expiresAt)), 1000);
    return () => clearInterval(t);
  }, [expiresAt]);
  return time;
}

/* Individual coupon card */
function CouponCard({ c, L, lang }) {
  const [copied, setCopied] = cUseState(false);
  const time = useCountdown(c.expires_at);
  const store = window.FOCUZ_STORE_MAP?.[c.store] || { name: c.store, short: c.store };

  const copy = () => {
    navigator.clipboard?.writeText(c.code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isUrgent = time && !time.expired && time.d === 0 && time.h < 6;
  const isExpired = time?.expired;

  return (
    <div className={'coupon' + (isExpired ? ' coupon--expired' : '') + (isUrgent ? ' coupon--urgent' : '')}>
      {/* Store stripe */}
      <div className="coupon__stripe" data-store={c.store} />

      <div className="coupon__head">
        <_StoreLogo store={c.store} size={36} />
        <div className="coupon__storename">{store.name}</div>
        {c.discount && <span className="coupon__discount">{c.discount}</span>}
      </div>

      <div className="coupon__body">
        {c.category && (
          <div className="coupon__cat mono">{c.category}</div>
        )}
        <p className="coupon__desc">{c.description}</p>
        {c.min_value > 0 && (
          <div className="coupon__minval">Mín. {_fmtBRL(parseFloat(c.min_value))}</div>
        )}
      </div>

      {/* Countdown */}
      {time && !time.expired && (
        <div className={'coupon__timer' + (isUrgent ? ' coupon__timer--urgent' : '')}>
          <div className="coupon__timer-label">{isUrgent ? '⚡ Expirando em' : 'Válido por'}</div>
          <div className="coupon__timer-digits">
            {time.d > 0 && <span>{String(time.d).padStart(2,'0')}<em>d</em></span>}
            <span>{String(time.h).padStart(2,'0')}<em>h</em></span>
            <span>{String(time.m).padStart(2,'0')}<em>m</em></span>
            <span>{String(time.s).padStart(2,'0')}<em>s</em></span>
          </div>
        </div>
      )}
      {isExpired && <div className="coupon__expired-badge">Expirado</div>}

      {/* Code + CTA */}
      <div className="coupon__foot">
        <button className={'coupon__code' + (copied ? ' is-copied' : '')} onClick={copy}>
          <span className="coupon__code-text">{c.code}</span>
          <span className="coupon__copy-icon">{copied ? '✓' : '⎘'}</span>
        </button>
        {c.url && (
          <a className="btn btn--primary coupon__cta" href={c.url} target="_blank" rel="noopener noreferrer">
            Usar cupom
          </a>
        )}
      </div>
    </div>
  );
}

/* Main Coupons page */
function CouponsPage({ L, lang, go }) {
  const [coupons, setCoupons] = cUseState([]);
  const [loading, setCLoading] = cUseState(true);
  const [storeFilter, setStoreFilter] = cUseState('all');
  const [catFilter, setCatFilter] = cUseState('all');

  cUseEffect(() => {
    fetch('/api/coupons')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setCoupons(d); setCLoading(false); })
      .catch(() => setCLoading(false));
  }, []);

  const stores = ['all', ...new Set(coupons.map(c => c.store))];
  const cats = ['all', ...new Set(coupons.map(c => c.category).filter(Boolean))];

  const list = coupons.filter(c => {
    if (storeFilter !== 'all' && c.store !== storeFilter) return false;
    if (catFilter !== 'all' && c.category !== catFilter) return false;
    return true;
  });

  const storeMap = window.FOCUZ_STORE_MAP || {};

  return (
    <div className="coupons-page">
      <div className="coupons-page__hero">
        <div className="coupons-page__hero-inner">
          <div className="coupons-page__eyebrow mono">Economize mais</div>
          <h1 className="coupons-page__title">Cupons de desconto</h1>
          <p className="coupons-page__sub">Códigos exclusivos das melhores lojas. Copie e aplique na hora.</p>
        </div>
      </div>

      <div className="coupons-page__body">
        {/* Filtros por loja */}
        <div className="coupons-page__filters">
          {stores.map(s => {
            const st = storeMap[s];
            return (
              <button key={s} className={'coupon-filter' + (storeFilter === s ? ' is-active' : '')}
                onClick={() => setStoreFilter(s)}>
                {s === 'all' ? 'Todas as lojas' : (
                  <><_StoreLogo store={s} size={18} className="store-logo--bare" />{st?.short || s}</>
                )}
              </button>
            );
          })}
        </div>

        {/* Filtros por categoria */}
        {cats.length > 1 && (
          <div className="coupons-page__cats">
            {cats.map(c => (
              <button key={c} className={'coupon-catbtn' + (catFilter === c ? ' is-active' : '')}
                onClick={() => setCatFilter(c)}>
                {c === 'all' ? 'Todas' : c}
              </button>
            ))}
          </div>
        )}

        {loading && <div className="coupons-page__empty">Carregando cupons...</div>}
        {!loading && list.length === 0 && (
          <div className="coupons-page__empty">
            <div style={{fontSize:'48px',marginBottom:'12px'}}>🎟️</div>
            <p>Nenhum cupom disponível no momento.</p>
            <p style={{fontSize:'13px',opacity:.6,marginTop:'6px'}}>Volte em breve para novidades!</p>
          </div>
        )}

        <div className="coupons-grid">
          {list.map(c => <CouponCard key={c.id} c={c} L={L} lang={lang} />)}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { CouponsPage, CouponCard });
