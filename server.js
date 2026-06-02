// ============================================================
//  FOCUZ — servidor backend (Express + PostgreSQL + JWT)
// ============================================================
require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const bcrypt   = require('bcrypt');
const jwt      = require('jsonwebtoken');
const { Pool } = require('pg');
const path     = require('path');

const app  = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const JWT_SECRET = process.env.JWT_SECRET;
const PORT = process.env.PORT || 3000;

if (!JWT_SECRET) {
  console.error('❌ JWT_SECRET não definido no .env');
  process.exit(1);
}

// ── Middlewares ──────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Serve os arquivos estáticos do frontend (pasta public/)
app.use(express.static(path.join(__dirname, 'public')));

// ── Middleware de autenticação JWT ───────────────────────────
function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Token ausente' });
  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

// ── Rotas de autenticação ────────────────────────────────────

// POST /api/login — retorna JWT
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email e senha obrigatórios' });

    const result = await pool.query('SELECT * FROM admins WHERE email = $1', [email.trim().toLowerCase()]);
    const admin  = result.rows[0];

    if (!admin) return res.status(401).json({ error: 'Credenciais inválidas' });

    const ok = await bcrypt.compare(password, admin.password_hash);
    if (!ok) return res.status(401).json({ error: 'Credenciais inválidas' });

    const token = jwt.sign({ id: admin.id, email: admin.email }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/me — verifica token (usado pelo frontend ao recarregar)
app.get('/api/me', auth, (req, res) => {
  res.json({ email: req.admin.email });
});

// ── Rotas de produtos ────────────────────────────────────────

// GET /api/products — lista todos (público)
app.get('/api/products', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM products ORDER BY created_at DESC');
    res.json(rows.map(dbToProduct));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar produtos' });
  }
});

// POST /api/products — cria produto (requer auth)
app.post('/api/products', auth, async (req, res) => {
  try {
    const p = req.body;
    const id = 'u' + Date.now();
    await pool.query(
      `INSERT INTO products (id, name_pt, name_en, store, category, price, old_price, rating, reviews, url, image_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [id, p.name, p.nameEn || p.name, p.store, p.category || 'tech',
       p.price, p.oldPrice || null, p.rating || 4.5, p.reviews || 0, p.url || '', p.imageUrl || '']
    );
    const { rows } = await pool.query('SELECT * FROM products WHERE id=$1', [id]);
    res.status(201).json(dbToProduct(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar produto' });
  }
});

// PUT /api/products/:id — atualiza produto (requer auth)
app.put('/api/products/:id', auth, async (req, res) => {
  try {
    const p = req.body;
    await pool.query(
      `UPDATE products SET name_pt=$1, name_en=$2, store=$3, category=$4,
       price=$5, old_price=$6, rating=$7, reviews=$8, url=$9, image_url=$10
       WHERE id=$11`,
      [p.name, p.nameEn || p.name, p.store, p.category || 'tech',
       p.price, p.oldPrice || null, p.rating || 4.5, p.reviews || 0,
       p.url || '', p.imageUrl || '', req.params.id]
    );
    const { rows } = await pool.query('SELECT * FROM products WHERE id=$1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Produto não encontrado' });
    res.json(dbToProduct(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar produto' });
  }
});

// DELETE /api/products/:id — deleta produto (requer auth)
app.delete('/api/products/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM products WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao deletar produto' });
  }
});

// ── Bot do Mercado Livre ─────────────────────────────────────
const { runBot } = require('./ml-bot');

// PKCE helpers
const crypto = require('crypto');
const pkceStore = {}; // guarda code_verifier por sessão

function generateCodeVerifier() {
  return crypto.randomBytes(32).toString('base64url');
}
function generateCodeChallenge(verifier) {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

// OAuth Step 1 — redireciona para o ML com PKCE
app.get('/api/ml/auth', (req, res) => {
  const verifier   = generateCodeVerifier();
  const challenge  = generateCodeChallenge(verifier);
  const sessionId  = crypto.randomBytes(8).toString('hex');
  pkceStore[sessionId] = verifier;

  const params = new URLSearchParams({
    response_type:         'code',
    client_id:             process.env.ML_APP_ID,
    redirect_uri:          process.env.ML_REDIRECT_URI,
    code_challenge:        challenge,
    code_challenge_method: 'S256',
    state:                 sessionId,
  });

  res.redirect(`https://auth.mercadolivre.com.br/authorization?${params}`);
});

// OAuth Step 2 — ML redireciona de volta com o código
app.get('/api/ml/callback', async (req, res) => {
  const { code, state } = req.query;
  if (!code) return res.status(400).send('Código ausente');

  const verifier = pkceStore[state];
  if (!verifier) return res.status(400).send('Sessão OAuth expirada. Tente novamente em /api/ml/auth');
  delete pkceStore[state];

  try {
    const response = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:     'authorization_code',
        client_id:      process.env.ML_APP_ID,
        client_secret:  process.env.ML_SECRET_KEY,
        code,
        redirect_uri:   process.env.ML_REDIRECT_URI,
        code_verifier:  verifier,
      }),
    });
    const data = await response.json();
    if (data.access_token) {
      process.env.ML_ACCESS_TOKEN = data.access_token;
      console.log('✅ ML OAuth OK. Token salvo.');
      res.send(`
        <html><body style="font-family:sans-serif;text-align:center;padding:3rem">
          <h2>✅ Mercado Livre conectado!</h2>
          <p>Pode fechar esta aba e voltar ao painel admin.</p>
        </body></html>
      `);
    } else {
      console.error('ML OAuth erro:', data);
      res.status(400).send(`<pre>Erro ML: ${JSON.stringify(data, null, 2)}</pre>`);
    }
  } catch (err) {
    res.status(500).send('Erro no OAuth: ' + err.message);
  }
});

// Rota manual — admin dispara o bot na hora
app.post('/api/ml/run-bot', auth, async (req, res) => {
  try {
    const result = await runBot(pool);
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Cron diário — roda todo dia às 8h (UTC-3 = 11h UTC)
function startCron() {
  const INTERVAL_MS = 24 * 60 * 60 * 1000; // 24h
  const now = new Date();
  const next = new Date();
  next.setUTCHours(11, 0, 0, 0);
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  const delay = next - now;
  console.log(`⏰ Bot agendado para ${next.toISOString()} (em ${Math.round(delay/60000)} min)`);
  setTimeout(() => {
    runBot(pool).catch(console.error);
    setInterval(() => runBot(pool).catch(console.error), INTERVAL_MS);
  }, delay);
}
startCron();

// ── Fallback SPA ─────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Helpers ──────────────────────────────────────────────────
function dbToProduct(row) {
  return {
    id:       row.id,
    name:     row.name_pt,
    nameEn:   row.name_en,
    store:    row.store,
    category: row.category,
    price:    parseFloat(row.price),
    oldPrice: row.old_price ? parseFloat(row.old_price) : null,
    rating:   parseFloat(row.rating),
    reviews:  row.reviews,
    url:      row.url,
    imageUrl: row.image_url,
  };
}

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => console.log(`✅ Focuz backend rodando na porta ${PORT}`));
