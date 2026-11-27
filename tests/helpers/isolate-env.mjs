// Run before importing the app: never let local .env credentials redirect tests
// to the shared PostgreSQL database or to the Vercel fallback.
import { databaseVariables } from '../../server/database-config.mjs';
for (const name of [...databaseVariables, 'VERCEL']) {
  process.env[name] = '';
}
