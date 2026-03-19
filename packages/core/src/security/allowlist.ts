import { DatalogueError } from '../errors.js';

/**
 * Enforce table allowlist. Throws TABLE_NOT_ALLOWED if any table
 * in `referencedTables` is not in the `allowedTables` list.
 * Comparison is case-insensitive.
 */
export function enforceAllowlist(
  referencedTables: string[],
  allowedTables: string[],
): void {
  const allowedLower = new Set(allowedTables.map((t) => t.toLowerCase()));

  for (const table of referencedTables) {
    // Strip schema prefix — e.g. "public.orders" → "orders"
    const name = table.includes('.') ? table.split('.').pop()! : table;
    if (!allowedLower.has(name.toLowerCase())) {
      throw new DatalogueError(
        `Table "${table}" is not in the allowed tables list`,
        'TABLE_NOT_ALLOWED',
      );
    }
  }
}
