import { createApp } from '../server/index.mjs';

export default async function handler(req, res) {
  const app = createApp();
  app.emit('request', req, res);
}
