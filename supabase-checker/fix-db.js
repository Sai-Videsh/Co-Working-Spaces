/**
 * supabase-checker/fix-db.js
 *
 * Reads migration.sql and applies it to the live Supabase DB
 * using the Supabase REST RPC endpoint.
 *
 * Run:  node fix-db.js
 *
 * NOTE: This requires a service_role key for DDL operations.
 *       The anon key cannot run ALTER TABLE / CREATE TABLE.
 *       Set SUPABASE_SERVICE_KEY in your .env (or use the SQL editor).
 */

'use strict';

const path = require('path');
const fs   = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.PROJECT_URL;
// Prefer service role key for DDL – fall back to anon key (DDL may fail)
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY || process.env.API_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌  Missing PROJECT_URL or SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

// ── colour helpers ────────────────────────────────────────────────────────────
const c = {
  red:   s => `\x1b[31m${s}\x1b[0m`,
  green: s => `\x1b[32m${s}\x1b[0m`,
  cyan:  s => `\x1b[36m${s}\x1b[0m`,
  bold:  s => `\x1b[1m${s}\x1b[0m`,
};

// ── Split migration SQL into individual statements ────────────────────────────
function splitStatements(sql) {
  // Remove single-line comments, then split on semicolons
  const cleaned = sql
    .split('\n')
    .filter(l => !l.trim().startsWith('--'))
    .join('\n');

  return cleaned
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && s !== 'SELECT \'Migration complete\' AS status');
}

async function applyStatement(stmt) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method:  'POST',
    headers: {
      'apikey':        SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({ query: stmt }),
  });

  if (!res.ok) {
    const body = await res.text();
    return { ok: false, error: body };
  }
  return { ok: true };
}

async function main() {
  console.log(c.bold('\n══════════════════════════════════════════════════'));
  console.log(c.bold('  APPLYING MIGRATION TO SUPABASE'));
  console.log(c.bold('══════════════════════════════════════════════════\n'));

  const sqlPath = path.join(__dirname, 'migration.sql');
  if (!fs.existsSync(sqlPath)) {
    console.error(c.red('migration.sql not found'));
    process.exit(1);
  }

  const sql        = fs.readFileSync(sqlPath, 'utf8');
  const statements = splitStatements(sql);

  console.log(`Found ${statements.length} statement(s) to apply.\n`);

  let passed = 0;
  let failed = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.replace(/\s+/g, ' ').slice(0, 80);
    process.stdout.write(`  [${i + 1}/${statements.length}] ${preview}…`);

    const { ok, error } = await applyStatement(stmt);
    if (ok) {
      console.log(c.green(' ✓'));
      passed++;
    } else {
      console.log(c.red(` ✗\n      Error: ${error}`));
      failed++;
    }
  }

  console.log(`\n${c.green(`✓ ${passed} succeeded`)}   ${failed > 0 ? c.red(`✗ ${failed} failed`) : ''}\n`);

  if (failed > 0) {
    console.log(c.cyan('Tip: exec_sql RPC may not be enabled by default.'));
    console.log(c.cyan('Copy migration.sql contents and run in Supabase SQL Editor instead.\n'));
  }
}

main().catch(err => {
  console.error(c.red('Fatal:'), err.message);
  process.exit(1);
});
