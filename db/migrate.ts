import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

config({ path: '.env.local', quiet: true });

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set — add it to .env.local');
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  console.log('Running migrations against', new URL(process.env.DATABASE_URL).host);
  await migrate(db, { migrationsFolder: './db/migrations' });
  console.log('Migrations complete.');

  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
