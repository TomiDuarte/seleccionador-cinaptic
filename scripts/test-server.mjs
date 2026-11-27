import '../tests/helpers/isolate-env.mjs';
import { createApp } from '../server/index.mjs';
// This password is ONLY for this isolated, loopback-only, in-memory test server.
createApp({ database: ':memory:', password: 'only-for-automated-tests', secureCookie: false, now: () => Date.parse('2026-11-27T21:00:00-03:00') }).listen(3107, '127.0.0.1');
