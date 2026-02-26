#!/usr/bin/env node
import readline from 'readline';
import dotenv from 'dotenv';
import path from 'path';

// Load backend/.env explicitly so DB credentials are available
dotenv.config({ path: path.resolve(process.cwd(), 'backend', '.env') });

// DB helpers are imported dynamically inside main() after dotenv has loaded

const DB_NAME = process.env.DB_NAME || null;

if (!DB_NAME) {
  console.error('Database name not found in environment (DB_NAME). Aborting.');
  process.exit(1);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function main() {
  try {
    const mode = process.argv.includes('--truncate') ? 'truncate' : 'safe';
    const listOnly = process.argv.includes('--list');
    const dryRun = process.argv.includes('--dry-run');

    // parse --tables=tbl1,tbl2 or --tables tbl1,tbl2
    let tablesArg = null;
    const tablesFlagIndex = process.argv.findIndex(a => a === '--tables');
    const tablesEq = process.argv.find(a => a.startsWith('--tables='));
    if (tablesFlagIndex >= 0 && process.argv[tablesFlagIndex + 1]) tablesArg = process.argv[tablesFlagIndex + 1];
    else if (tablesEq) tablesArg = tablesEq.split('=')[1];

    // Import DB helpers after dotenv has loaded so db.js logs correct env vars
    const dbModule = await import('../src/config/db.js');
    const { beginTransaction, commit, rollback, transactionQuery } = dbModule;

    console.log(`Database: ${DB_NAME}`);
    console.log(`Mode: ${mode} (${mode === 'safe' ? 'DELETE within transaction' : 'TRUNCATE (non-transactional)'} )`);
    if (tablesArg) console.log(`Target tables (from --tables): ${tablesArg}`);
    if (listOnly) console.log('List-only mode: no changes will be made.');
    if (dryRun) console.log('Dry-run: will show actions without executing them.');

    // Get list of base tables for this schema
    const tablesRes = await transactionQuery(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'`,
      [DB_NAME]
    );

    const discovered = (tablesRes || []).map((r) => r.TABLE_NAME).filter(Boolean);
    let tables = discovered.slice();
    if (tablesArg) {
      const requested = tablesArg.split(',').map(s => s.trim()).filter(Boolean);
      // keep only tables that exist in schema and preserve requested order
      tables = requested.filter(t => discovered.includes(t));
      const invalid = requested.filter(t => !discovered.includes(t));
      if (invalid.length > 0) console.warn('Warning: these tables were not found in schema and will be skipped:', invalid.join(', '));
    }
    if (tables.length === 0) {
      console.log('No tables found in schema. Nothing to do.');
      rl.close();
      process.exit(0);
    }

    console.log('Target tables:');
    tables.forEach((t) => console.log(' -', t));

    if (listOnly) {
      console.log('\n--list flag provided, exiting without changes.');
      rl.close();
      process.exit(0);
    }

    const confirm = await ask('This will remove data from the listed tables. Type YES to continue: ');
    if (confirm.trim() !== 'YES') {
      console.log('Aborted by user. No changes made.');
      rl.close();
      process.exit(0);
    }

    if (mode === 'safe') {
      console.log('\nStarting safe DELETE within a transaction...');
      if (!dryRun) await beginTransaction();
      try {
        if (!dryRun) await transactionQuery('SET FOREIGN_KEY_CHECKS=0');

        for (const t of tables) {
          console.log(`Deleting rows from ${t} ...`);
          if (!dryRun) {
            await transactionQuery(`DELETE FROM \`${t}\``);
            console.log(`Resetting AUTO_INCREMENT for ${t} ...`);
            try {
              await transactionQuery(`ALTER TABLE \`${t}\` AUTO_INCREMENT = 1`);
            } catch (e) {
              // Some tables may not have AUTO_INCREMENT - ignore errors here
            }
          }
        }

        if (!dryRun) await transactionQuery('SET FOREIGN_KEY_CHECKS=1');
        if (!dryRun) await commit();
        console.log(dryRun ? '✅ Dry-run complete (no changes made).' : '✅ All tables cleaned and transaction committed.');
      } catch (err) {
        console.error('Error during cleanup, rolling back transaction:', err);
        try {
          if (!dryRun) await rollback();
        } catch (rbErr) {
          console.error('Rollback failed:', rbErr);
        }
        process.exit(1);
      }
    } else {
      console.log('\nTRUNCATE mode selected. Foreign key checks will be disabled during the operation.');
      // TRUNCATE is non-transactional; proceed carefully
      try {
        if (!dryRun) await transactionQuery('SET FOREIGN_KEY_CHECKS=0');
        for (const t of tables) {
          console.log(`Truncating ${t} ...`);
          if (!dryRun) await transactionQuery(`TRUNCATE TABLE \`${t}\``);
        }
        if (!dryRun) await transactionQuery('SET FOREIGN_KEY_CHECKS=1');
        console.log(dryRun ? '✅ Dry-run complete (no changes made).' : '✅ TRUNCATE completed.');
      } catch (err) {
        console.error('Error during TRUNCATE operation:', err);
        try {
          if (!dryRun) await transactionQuery('SET FOREIGN_KEY_CHECKS=1');
        } catch (e) {
          console.error('Failed to restore FOREIGN_KEY_CHECKS:', e);
        }
        process.exit(1);
      }
    }

    rl.close();
    process.exit(0);
  } catch (err) {
    console.error('Unexpected error:', err);
    try { await rollback(); } catch (_) {}
    rl.close();
    process.exit(1);
  }
}

main();
