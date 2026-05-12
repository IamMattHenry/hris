#!/usr/bin/env node
import readline from 'readline';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory of this script for reliable path resolution
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load backend/.env explicitly so DB credentials are available
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

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
    const dryRun = process.argv.includes('--dry-run');
    const listOnly = process.argv.includes('--list');

    // Import DB helpers after dotenv has loaded
    const dbModule = await import('../src/config/db.js');
    const { beginTransaction, commit, rollback, transactionQuery } = dbModule;

    console.log(`Database: ${DB_NAME}`);
    console.log('Cleaning payroll-related tables (runs, records, contributions, override logs, negative balances)...');
    if (listOnly) console.log('List-only mode: no changes will be made.');
    if (dryRun) console.log('Dry-run: will show actions without executing them.');

    // Tables to clean in order (respecting FK constraints)
    // payroll_override_logs has FKs to payroll_runs and payroll_records
    // payroll_contributions has FK to payroll_records
    // payroll_negative_net_pay_balances has FKs to payroll_runs and payroll_records (with ON DELETE SET NULL)
    // payroll_records has FK to payroll_runs
    // payroll_runs is the root table
    const tables = [
      'payroll_override_logs',
      'payroll_contributions',
      'payroll_negative_net_pay_balances',
      'payroll_records',
      'payroll_runs',
    ];

    console.log('\nTables to clean:');
    tables.forEach((t) => console.log(' -', t));

    if (listOnly) {
      console.log('\n--list flag provided, exiting without changes.');
      rl.close();
      process.exit(0);
    }

    const confirm = await ask('\nThis will remove all payroll run records and slips. Type YES to continue: ');
    if (confirm.trim() !== 'YES') {
      console.log('Aborted by user. No changes made.');
      rl.close();
      process.exit(0);
    }

    console.log('\nStarting cleanup within a transaction...');
    if (!dryRun) await beginTransaction();

    try {
      if (!dryRun) await transactionQuery('SET FOREIGN_KEY_CHECKS=0');

      for (const table of tables) {
        console.log(`Deleting rows from ${table} ...`);
        if (!dryRun) {
          await transactionQuery(`DELETE FROM \`${table}\``);
          console.log(`Resetting AUTO_INCREMENT for ${table} ...`);
          try {
            await transactionQuery(`ALTER TABLE \`${table}\` AUTO_INCREMENT = 1`);
          } catch (e) {
            // Some tables may not have AUTO_INCREMENT - ignore errors here
            console.log(`  (${table} has no AUTO_INCREMENT, skipping)`);
          }
        }
      }

      if (!dryRun) await transactionQuery('SET FOREIGN_KEY_CHECKS=1');

      if (dryRun) {
        console.log('\n[DRY RUN] No changes were made. To apply, run without --dry-run');
        rl.close();
        process.exit(0);
      }

      console.log('\nCommitting transaction...');
      await commit();
      console.log('✓ Payroll cleanup complete. All payroll runs, records, and slips have been removed.');
      rl.close();
      process.exit(0);
    } catch (error) {
      console.error('Error during cleanup:', error.message);
      if (!dryRun) {
        console.log('Rolling back transaction...');
        await rollback();
      }
      rl.close();
      process.exit(1);
    }
  } catch (error) {
    console.error('Fatal error:', error.message);
    rl.close();
    process.exit(1);
  }
}

main();
