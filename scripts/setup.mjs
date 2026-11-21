import { randomBytes } from 'node:crypto';
import { writeFileSync, existsSync } from 'node:fs';
if (existsSync('.env')) {
  console.log('Ya existe .env. Se conserva la configuración actual.');
} else {
  writeFileSync('.env', `PORT=3000\nHOST=0.0.0.0\nADMIN_PASSWORD=${randomBytes(24).toString('base64url')}\nDATABASE_PATH=.data/cinaptic.sqlite\nCOOKIE_SECURE=false\n`, { flag: 'wx', mode: 0o600 });
  console.log('Configuración creada en .env. Abrí ese archivo para consultar la contraseña del panel.');
}
