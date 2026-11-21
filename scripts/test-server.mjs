import { createApp } from '../server/index.mjs';
// This password is ONLY for this isolated, loopback-only, in-memory test server.
createApp({ database: ':memory:', password: 'only-for-automated-tests', secureCookie: false }).listen(3107, '127.0.0.1');
