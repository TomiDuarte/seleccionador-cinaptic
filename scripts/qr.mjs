import QRCode from 'qrcode';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

let url;
try { url = new URL(process.argv[2]); } catch {
  console.error('Uso: npm run qr -- https://URL-PUBLICA-DEL-EVENTO/'); process.exit(1);
}
if (url.protocol !== 'https:' || url.username || url.password || ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
  console.error('Usá la URL pública definitiva con HTTPS y sin credenciales.'); process.exit(1);
}
mkdirSync('.data', { recursive: true });
const output = resolve('.data', 'qr-evento.svg');
writeFileSync(output, await QRCode.toString(url.href, { type: 'svg', errorCorrectionLevel: 'M', margin: 4, width: 1024, color: { dark: '#101c19', light: '#ffffff' } }));
console.log(`QR listo para imprimir: ${output}\nDestino: ${url.href}\nProbalo con un celular usando datos móviles antes de imprimir. Configurá también publicUrl en public/content.js.`);
