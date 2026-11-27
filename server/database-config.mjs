// Vercel storage integrations can prefix their connection variables.
// Prefer pooled connections; never use an authentication URL as a database URL.
export const databaseVariables = [
  'DATABASE_URL', 'POSTGRES_URL', 'POSTGRES_PRISMA_URL',
  'POSTGRES_URL_NON_POOLING', 'NEON_DATABASE_URL',
  'STORAGE_DATABASE_URL', 'STORAGE_POSTGRES_URL', 'STORAGE_POSTGRES_PRISMA_URL',
  'STORAGE_DATABASE_URL_UNPOOLED', 'STORAGE_POSTGRES_URL_NON_POOLING',
];

export function databaseUrl(env = process.env) {
  return databaseVariables.map(name => env[name]?.trim()).find(Boolean);
}
