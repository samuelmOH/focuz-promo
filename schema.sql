-- ============================================================
--  FOCUZ — schema do banco de dados
--  Execute uma vez ao criar o banco no Railway
-- ============================================================

-- Tabela de administradores
CREATE TABLE IF NOT EXISTS admins (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de produtos
CREATE TABLE IF NOT EXISTS products (
  id         TEXT PRIMARY KEY,          -- ex: "u1717200000000"
  name_pt    TEXT NOT NULL,
  name_en    TEXT NOT NULL DEFAULT '',
  store      TEXT NOT NULL,             -- amazon | ml | shopee | magalu | ali
  category   TEXT NOT NULL DEFAULT 'tech',
  price      NUMERIC(10,2) NOT NULL,
  old_price  NUMERIC(10,2),
  rating     NUMERIC(3,1) DEFAULT 4.5,
  reviews    INTEGER DEFAULT 0,
  url        TEXT DEFAULT '',
  image_url  TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_products_store    ON products(store);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
