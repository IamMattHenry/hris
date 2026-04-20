import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import mysql from 'mysql2/promise';

dotenv.config();

const backendRoot = process.cwd();
const srcRoot = path.join(backendRoot, 'src');
const outputPathArg = process.argv[2];

const SQL_TABLE_REGEX = /\b(?:FROM|JOIN|UPDATE|INTO|DELETE\s+FROM|TRUNCATE\s+TABLE)\s+`?([a-zA-Z_][a-zA-Z0-9_]*)`?/gi;
const IGNORE_TABLES = new Set(['information_schema', 'mysql', 'performance_schema', 'sys']);

const normalizeColumnType = (columnType) => {
  if (!columnType) {
    return 'varchar(255)';
  }

  return String(columnType).replace(/\s+unsigned\b/gi, '');
};

const quoteDefault = (value) => {
  if (value === null || value === undefined) {
    return 'null';
  }

  const normalized = String(value);

  if (/^current_timestamp(\(\d+\))?$/i.test(normalized)) {
    return '`CURRENT_TIMESTAMP`';
  }

  if (/^[a-z_]+\(\)$/i.test(normalized)) {
    return `\`${normalized}\``;
  }

  const bitLiteral = normalized.match(/^b'([01])'$/i);
  if (bitLiteral) {
    return bitLiteral[1];
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

const walkFiles = async (dir) => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await walkFiles(fullPath);
      files.push(...nested);
    } else if (entry.isFile() && fullPath.endsWith('.js')) {
      files.push(fullPath);
    }
  }

  return files;
};

const collectReferencedTables = async () => {
  const files = await walkFiles(srcRoot);
  const names = new Set();

  for (const filePath of files) {
    const content = await fs.readFile(filePath, 'utf8');
    let match = SQL_TABLE_REGEX.exec(content);

    while (match) {
      const tableName = match[1];
      if (tableName && !IGNORE_TABLES.has(tableName.toLowerCase())) {
        names.add(tableName);
      }
      match = SQL_TABLE_REGEX.exec(content);
    }

    SQL_TABLE_REGEX.lastIndex = 0;
  }

  return names;
};

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'hris_db',
});

try {
  const [dbRows] = await connection.execute('SELECT DATABASE() AS current_db');
  const currentDb = dbRows?.[0]?.current_db || process.env.DB_NAME;

  if (!currentDb) {
    throw new Error('No database selected. Set DB_NAME in backend/.env.');
  }

  const [allTablesRows] = await connection.execute(
    `SELECT TABLE_NAME
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ?`,
    [currentDb]
  );

  const allTables = new Set(allTablesRows.map((row) => row.TABLE_NAME));
  const referencedByCode = await collectReferencedTables();
  const includedTables = Array.from(referencedByCode).filter((name) => allTables.has(name)).sort();

  if (includedTables.length === 0) {
    throw new Error('No matching tables found in DB for SQL references from backend/src.');
  }

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

  const includedSet = new Set(includedTables);

  const columnsByTable = new Map();
  for (const column of columns) {
    if (!includedSet.has(column.TABLE_NAME)) {
      continue;
    }

    if (!columnsByTable.has(column.TABLE_NAME)) {
      columnsByTable.set(column.TABLE_NAME, []);
    }
    columnsByTable.get(column.TABLE_NAME).push(column);
  }

  const constraintsByTable = new Map();
  for (const row of constraints) {
    if (!includedSet.has(row.TABLE_NAME)) {
      continue;
    }

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
    if (!includedSet.has(row.TABLE_NAME) || !includedSet.has(row.REFERENCED_TABLE_NAME)) {
      continue;
    }

    const key = `${row.TABLE_NAME}:${row.CONSTRAINT_NAME}`;
    if (!fkByConstraint.has(key)) {
      fkByConstraint.set(key, {
        fromTable: row.TABLE_NAME,
        toTable: row.REFERENCED_TABLE_NAME,
        fromColumns: [],
        toColumns: [],
      });
    }

    const fk = fkByConstraint.get(key);
    fk.fromColumns.push(row.COLUMN_NAME);
    fk.toColumns.push(row.REFERENCED_COLUMN_NAME);
  }

  const lines = [];
  lines.push(`// Generated from MySQL database: ${currentDb}`);
  lines.push('// Filter: tables referenced by SQL in backend/src');
  lines.push('');

  for (const tableName of includedTables) {
    const tableColumns = columnsByTable.get(tableName) || [];
    const tableConstraints = constraintsByTable.get(tableName);

    lines.push(`Table ${tableName} {`);

    for (const column of tableColumns) {
      const settings = buildColumnSettings(column);
      const columnType = normalizeColumnType(column.COLUMN_TYPE);
      lines.push(`  ${column.COLUMN_NAME} ${columnType}${settings}`);
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
    lines.push('// Foreign key relationships (within filtered set)');
    for (const fk of fkByConstraint.values()) {
      const from = fk.fromColumns.length > 1 ? `(${fk.fromColumns.join(', ')})` : fk.fromColumns[0];
      const to = fk.toColumns.length > 1 ? `(${fk.toColumns.join(', ')})` : fk.toColumns[0];
      lines.push(`Ref: ${fk.fromTable}.${from} > ${fk.toTable}.${to}`);
    }
  }

  const dbml = `${lines.join('\n')}\n`;

  const outputPath = outputPathArg
    ? path.resolve(outputPathArg)
    : path.resolve(backendRoot, 'dbdiagram.hris.dbml');

  await fs.writeFile(outputPath, dbml, 'utf8');

  console.log(`Filtered DBML exported successfully: ${outputPath}`);
  console.log(`Tables included: ${includedTables.length}`);
  console.log(`Foreign keys included: ${fkByConstraint.size}`);
} catch (error) {
  console.error('Failed to export filtered DBML:', error.message);
  process.exit(1);
} finally {
  await connection.end();
}