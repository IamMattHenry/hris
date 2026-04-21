import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import mysql from 'mysql2/promise';

dotenv.config();

const outputPathArg = process.argv[2];

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'hris_db',
});

const quoteDefault = (value) => {
  if (value === null || value === undefined) {
    return 'null';
  }

  const normalized = String(value);

  if (/^current_timestamp(\(\))?$/i.test(normalized)) {
    return normalized.toUpperCase();
  }

  if (/^-?\d+(\.\d+)?$/.test(normalized)) {
    return normalized;
  }

  return `'${normalized.replace(/'/g, "\\'")}'`;
};

const buildColumnSettings = (column) => {
  const settings = [];

  if (column.COLUMN_KEY === 'PRI') {
    settings.push('pk');
  }

  if (column.EXTRA?.toLowerCase().includes('auto_increment')) {
    settings.push('increment');
  }

  if (column.IS_NULLABLE === 'NO' && column.COLUMN_KEY !== 'PRI') {
    settings.push('not null');
  }

  if (column.COLUMN_DEFAULT !== null) {
    settings.push(`default: ${quoteDefault(column.COLUMN_DEFAULT)}`);
  }

  if (column.COLUMN_KEY === 'UNI') {
    settings.push('unique');
  }

  return settings.length > 0 ? ` [${settings.join(', ')}]` : '';
};

try {
  const [dbRows] = await connection.execute('SELECT DATABASE() AS current_db');
  const currentDb = dbRows?.[0]?.current_db || process.env.DB_NAME;

  if (!currentDb) {
    throw new Error('No database selected. Set DB_NAME in backend/.env.');
  }

  const [tables] = await connection.execute(
    `SELECT TABLE_NAME
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ?
     ORDER BY TABLE_NAME`,
    [currentDb]
  );

  const [columns] = await connection.execute(
    `SELECT
       TABLE_NAME,
       COLUMN_NAME,
       COLUMN_TYPE,
       IS_NULLABLE,
       COLUMN_DEFAULT,
       EXTRA,
       COLUMN_KEY
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ?
     ORDER BY TABLE_NAME, ORDINAL_POSITION`,
    [currentDb]
  );

  const [constraints] = await connection.execute(
    `SELECT
       tc.TABLE_NAME,
       tc.CONSTRAINT_NAME,
       tc.CONSTRAINT_TYPE,
       kcu.COLUMN_NAME,
       kcu.ORDINAL_POSITION
     FROM information_schema.TABLE_CONSTRAINTS tc
     JOIN information_schema.KEY_COLUMN_USAGE kcu
       ON tc.CONSTRAINT_SCHEMA = kcu.CONSTRAINT_SCHEMA
      AND tc.TABLE_NAME = kcu.TABLE_NAME
      AND tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
     WHERE tc.TABLE_SCHEMA = ?
       AND tc.CONSTRAINT_TYPE IN ('PRIMARY KEY', 'UNIQUE')
     ORDER BY tc.TABLE_NAME, tc.CONSTRAINT_NAME, kcu.ORDINAL_POSITION`,
    [currentDb]
  );

  const [foreignKeys] = await connection.execute(
    `SELECT
       kcu.CONSTRAINT_NAME,
       kcu.TABLE_NAME,
       kcu.COLUMN_NAME,
       kcu.ORDINAL_POSITION,
       kcu.REFERENCED_TABLE_NAME,
       kcu.REFERENCED_COLUMN_NAME,
       rc.UPDATE_RULE,
       rc.DELETE_RULE
     FROM information_schema.KEY_COLUMN_USAGE kcu
     JOIN information_schema.REFERENTIAL_CONSTRAINTS rc
       ON rc.CONSTRAINT_SCHEMA = kcu.CONSTRAINT_SCHEMA
      AND rc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
      AND rc.TABLE_NAME = kcu.TABLE_NAME
     WHERE kcu.TABLE_SCHEMA = ?
       AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
     ORDER BY kcu.TABLE_NAME, kcu.CONSTRAINT_NAME, kcu.ORDINAL_POSITION`,
    [currentDb]
  );

  const columnsByTable = new Map();
  for (const column of columns) {
    if (!columnsByTable.has(column.TABLE_NAME)) {
      columnsByTable.set(column.TABLE_NAME, []);
    }
    columnsByTable.get(column.TABLE_NAME).push(column);
  }

  const constraintsByTable = new Map();
  for (const row of constraints) {
    if (!constraintsByTable.has(row.TABLE_NAME)) {
      constraintsByTable.set(row.TABLE_NAME, new Map());
    }
    const byConstraint = constraintsByTable.get(row.TABLE_NAME);
    if (!byConstraint.has(row.CONSTRAINT_NAME)) {
      byConstraint.set(row.CONSTRAINT_NAME, {
        type: row.CONSTRAINT_TYPE,
        columns: [],
      });
    }
    byConstraint.get(row.CONSTRAINT_NAME).columns.push(row.COLUMN_NAME);
  }

  const fkByConstraint = new Map();
  for (const row of foreignKeys) {
    const key = `${row.TABLE_NAME}:${row.CONSTRAINT_NAME}`;
    if (!fkByConstraint.has(key)) {
      fkByConstraint.set(key, {
        fromTable: row.TABLE_NAME,
        toTable: row.REFERENCED_TABLE_NAME,
        fromColumns: [],
        toColumns: [],
        updateRule: row.UPDATE_RULE,
        deleteRule: row.DELETE_RULE,
      });
    }

    const fk = fkByConstraint.get(key);
    fk.fromColumns.push(row.COLUMN_NAME);
    fk.toColumns.push(row.REFERENCED_COLUMN_NAME);
  }

  const lines = [];
  lines.push(`// Generated from MySQL database: ${currentDb}`);
  lines.push('');

  for (const tableRow of tables) {
    const tableName = tableRow.TABLE_NAME;
    const tableColumns = columnsByTable.get(tableName) || [];
    const tableConstraints = constraintsByTable.get(tableName);

    lines.push(`Table ${tableName} {`);

    for (const column of tableColumns) {
      const settings = buildColumnSettings(column);
      lines.push(`  ${column.COLUMN_NAME} ${column.COLUMN_TYPE}${settings}`);
    }

    if (tableConstraints && tableConstraints.size > 0) {
      const composite = Array.from(tableConstraints.entries()).filter(([, c]) => c.columns.length > 1);

      if (composite.length > 0) {
        lines.push('');
        lines.push('  indexes {');
        for (const [constraintName, constraint] of composite) {
          const cols = constraint.columns.join(', ');
          const attrs = [];
          if (constraint.type === 'PRIMARY KEY') {
            attrs.push('pk');
          }
          if (constraint.type === 'UNIQUE') {
            attrs.push('unique');
          }
          attrs.push(`name: '${constraintName}'`);
          lines.push(`    (${cols}) [${attrs.join(', ')}]`);
        }
        lines.push('  }');
      }
    }

    lines.push('}');
    lines.push('');
  }

  if (fkByConstraint.size > 0) {
    lines.push('// Foreign key relationships');
    for (const fk of fkByConstraint.values()) {
      const from = fk.fromColumns.length > 1 ? `(${fk.fromColumns.join(', ')})` : fk.fromColumns[0];
      const to = fk.toColumns.length > 1 ? `(${fk.toColumns.join(', ')})` : fk.toColumns[0];
      lines.push(`Ref: ${fk.fromTable}.${from} > ${fk.toTable}.${to}`);
    }
  }

  const dbml = `${lines.join('\n')}\n`;

  const outputPath = outputPathArg
    ? path.resolve(outputPathArg)
    : path.resolve(process.cwd(), 'dbdiagram.dbml');

  await fs.writeFile(outputPath, dbml, 'utf8');

  console.log(`DBML exported successfully: ${outputPath}`);
  console.log(`Tables exported: ${tables.length}`);
  console.log(`Foreign keys exported: ${fkByConstraint.size}`);
} catch (error) {
  console.error('Failed to export DBML:', error.message);
  process.exit(1);
} finally {
  await connection.end();
}