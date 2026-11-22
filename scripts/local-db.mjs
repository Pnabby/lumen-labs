import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
export function createLocalDb(filename = ':memory:') {
  const sqlite = new DatabaseSync(filename);
  const exists = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='enquiries'").get();
  if (!exists) sqlite.exec(readFileSync(new URL('../drizzle/0000_enquiries.sql', import.meta.url), 'utf8'));
  return { sqlite, binding: { prepare(sql) { return { bind(...values) { const statement = sqlite.prepare(sql); return { async first() { return statement.get(...values) ?? null; }, async run() { return statement.run(...values); } }; } }; } } };
}
