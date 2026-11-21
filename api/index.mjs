import { createApp } from '../server/index.mjs';

export default async function handler(req, res) {
  const app = createApp();
  await new Promise(resolve => {
    res.once('finish', resolve);
    res.once('close', resolve);
    app.emit('request', req, res);
  });
}
