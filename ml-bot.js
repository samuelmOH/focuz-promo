// ============================================================
//  FOCUZ — Bot do Mercado Livre
//  Busca promoções via API oficial e salva no PostgreSQL
// ============================================================
const { Pool } = require('pg');

const ML_APP_ID     = process.env.ML_APP_ID;
const ML_SECRET_KEY = process.env.ML_SECRET_KEY;
const ML_ACCESS_TOKEN = process.env.ML_ACCESS_TOKEN; // preenchido após OAuth

// Mapeamento de categorias ML → categorias do Focuz
const CATEGORY_MAP = {
  'MLA1051': 'smartphones',   // Celulares e Smartphones
  'MLA1648': 'computing',     // Computação
  'MLA1144': 'tech',          // Eletrônicos
  'MLA1000': 'tech',          // Eletrônicos e Tecnologia
  'MLA1574': 'appliances',    // Eletrodomésticos
  'MLA1499': 'home',          // Casa e Jardim
  'MLA1403': 'fashion',       // Moda e Acessórios
  'MLA1168': 'games',         // Games e Consoles
  'MLA1276': 'tools',         // Ferramentas
  'MLA3697': 'office',        // Escritório e Papelaria
  'MLA1953': 'automation',    // Automação e Segurança
};

// Categorias que o bot vai varrer
const TARGET_CATEGORIES = Object.keys(CATEGORY_MAP);

// Desconto mínimo para considerar promoção (%)
const MIN_DISCOUNT = 15;

// Máximo de produtos por categoria por rodada
const MAX_PER_CATEGORY = 5;

async function getAccessToken() {
  // Se já tem token salvo nas env, usa ele
  if (ML_ACCESS_TOKEN) return ML_ACCESS_TOKEN;
  throw new Error('ML_ACCESS_TOKEN não configurado. Faça o OAuth primeiro em /api/ml/auth');
}

async function fetchPromotions(categoryId, accessToken) {
  const url = `https://api.mercadolibre.com/sites/MLB/search?category=${categoryId}&sort=price_asc&limit=50&promotions=true`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`ML API error: ${res.status}`);
  return res.json();
}

function calcDiscount(price, originalPrice) {
  if (!originalPrice || originalPrice <= price) return 0;
  return Math.round(((originalPrice - price) / originalPrice) * 100);
}

function mlToFocuzCategory(mlCategoryId) {
  return CATEGORY_MAP[mlCategoryId] || 'tech';
}

function buildAffiliateUrl(permalink) {
  // Adiciona tracking de afiliado
  return `${permalink}?matt_tool=${ML_APP_ID}&utm_source=focuz&utm_medium=affiliate`;
}

async function runBot(pool) {
  console.log('🤖 Bot ML iniciado:', new Date().toISOString());
  const accessToken = await getAccessToken();
  let totalAdded = 0;
  let totalSkipped = 0;

  for (const categoryId of TARGET_CATEGORIES) {
    try {
      console.log(`  📦 Buscando categoria ${categoryId}...`);
      const data = await fetchPromotions(categoryId, accessToken);
      const items = data.results || [];

      let addedInCategory = 0;

      for (const item of items) {
        if (addedInCategory >= MAX_PER_CATEGORY) break;

        const price = item.price;
        const originalPrice = item.original_price;
        const discount = calcDiscount(price, originalPrice);

        // Filtra por desconto mínimo
        if (discount < MIN_DISCOUNT) { totalSkipped++; continue; }

        // Verifica se produto já existe
        const exists = await pool.query('SELECT id FROM products WHERE id=$1', [String(item.id)]);
        if (exists.rows.length > 0) { totalSkipped++; continue; }

        const focuzCategory = mlToFocuzCategory(item.category_id);
        const affiliateUrl  = buildAffiliateUrl(item.permalink);
        const imageUrl      = item.thumbnail?.replace('http:', 'https:') || '';
        const rating        = item.seller_reputation?.transactions?.ratings?.positive
          ? parseFloat((item.seller_reputation.transactions.ratings.positive * 5).toFixed(1))
          : 4.5;
        const reviews = item.sold_quantity || 0;

        await pool.query(
          `INSERT INTO products (id, name_pt, name_en, store, category, price, old_price, rating, reviews, url, image_url)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
           ON CONFLICT (id) DO NOTHING`,
          [
            String(item.id),
            item.title,
            item.title,
            'ml',
            focuzCategory,
            price,
            originalPrice || null,
            Math.min(rating, 5.0),
            reviews,
            affiliateUrl,
            imageUrl,
          ]
        );

        addedInCategory++;
        totalAdded++;
        console.log(`    ✅ ${item.title.slice(0, 50)} — ${discount}% off`);
      }
    } catch (err) {
      console.error(`  ❌ Erro na categoria ${categoryId}:`, err.message);
    }
  }

  console.log(`🏁 Bot finalizado: ${totalAdded} adicionados, ${totalSkipped} ignorados`);
  return { totalAdded, totalSkipped };
}

module.exports = { runBot };
