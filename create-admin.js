// ============================================================
//  FOCUZ — cria o primeiro administrador no banco
//  Uso: node create-admin.js
// ============================================================
require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const readline = require('readline');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));

async function main() {
  console.log('\n🔐 Criar administrador do Focuz\n');
  const email = await ask('Email: ');
  const pass  = await ask('Senha (mín. 8 caracteres): ');

  if (pass.length < 8) {
    console.error('❌ Senha muito curta.');
    process.exit(1);
  }

  const hash = await bcrypt.hash(pass, 12);

  await pool.query(
    'INSERT INTO admins (email, password_hash) VALUES ($1, $2) ON CONFLICT (email) DO UPDATE SET password_hash = $2',
    [email.trim().toLowerCase(), hash]
  );

  console.log(`\n✅ Admin "${email}" criado/atualizado com sucesso!\n`);
  await pool.end();
  rl.close();
}

main().catch((err) => { console.error(err); process.exit(1); });
