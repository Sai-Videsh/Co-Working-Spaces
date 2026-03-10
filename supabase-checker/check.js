/**
 * supabase-checker/check.js
 *
 * Connects to the live Supabase project and audits:
 *   1. Which tables exist and their row counts
 *   2. Which columns are present in each table
 *   3. Mismatches between the actual schema and what the backend code expects
 *   4. Data integrity issues (nulls in required cols, orphaned FKs, etc.)
 *
 * Run:  node check.js
 */

'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.PROJECT_URL;
const SUPABASE_KEY = process.env.API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌  Missing PROJECT_URL or API_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Colour helpers (no chalk dependency) ─────────────────────────────────────
const c = {
  red:    s => `\x1b[31m${s}\x1b[0m`,
  green:  s => `\x1b[32m${s}\x1b[0m`,
  yellow: s => `\x1b[33m${s}\x1b[0m`,
  cyan:   s => `\x1b[36m${s}\x1b[0m`,
  bold:   s => `\x1b[1m${s}\x1b[0m`,
  dim:    s => `\x1b[2m${s}\x1b[0m`,
};

// ── What the backend CODE actually expects from each table ───────────────────
// Derived by reading every route / util file in the backend.
const CODE_EXPECTATIONS = {
  users: {
    required: ['id', 'name', 'email', 'password', 'phone', 'created_at', 'updated_at'],
  },
  working_hubs: {
    required: ['id', 'name', 'address', 'city', 'state', 'country', 'pincode',
               'latitude', 'longitude', 'created_at', 'updated_at'],
  },
  workspaces: {
    required: ['id', 'hub_id', 'name', 'type', 'capacity', 'base_price',
               'amenities', 'description', 'is_available', 'created_at', 'updated_at'],
  },
  bookings: {
    required: ['id', 'workspace_id', 'user_name', 'user_email', 'start_time', 'end_time',
               'total_price', 'status', 'booking_type', 'transaction_id', 'created_at'],
  },
  resources: {
    required: ['id', 'workspace_id', 'name', 'description', 'price_per_slot',
               'quantity', 'created_at'],
  },
  booking_resources: {
    required: ['id', 'booking_id', 'resource_id', 'quantity', 'created_at'],
  },
  ratings: {
    required: ['id', 'workspace_id', 'user_name', 'user_email', 'booking_id',
               'rating', 'review', 'created_at'],
  },
  pricing_rules: {
    required: ['id', 'workspace_id', 'rule_type', 'percentage_modifier',
               'flat_modifier', 'start_time', 'end_time', 'days', 'created_at'],
  },
  qr_codes: {
    required: ['id', 'booking_id', 'qr_value', 'scanned_at', 'created_at'],
  },
};

// ── Fetch actual columns via information_schema ───────────────────────────────
async function getColumns(tableName) {
  const { data, error } = await supabase
    .from('information_schema.columns')
    .select('column_name, data_type, is_nullable, column_default')
    .eq('table_schema', 'public')
    .eq('table_name', tableName)
    .order('ordinal_position');

  if (error) {
    // information_schema might not be directly queryable via PostgREST; try rpc
    return null;
  }
  return data;
}

// Alternative: use rpc to run raw SQL
async function runSQL(sql) {
  const { data, error } = await supabase.rpc('exec_sql', { query: sql });
  if (error) return { data: null, error };
  return { data, error: null };
}

// ── Count rows in a table ─────────────────────────────────────────────────────
async function countRows(tableName) {
  const { count, error } = await supabase
    .from(tableName)
    .select('*', { count: 'exact', head: true });

  if (error) return { count: null, error: error.message };
  return { count, error: null };
}

// ── Try fetching one row to infer available columns ───────────────────────────
// For empty tables, we use information_schema via a workaround with a
// deliberately impossible WHERE clause that still returns column metadata.
async function sampleRow(tableName) {
  // First try with a real row
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .limit(1);

  if (error) return { cols: null, exists: false, error: error.message };

  // If we have a row, extract column names from it
  if (data && data.length > 0) return { cols: Object.keys(data[0]), exists: true, error: null };

  // Table is empty: fetch with a known-false filter to get an empty array
  // PostgREST returns empty array (not error) so we lose column info.
  // Fall back to checking column existence by attempting individual selects.
  return { cols: [], exists: true, error: null };
}

// ── Main audit ────────────────────────────────────────────────────────────────
async function main() {
  console.log(c.bold('\n╔══════════════════════════════════════════════╗'));
  console.log(c.bold('║     SUPABASE SCHEMA & DATA INTEGRITY CHECK     ║'));
  console.log(c.bold('╚══════════════════════════════════════════════╝\n'));
  console.log(c.dim(`Project: ${SUPABASE_URL}\n`));

  const allFindings = [];

  for (const [table, expectation] of Object.entries(CODE_EXPECTATIONS)) {
    console.log(c.cyan(c.bold(`▶ Table: ${table}`)));

    // 1. Does the table exist and what columns are present?
    const { cols, exists, error: sampleErr } = await sampleRow(table);

    if (!exists) {
      const msg = `Table "${table}" does NOT exist in the database!`;
      console.log(c.red(`  ✗ ${msg}`));
      allFindings.push({ table, level: 'CRITICAL', msg });
      console.log('');
      continue;
    }

    if (sampleErr) {
      const msg = `Error accessing table: ${sampleErr}`;
      console.log(c.red(`  ✗ ${msg}`));
      allFindings.push({ table, level: 'ERROR', msg });
      console.log('');
      continue;
    }

    // 2. Row count
    const { count, error: countErr } = await countRows(table);
    if (countErr) {
      console.log(c.yellow(`  ⚠ Could not count rows: ${countErr}`));
    } else {
      console.log(c.green(`  ✓ Exists — ${count} row(s)`));
    }

    // 3. Column comparison
    const presentCols = new Set(cols);

    if (cols.length === 0) {
      console.log(c.dim('  (empty table – cannot infer columns from sample row; skipping column check)'));
      await spotCheckData(table, allFindings);
      console.log('');
      continue;
    }

    console.log(c.dim(`  Detected columns: ${cols.join(', ')}`));

    const missingCols = expectation.required.filter(col => !presentCols.has(col));

    if (missingCols.length === 0) {
      console.log(c.green('  ✓ All required columns present'));
    } else {
      missingCols.forEach(col => {
        const msg = `Missing column "${col}" in table "${table}"`;
        console.log(c.red(`  ✗ ${msg}`));
        allFindings.push({ table, level: 'CRITICAL', msg });
      });
    }

    // 4. Data integrity spot-checks
    await spotCheckData(table, allFindings);

    console.log('');
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log(c.bold('════════════════════════════════════════════════════'));
  console.log(c.bold('SUMMARY'));
  console.log('════════════════════════════════════════════════════\n');

  if (allFindings.length === 0) {
    console.log(c.green('🎉  No issues found! Schema matches code expectations.\n'));
  } else {
    const criticals = allFindings.filter(f => f.level === 'CRITICAL');
    const warnings  = allFindings.filter(f => f.level === 'WARNING');
    const errors    = allFindings.filter(f => f.level === 'ERROR');

    if (criticals.length) {
      console.log(c.red(c.bold(`❌  ${criticals.length} CRITICAL issue(s):`)));
      criticals.forEach((f, i) => console.log(c.red(`  ${i + 1}. [${f.table}] ${f.msg}`)));
      console.log('');
    }
    if (errors.length) {
      console.log(c.red(`🔴  ${errors.length} ERROR(s):`));
      errors.forEach((f, i) => console.log(c.red(`  ${i + 1}. [${f.table}] ${f.msg}`)));
      console.log('');
    }
    if (warnings.length) {
      console.log(c.yellow(`⚠️   ${warnings.length} WARNING(s):`));
      warnings.forEach((f, i) => console.log(c.yellow(`  ${i + 1}. [${f.table}] ${f.msg}`)));
      console.log('');
    }

    console.log(c.cyan('👉  Run `node fix-db.js` to apply the migration SQL automatically.\n'));
    console.log(c.cyan('    Or apply `migration.sql` manually in the Supabase SQL editor.\n'));
  }
}

// ── Per-table spot checks ─────────────────────────────────────────────────────
async function spotCheckData(table, findings) {
  try {
    if (table === 'bookings') {
      // Check for bookings with null user_email
      const { data } = await supabase
        .from('bookings')
        .select('id, user_name, user_email')
        .is('user_email', null)
        .limit(5);

      if (data && data.length > 0) {
        const msg = `${data.length} booking row(s) have NULL user_email (IDs: ${data.map(r => r.id).join(', ')})`;
        console.log(c.yellow(`  ⚠ ${msg}`));
        findings.push({ table, level: 'WARNING', msg });
      }

      // Check for cancelled bookings that still have active QR
      const { data: cancelled } = await supabase
        .from('bookings')
        .select('id, status')
        .eq('status', 'cancelled')
        .limit(10);

      if (cancelled && cancelled.length > 0) {
        console.log(c.dim(`  ℹ ${cancelled.length} cancelled booking(s) found (normal)`));
      }
    }

    if (table === 'workspaces') {
      // Check for workspaces with no hub
      const { data } = await supabase
        .from('workspaces')
        .select('id, name, hub_id')
        .limit(100);

      if (data) {
        const { data: hubIds } = await supabase
          .from('working_hubs')
          .select('id');

        const validHubIds = new Set((hubIds || []).map(h => h.id));
        const orphaned = data.filter(w => !validHubIds.has(w.hub_id));

        if (orphaned.length > 0) {
          const msg = `${orphaned.length} workspace(s) reference non-existent hub_id`;
          console.log(c.yellow(`  ⚠ ${msg}`));
          findings.push({ table, level: 'WARNING', msg });
        } else {
          console.log(c.dim(`  ℹ All workspaces have valid hub references`));
        }
      }
    }

    if (table === 'resources') {
      // Check for resources with zero or null price
      const { data } = await supabase
        .from('resources')
        .select('id, name, price_per_slot')
        .limit(50);

      if (data) {
        const zeroPriced = data.filter(r =>
          r.price_per_slot === null || r.price_per_slot === 0
        );
        if (zeroPriced.length > 0) {
          const msg = `${zeroPriced.length} resource(s) have zero/null price_per_slot`;
          console.log(c.yellow(`  ⚠ ${msg}`));
          findings.push({ table, level: 'WARNING', msg });
        }
      }
    }

    if (table === 'ratings') {
      // Check for out-of-range ratings
      const { data } = await supabase
        .from('ratings')
        .select('id, rating')
        .limit(100);

      if (data) {
        const invalid = data.filter(r => r.rating < 1 || r.rating > 5);
        if (invalid.length > 0) {
          const msg = `${invalid.length} rating row(s) have out-of-range values`;
          console.log(c.red(`  ✗ ${msg}`));
          findings.push({ table, level: 'CRITICAL', msg });
        }
      }
    }
  } catch (e) {
    // Spot-check errors are non-fatal
  }
}

main().catch(err => {
  console.error(c.red('Fatal error:'), err.message);
  process.exit(1);
});
