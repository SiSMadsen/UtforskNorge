import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// The Drizzle CLI runs outside Next.js, so load the same env file `next dev` uses.
config({ path: '.env.local', quiet: true });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set — add it to .env.local');
}

export default defineConfig({
  schema: './db/schema.ts',
  out: './db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
