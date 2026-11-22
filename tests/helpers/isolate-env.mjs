// Run before importing the app: never let local .env credentials redirect tests
// to the shared PostgreSQL database or to the Vercel fallback.
for (const name of ['DATABASE_URL', 'POSTGRES_URL', 'POSTGRES_PRISMA_URL', 'POSTGRES_URL_NON_POOLING', 'NEON_DATABASE_URL', 'VERCEL']) {
  process.env[name] = '';
}
