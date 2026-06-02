// ============================================================
//  FOCUZ — Bot do Mercado Livre
//  Usa API pública MLB para buscar produtos com desconto real
// ============================================================

// Mapeamento categorias MLB → categorias do Focuz
const CATEGORIES = [
  { mlId: 'MLB1051', focuz: 'smartphones',  label: 'Celulares'        },
  { mlId: 'MLB1648', focuz: 'computing',    label: 'Informática'      },
  { mlId: 'MLB1144', focuz: 'tech',         label: 'Eletrônicos'      },
  { mlId: 'MLB1574', focuz: 'appliances',   label: 'Eletrodomésticos' },
  { mlId: 'MLB1499', focuz: 'home',         label: 'Casa'             },
  { mlId: 'MLB1403', focuz: 'fashion',      label: 'Moda'             },
  { mlId: 'MLB1168', focuz: 'games',        label: 'Games'            },
  { mlId: 'MLB1276', focuz: 'tools',        label: 'Ferramentas'      },
  { mlId: 'MLB1953', focuz: 'automation',   label: 'Automação'        },
];

const MIN_DISCOUNT    = 10;   // % mínimo de desconto
const MAX_PER_CAT     = 5;    // produtos por categoria
const ML_APP_ID       = process.env.ML_APP_ID;

function calcDiscount(price, originalPrice) {
  if (!originalPrice || originalPrice <= price) return 0;
  return Math.round(((originalPrice - price) / originalPrice) * 100);
}

function buildAffiliateUrl(permalink) {
  try {
    const url = new URL(permalink);
    url.searchParams.set('matt_tool', 'mesa1574843'); // ID de afiliado Focuz
    url.searchParams.set('utm_source', 'focuz');
    url.searchParams.set('utm_medium', 'affiliate');
    return url.toString();
  } catch { return permalink; }
}

async function fetchCategory(mlId) {
  // Busca produtos com desconto usando filtro has_discount
  const url = `https://api.mercadolibre.com/sites/MLB/search?category=${mlId}&sort=best_match&limit=50&has_discount=true`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Focuz-Bot/1.0' }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

async function runBot(pool) {
  console.log('🤖 Bot ML iniciado:', new Date().toISOString());
  let totalAdded = 0;
  let totalSkipped = 0;

  for (const cat of CATEGORIES) {
    try {
      console.log(`  📦 ${cat.label} (${cat.mlId})...`);
      const data = await fetchCategory(cat.mlId);
      const items = (data.results || []).filter(i =>
        i.original_price && i.original_price > i.price
      );

      console.log(`     ${items.length} itens com desconto encontrados`);
      let addedInCat = 0;

      for (const item of items) {
        if (addedInCat >= MAX_PER_CAT) break;

        const discount = calcDiscount(item.price, item.original_price);
        if (discount < MIN_DISCOUNT) { totalSkipped++; continue; }

        // Verifica se já existe
        const exists = await pool.query('SELECT id FROM products WHERE id=$1', [String(item.id)]);
        if (exists.rows.length > 0) { totalSkipped++; continue; }

        const thumbnail = (item.thumbnail || '').replace('http:', 'https:').replace(/\W50\W/, '/W400/');
        const affiliateUrl = buildAffiliateUrl(item.permalink);

        await pool.query(
          `INSERT INTO products (id, name_pt, name_en, store, category, price, old_price, rating, reviews, url, image_url)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
           ON CONFLICT (id) DO NOTHING`,
          [
            String(item.id),
            item.title,
            item.title,
            'ml',
            cat.focuz,
            item.price,
            item.original_price,
            Math.min(item.seller?.seller_reputation?.transactions?.ratings?.positive * 5 || 4.5, 5.0),
            item.sold_quantity || 0,
            affiliateUrl,
            thumbnail,
          ]
        );

        addedInCat++;
        totalAdded++;
        console.log(`    ✅ [${discount}% off] ${item.title.slice(0, 55)}`);
      }

      // Pequena pausa para não sobrecarregar a API
      await new Promise(r => setTimeout(r, 500));

    } catch (err) {
      console.error(`  ❌ Erro em ${cat.label}:`, err.message);
    }
  }

  console.log(`🏁 Finalizado: ${totalAdded} adicionados, ${totalSkipped} ignorados`);
  return { totalAdded, totalSkipped };
}

module.exports = { runBot };
