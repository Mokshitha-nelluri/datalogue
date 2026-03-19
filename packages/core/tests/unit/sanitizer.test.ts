import { describe, it, expect } from 'vitest';
import { sanitizeDBError } from '../../src/security/sanitizer.js';

const GENERIC = 'SQL execution failed — check column and table names';

describe('sanitizeDBError', () => {
  it('returns generic message for empty input', () => {
    expect(sanitizeDBError('')).toBe(GENERIC);
  });

  it('returns generic message for whitespace-only input', () => {
    expect(sanitizeDBError('   ')).toBe(GENERIC);
  });

  it('strips PostgreSQL connection strings', () => {
    const err = 'connection to postgresql://admin:secret@10.0.0.1:5432/mydb failed';
    const result = sanitizeDBError(err);
    expect(result).not.toContain('postgresql://');
    expect(result).not.toContain('admin');
    expect(result).not.toContain('secret');
  });

  it('strips IP addresses', () => {
    const err = "could not connect to server 192.168.1.100:5432";
    const result = sanitizeDBError(err);
    expect(result).not.toContain('192.168.1.100');
  });

  it('strips file paths (Unix)', () => {
    const err = "error reading /var/lib/postgresql/data/pg_hba.conf";
    const result = sanitizeDBError(err);
    expect(result).not.toContain('/var/lib');
  });

  it('strips file paths (Windows)', () => {
    const err = 'error reading C:\\Program Files\\PostgreSQL\\data\\file.conf';
    const result = sanitizeDBError(err);
    expect(result).not.toContain('C:\\Program');
  });

  it('preserves error type info (column does not exist)', () => {
    const err = "column \"revenue\" does not exist";
    const result = sanitizeDBError(err);
    expect(result).toContain('column');
    expect(result).toContain('revenue');
    expect(result).toContain('does not exist');
  });

  it('preserves error type info (relation does not exist)', () => {
    const err = 'relation "sales_summary" does not exist';
    const result = sanitizeDBError(err);
    expect(result).toContain('relation');
    expect(result).toContain('sales_summary');
  });

  it('caps output at 200 characters', () => {
    const longError = 'ERROR: ' + 'a'.repeat(300);
    const result = sanitizeDBError(longError);
    expect(result.length).toBeLessThanOrEqual(200);
  });

  it('strips password= patterns', () => {
    const err = 'connection failed password=s3cret host=10.0.0.1';
    const result = sanitizeDBError(err);
    expect(result).not.toContain('s3cret');
  });

  it('strips value= patterns from constraint violations', () => {
    const err = "duplicate key value violates unique constraint value='some secret data'";
    const result = sanitizeDBError(err);
    expect(result).not.toContain('some secret data');
  });

  it('strips port mentions', () => {
    const err = 'could not connect on port 5432';
    const result = sanitizeDBError(err);
    expect(result).not.toContain('port 5432');
  });
});
