/**
 * supabase-checker/apply-migration.js
 *
 * Applies migration.sql to Supabase using the pg connection string
 * via individual REST calls to the Supabase Management API.
 *
 * Since the anon key can't run DDL, this script uses the Supabase
 * Management API (if provided) or prints instructions to apply manually.
 *
 * Run:  node apply-migration.js
 */

'use strict';

const path = require('path');
const fs   = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.PROJECT_URL;
const ANON_KEY    = process.env.API_KEY;

// Extract project ref from URL (e.g., chjyfnvwvpbhtlydtcgf)
const projectRef = SUPABASE_URL?.replace('https://', '').split('.')[0];

const c = {
  red:   s => `\x1b[31m${s}\x1b[0m`,
  green: s => `\x1b[32m${s}\x1b[0m`,
  yellow: s => `\x1b[33m${s}\x1b[0m`,
  cyan:  s => `\x1b[36m${s}\x1b[0m`,
  bold:  s => `\x1b[1m${s}\x1b[0m`,
  dim:   s => `\x1b[2m${s}\x1b[0m`,
};

async function runViaRpc(sql) {
  // Try using supabase rpc if exec_sql function exists
  const supabase = createClient(SUPABASE_URL, ANON_KEY);
  const { data, error } = await supabase.rpc('exec_sql', { query: sql });
  return { data, error };
}

async function tryDirectInsert() {
  // Try a simple table-based approach as an alternative
  const supabase = createClient(SUPABASE_URL, ANON_KEY);

  // Test connection
  const { data, error } = await supabase.from('working_hubs').select('id').limit(1);
  if (error) {
    console.log(c.red('Cannot connect to Supabase: ' + error.message));
    return false;
  }
  console.log(c.green('Connection OK'));
  return true;
}

async function main() {
  console.log(c.bold('\n=== APPLYING MIGRATION TO SUPABASE ===\n'));

  const sqlPath = path.join(__dirname, 'migration.sql');
  const sql     = fs.readFileSync(sqlPath, 'utf8');

  // Test connection first
  const connected = await tryDirectInsert();
  if (!connected) process.exit(1);

  // Try RPC exec_sql
  console.log('\nAttempting to apply via RPC exec_sql...');
  const { data, error } = await runViaRpc(sql);

  if (error) {
    console.log(c.yellow('\n⚠  exec_sql RPC not available (this is normal for anon key).'));
    console.log(c.cyan('\nTo apply the migration manually:'));
    console.log(c.cyan(`  1. Go to: https://app.supabase.com/project/${projectRef}/sql/new`));
    console.log(c.cyan('  2. Paste the contents of supabase-checker/migration.sql'));
    console.log(c.cyan('  3. Click "Run"\n'));
    console.log(c.dim('SQL file location: ' + sqlPath));
    console.log('\n' + c.bold('Migration SQL contents:'));
    console.log(c.dim('─'.repeat(60)));
    console.log(sql);
    console.log(c.dim('─'.repeat(60)));
  } else {
    console.log(c.green('\n✓ Migration applied successfully via RPC!\n'));
  }
}

main().catch(err => {
  console.error(c.red('Fatal:'), err.message);
  process.exit(1);
});
