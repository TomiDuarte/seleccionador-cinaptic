import test from 'node:test';
import assert from 'node:assert/strict';
import { databaseUrl, databaseVariables } from '../server/database-config.mjs';

test('admite las variables Neon STORAGE_ y prefiere la conexión agrupada', () => {
  assert.equal(databaseUrl({
    STORAGE_NEON_AUTH_BASE_URL: 'https://auth.example',
    STORAGE_DATABASE_URL_UNPOOLED: 'postgresql://direct.example/db',
    STORAGE_POSTGRES_PRISMA_URL: 'postgresql://pooled.example/db',
    STORAGE_POSTGRES_URL_NO_SSL: 'postgresql://insecure.example/db',
  }), 'postgresql://pooled.example/db');
  assert.equal(databaseUrl({ STORAGE_NEON_AUTH_BASE_URL: 'https://auth.example' }), undefined);
});

test('conserva prioridad explícita, admite alternativas y descarta vacíos', () => {
  for (const name of databaseVariables) assert.equal(databaseUrl({ [name]: ' postgresql://example/db ' }), 'postgresql://example/db');
  assert.equal(databaseUrl({ DATABASE_URL: 'postgresql://primary/db', STORAGE_DATABASE_URL: 'postgresql://storage/db' }), 'postgresql://primary/db');
  assert.equal(databaseUrl({ DATABASE_URL: ' ', STORAGE_DATABASE_URL: 'postgresql://storage/db' }), 'postgresql://storage/db');
  assert.equal(databaseUrl({}), undefined);
});
