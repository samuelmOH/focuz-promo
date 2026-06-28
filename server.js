// ============================================================
//  PRORUJA — servidor backend (Express + PostgreSQL + JWT)
// ============================================================
require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const bcrypt   = require('bcrypt');
const jwt      = require('jsonwebtoken');
const { Pool } = require('pg');
const path     = require('path');
const crypto   = require('crypto');

const app  = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const JWT_SECRET = process.env.JWT_SECRET;
const PORT = process.env.PORT || 3000;

if (!JWT_SECRET) {
  console.error('❌ JWT_SECRET não definido no .env');
  process.exit(1);
}

// ── CORS ─────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,Cache-Control');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Auth ─────────────────────────────────────────────────────
function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Token ausente' });
  try { req.admin = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Token inválido ou expirado' }); }
}

// ── Login ─────────────────────────────────────────────────────
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email e senha obrigatórios' });
    const { rows } = await pool.query('SELECT * FROM admins WHERE email=$1', [email.trim().toLowerCase()]);
    if (!rows[0]) return res.status(401).json({ error: 'Credenciais inválidas' });
    const ok = await bcrypt.compare(password, rows[0].password_hash);
    if (!ok) return res.status(401).json({ error: 'Credenciais inválidas' });
    const token = jwt.sign({ id: rows[0].id, email: rows[0].email }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erro interno' }); }
});

app.get('/api/me', auth, (req, res) => res.json({ email: req.admin.email }));

// ── Products ──────────────────────────────────────────────────
app.get('/api/products', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM products ORDER BY created_at DESC');
    res.json(rows.map(dbToProduct));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/products', auth, async (req, res) => {
  try {
    const p = req.body;
    const id = 'u' + Date.now();
    await pool.query(
      `INSERT INTO products (id,name_pt,name_en,store,category,price,old_price,rating,reviews,url,image_url,description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [id, p.name, p.nameEn||p.name, p.store, p.category||'tech',
       p.price, p.oldPrice||null, p.rating||4.5, p.reviews||0,
       p.url||'', p.imageUrl||'', p.desc||p.description||'']
    );
    const { rows } = await pool.query('SELECT * FROM products WHERE id=$1', [id]);
    res.status(201).json(dbToProduct(rows[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/products/:id', auth, async (req, res) => {
  try {
    const p = req.body;
    const renewClause = p._renew ? ', created_at = NOW()' : '';
    await pool.query(
      `UPDATE products SET name_pt=$1,name_en=$2,store=$3,category=$4,
       price=$5,old_price=$6,rating=$7,reviews=$8,url=$9,image_url=$10,description=$11
       ${renewClause} WHERE id=$12`,
      [p.name, p.nameEn||p.name, p.store, p.category||'tech',
       p.price, p.oldPrice||null, p.rating||4.5, p.reviews||0,
       p.url||'', p.imageUrl||'', p.desc||p.description||'', req.params.id]
    );
    const { rows } = await pool.query('SELECT * FROM products WHERE id=$1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Não encontrado' });
    res.json(dbToProduct(rows[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/products/expired', auth, async (req, res) => {
  try {
    const r = await pool.query("DELETE FROM products WHERE created_at < NOW() - INTERVAL '48 hours' RETURNING id");
    res.json({ deleted: r.rowCount });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/products/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM products WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Analytics ─────────────────────────────────────────────────
app.post('/api/analytics', async (req, res) => {
  try {
    const { event, product_id, store, url } = req.body;
    await pool.query('INSERT INTO analytics (event,product_id,store,url) VALUES ($1,$2,$3,$4)',
      [event, product_id||null, store||null, url||null]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/analytics/summary', auth, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const [pv, cl, byStore, byProd, daily] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM analytics WHERE event='pageview'"),
      pool.query("SELECT COUNT(*) FROM analytics WHERE event='click'"),
      pool.query("SELECT store, COUNT(*) as clicks FROM analytics WHERE event='click' AND store IS NOT NULL GROUP BY store ORDER BY clicks DESC"),
      pool.query(`SELECT a.product_id, p.name_pt as name, p.store, p.image_url, COUNT(*) as clicks
        FROM analytics a LEFT JOIN products p ON p.id=a.product_id
        WHERE a.event='click' AND a.product_id IS NOT NULL
        GROUP BY a.product_id,p.name_pt,p.store,p.image_url ORDER BY clicks DESC LIMIT 10`),
      pool.query(`SELECT DATE_TRUNC('day',created_at) as day, event, COUNT(*) as count
        FROM analytics WHERE created_at > NOW() - INTERVAL '7 days'
        GROUP BY day,event ORDER BY day ASC`)
    ]);
    res.json({ pageviews: parseInt(pv.rows[0].count), clicks: parseInt(cl.rows[0].count),
      byStore: byStore.rows, byProduct: byProd.rows, daily: daily.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Coupons ───────────────────────────────────────────────────
app.get('/api/coupons', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM coupons WHERE active=true ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/coupons/all', auth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM coupons ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/coupons', auth, async (req, res) => {
  try {
    const c = req.body;
    const id = 'cpn_' + Date.now();
    const { rows } = await pool.query(
      `INSERT INTO coupons (id,store,code,description,discount,min_value,expires_at,url,active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [id, c.store, c.code, c.description||'', c.discount||'',
       c.minValue||null, c.expiresAt||null, c.url||'', c.active !== false]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/coupons/:id', auth, async (req, res) => {
  try {
    const c = req.body;
    const { rows } = await pool.query(
      `UPDATE coupons SET store=$1,code=$2,description=$3,discount=$4,
       min_value=$5,expires_at=$6,url=$7,active=$8 WHERE id=$9 RETURNING *`,
      [c.store, c.code, c.description||'', c.discount||'',
       c.minValue||null, c.expiresAt||null, c.url||'', c.active !== false, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/coupons/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM coupons WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── SPA fallback ──────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Helpers ───────────────────────────────────────────────────
function dbToProduct(row) {
  return {
    id: row.id, name: row.name_pt, nameEn: row.name_en,
    store: row.store, category: row.category,
    price: parseFloat(row.price),
    oldPrice: row.old_price ? parseFloat(row.old_price) : null,
    rating: parseFloat(row.rating), reviews: row.reviews,
    url: row.url, imageUrl: row.image_url, image: row.image_url,
    desc: row.description||'', description: row.description||'',
    createdAt: row.created_at,
  };
}

// ── Start — único app.listen ──────────────────────────────────
app.listen(PORT, async () => {
  console.log(`✅ Proruja backend na porta ${PORT}`);
  // Criar tabelas extras
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS analytics (
      id SERIAL PRIMARY KEY, event VARCHAR(50) NOT NULL,
      product_id VARCHAR(100), store VARCHAR(50), url TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW())`);
    await pool.query(`CREATE TABLE IF NOT EXISTS coupons (
      id VARCHAR(100) PRIMARY KEY, store VARCHAR(50) NOT NULL,
      code VARCHAR(100) NOT NULL, description TEXT, discount VARCHAR(50),
      min_value NUMERIC(10,2), expires_at TIMESTAMPTZ, url TEXT,
      active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT NOW())`);
  } catch (e) { console.error('Init tables:', e.message); }
  // Limpeza 48h
  const clean = async () => {
    try {
      const r = await pool.query("DELETE FROM products WHERE created_at < NOW() - INTERVAL '48 hours' RETURNING id");
      if (r.rowCount > 0) console.log(`🗑️ ${r.rowCount} expirados removidos`);
    } catch (e) { console.error('Limpeza:', e.message); }
  };
  clean();
  setInterval(clean, 60 * 60 * 1000);
});
