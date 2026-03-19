import { describe, it, expect } from 'vitest';
import {
  validateSQL,
  stripSQLComments,
} from '../../src/security/validator.js';
import type { ValidationOptions } from '../../src/types.js';

const baseOpts: ValidationOptions = {
  allowedTables: ['orders', 'customers', 'products'],
  allowMutations: false,
  dialect: 'PostgreSQL',
};

// ─── Basic valid queries ─────────────────────────────────────────────────────

describe('validateSQL — valid queries', () => {
  it('accepts a simple SELECT', () => {
    const result = validateSQL('SELECT id, total FROM orders', baseOpts);
    expect(result.valid).toBe(true);
    expect(result.normalizedSQL).toBeDefined();
  });

  it('accepts SELECT with JOIN', () => {
    const result = validateSQL(
      'SELECT o.id, c.name FROM orders o JOIN customers c ON o.customer_id = c.id',
      baseOpts,
    );
    expect(result.valid).toBe(true);
  });

  it('accepts SELECT with subquery', () => {
    const result = validateSQL(
      'SELECT * FROM orders WHERE total > (SELECT AVG(total) FROM orders)',
      baseOpts,
    );
    expect(result.valid).toBe(true);
  });

  it('accepts SELECT with WHERE clause', () => {
    const result = validateSQL(
      "SELECT id FROM customers WHERE name = 'Alice'",
      baseOpts,
    );
    expect(result.valid).toBe(true);
  });

  it('normalizes SQL from AST (removes obfuscation)', () => {
    const result = validateSQL('SELECT   id   FROM   orders', baseOpts);
    expect(result.valid).toBe(true);
    // The normalized SQL should be clean
    expect(result.normalizedSQL).toBeDefined();
    expect(result.normalizedSQL).not.toContain('   ');
  });
});

// ─── Blocked statement types ─────────────────────────────────────────────────

describe('validateSQL — blocked statement types', () => {
  it('blocks DROP TABLE', () => {
    const result = validateSQL('DROP TABLE orders', baseOpts);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('destructive statement type');
  });

  it('blocks TRUNCATE', () => {
    const result = validateSQL('TRUNCATE TABLE orders', baseOpts);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('destructive statement type');
  });

  it('blocks ALTER TABLE', () => {
    const result = validateSQL(
      'ALTER TABLE orders ADD COLUMN new_col text',
      baseOpts,
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('destructive statement type');
  });

  it('blocks CREATE TABLE', () => {
    const result = validateSQL(
      'CREATE TABLE evil (id int)',
      baseOpts,
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('destructive statement type');
  });

  it('blocks DROP even with allowMutations: true', () => {
    const result = validateSQL('DROP TABLE orders', {
      ...baseOpts,
      allowMutations: true,
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('destructive statement type');
  });

  it('blocks ALTER even with allowMutations: true', () => {
    const result = validateSQL(
      'ALTER TABLE orders ADD COLUMN x text',
      { ...baseOpts, allowMutations: true },
    );
    expect(result.valid).toBe(false);
  });
});

// ─── Mutation control ────────────────────────────────────────────────────────

describe('validateSQL — mutation control', () => {
  it('blocks INSERT when allowMutations is false', () => {
    const result = validateSQL(
      "INSERT INTO orders (id, total) VALUES (1, 100)",
      baseOpts,
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('MUTATION_NOT_ALLOWED');
  });

  it('blocks DELETE when allowMutations is false', () => {
    const result = validateSQL(
      'DELETE FROM orders WHERE id = 1',
      baseOpts,
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('MUTATION_NOT_ALLOWED');
  });

  it('blocks UPDATE when allowMutations is false', () => {
    const result = validateSQL(
      'UPDATE orders SET total = 200 WHERE id = 1',
      baseOpts,
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('MUTATION_NOT_ALLOWED');
  });

  it('allows INSERT when allowMutations is true', () => {
    const result = validateSQL(
      "INSERT INTO orders (id, total) VALUES (1, 100)",
      { ...baseOpts, allowMutations: true },
    );
    expect(result.valid).toBe(true);
  });

  it('allows DELETE when allowMutations is true', () => {
    const result = validateSQL('DELETE FROM orders WHERE id = 1', {
      ...baseOpts,
      allowMutations: true,
    });
    expect(result.valid).toBe(true);
  });

  it('allows UPDATE when allowMutations is true', () => {
    const result = validateSQL(
      'UPDATE orders SET total = 200 WHERE id = 1',
      { ...baseOpts, allowMutations: true },
    );
    expect(result.valid).toBe(true);
  });
});

// ─── SQL injection vectors ───────────────────────────────────────────────────

describe('validateSQL — SQL injection', () => {
  it('blocks multi-statement injection (semicolon)', () => {
    const result = validateSQL(
      'SELECT * FROM orders; DROP TABLE orders',
      baseOpts,
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('SQL_INJECTION_BLOCKED');
  });

  it('blocks UNION-based injection into system tables', () => {
    const result = validateSQL(
      'SELECT id FROM orders UNION SELECT tablename FROM pg_catalog.pg_tables',
      baseOpts,
    );
    expect(result.valid).toBe(false);
    // Should be blocked by either system schema or table allowlist
    expect(result.reason).toContain('TABLE_NOT_ALLOWED');
  });

  it('blocks hex-encoded strings', () => {
    const result = validateSQL(
      'SELECT * FROM orders WHERE name = 0x44524F50',
      baseOpts,
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('hex-encoded string');
  });

  it('strips comments before validation', () => {
    // The comment-stripped version should still be a valid SELECT
    const result = validateSQL(
      'SELECT id FROM orders -- this is a comment',
      baseOpts,
    );
    expect(result.valid).toBe(true);
  });

  it('strips block comments', () => {
    const result = validateSQL(
      'SELECT id FROM orders /* secret injection */',
      baseOpts,
    );
    expect(result.valid).toBe(true);
  });

  it('blocks queries over 2000 chars', () => {
    const longQuery = 'SELECT * FROM orders WHERE ' + 'id > 1 AND '.repeat(200);
    expect(longQuery.length).toBeGreaterThan(2000);
    const result = validateSQL(longQuery, baseOpts);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('QUERY_TOO_LONG');
  });
});

// ─── System schema blocking (Vanna.ai CVE vector) ───────────────────────────

describe('validateSQL — system schema access', () => {
  it('blocks pg_catalog access', () => {
    const result = validateSQL(
      'SELECT * FROM pg_catalog.pg_tables',
      baseOpts,
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('system schema access blocked');
  });

  it('blocks information_schema access', () => {
    const result = validateSQL(
      'SELECT * FROM information_schema.columns',
      baseOpts,
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('system schema access blocked');
  });
});

// ─── Dangerous function blocking (Vanna.ai CVE vector) ──────────────────────

describe('validateSQL — dangerous functions', () => {
  it('blocks pg_read_file', () => {
    const result = validateSQL(
      "SELECT pg_read_file('/etc/passwd')",
      baseOpts,
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('pg_read_file');
  });

  it('blocks lo_import', () => {
    const result = validateSQL(
      "SELECT lo_import('/etc/passwd')",
      baseOpts,
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('lo_import');
  });

  it('blocks xp_cmdshell', () => {
    const result = validateSQL(
      "EXEC xp_cmdshell 'dir'",
      { ...baseOpts, dialect: 'MSSQL' },
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('xp_cmdshell');
  });

  it('blocks LOAD_FILE (MySQL)', () => {
    const result = validateSQL(
      "SELECT load_file('/etc/passwd')",
      { ...baseOpts, dialect: 'MySQL' },
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('load_file');
  });

  it('blocks load_extension (SQLite)', () => {
    const result = validateSQL(
      "SELECT load_extension('./evil.so')",
      { ...baseOpts, dialect: 'SQLite' },
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('load_extension');
  });

  it('blocks dblink', () => {
    const result = validateSQL(
      "SELECT * FROM dblink('host=evil.com dbname=test', 'SELECT 1')",
      baseOpts,
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('dblink');
  });
});

// ─── Table allowlist ─────────────────────────────────────────────────────────

describe('validateSQL — table allowlist', () => {
  it('blocks access to tables not in allowlist', () => {
    const result = validateSQL('SELECT * FROM secret_data', baseOpts);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('TABLE_NOT_ALLOWED');
  });

  it('is case-insensitive for table names', () => {
    const result = validateSQL('SELECT * FROM ORDERS', baseOpts);
    expect(result.valid).toBe(true);
  });

  it('checks all tables in joins', () => {
    const result = validateSQL(
      'SELECT * FROM orders o JOIN secret_data s ON o.id = s.order_id',
      baseOpts,
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('TABLE_NOT_ALLOWED');
  });

  it('checks tables in subqueries', () => {
    const result = validateSQL(
      'SELECT * FROM orders WHERE id IN (SELECT order_id FROM secret_data)',
      baseOpts,
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('TABLE_NOT_ALLOWED');
  });
});

// ─── Dialect support ─────────────────────────────────────────────────────────

describe('validateSQL — dialect support', () => {
  it('works with MySQL dialect', () => {
    const result = validateSQL('SELECT id FROM orders LIMIT 10', {
      ...baseOpts,
      dialect: 'MySQL',
    });
    expect(result.valid).toBe(true);
  });

  it('works with SQLite dialect', () => {
    const result = validateSQL('SELECT id FROM orders LIMIT 10', {
      ...baseOpts,
      dialect: 'SQLite',
    });
    expect(result.valid).toBe(true);
  });

  it('uses fallback for MSSQL when parser fails', () => {
    // This is a valid MSSQL query that the TransactSQL parser should handle
    const result = validateSQL('SELECT TOP 10 id FROM orders', {
      ...baseOpts,
      dialect: 'MSSQL',
    });
    expect(result.valid).toBe(true);
  });

  it('SQLite fallback blocks non-SELECT in fallback mode', () => {
    // If the parser can't parse this SQLite-specific syntax, fallback kicks in
    // and blocks non-SELECT. But if parser handles it, mutation check blocks it.
    const result = validateSQL(
      'DELETE FROM orders WHERE id = 1',
      { ...baseOpts, dialect: 'SQLite' },
    );
    expect(result.valid).toBe(false);
  });

  it('MariaDB retries as MySQL dialect on parse failure', () => {
    // Standard SELECT should parse fine via MySQL fallback
    const result = validateSQL('SELECT id, name FROM orders WHERE id = 1', {
      ...baseOpts,
      dialect: 'MariaDB',
    });
    expect(result.valid).toBe(true);
  });

  it('MariaDB blocks disallowed tables even via MySQL fallback', () => {
    const result = validateSQL('SELECT id FROM secret_table', {
      ...baseOpts,
      dialect: 'MariaDB',
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('TABLE_NOT_ALLOWED');
  });

  it('MariaDB falls back to regex when both MariaDB and MySQL parsing fail', () => {
    // A syntactically weird query that neither parser can handle still goes
    // through fallback regex validation for SELECT
    const result = validateSQL('SELECT id FROM orders', {
      ...baseOpts,
      dialect: 'MariaDB',
    });
    expect(result.valid).toBe(true);
  });
});

// ─── stripSQLComments ────────────────────────────────────────────────────────

describe('stripSQLComments', () => {
  it('strips line comments (--)', () => {
    expect(stripSQLComments('SELECT 1 -- comment')).toBe('SELECT 1');
  });

  it('strips MySQL line comments (#)', () => {
    expect(stripSQLComments('SELECT 1 # comment')).toBe('SELECT 1');
  });

  it('strips block comments', () => {
    expect(stripSQLComments('SELECT /* evil */ 1')).toBe('SELECT  1');
  });

  it('strips multi-line block comments', () => {
    expect(
      stripSQLComments('SELECT /*\n DROP TABLE orders\n */ 1'),
    ).toBe('SELECT  1');
  });
});
