import journal from './meta/_journal.json';

const sqlFiles = import.meta.glob<string>('./*.sql', {
  eager: true,
  query: '?raw',
  import: 'default',
});

// Transform keys from './0000_even_stature.sql' → 'm0000'
const migrations: Record<string, string> = {};
for (const [path, sql] of Object.entries(sqlFiles)) {
  const match = path.match(/\.\/(\d{4})/);
  if (match) {
    migrations[`m${match[1]}`] = sql;
  }
}

export default { journal, migrations };
