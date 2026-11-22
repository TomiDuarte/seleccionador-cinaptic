# CInApTIC · El sombrero de la investigación

Sitio para la Noche de las Universidades de la UTN FRRe, pensado para celulares. El repositorio incluye ejecución local y despliegue en Vercel.

## Ejecutar

Requiere **Node.js 22.13 o posterior**, con `node:sqlite` disponible. En Node 22 la API SQLite puede emitir una advertencia experimental; las pruebas se ejecutaron con Node 22.17.

```sh
npm ci
npm run setup
npm start
```

- Sitio: **http://localhost:3000**
- Panel del stand: **http://localhost:3000/admin**
- Contraseña del equipo: valor `ADMIN_PASSWORD` del archivo local `.env`. `setup` genera una contraseña aleatoria y conserva un `.env` existente. No hay contraseña predeterminada.
- Desarrollo con reinicio del servidor: `npm run dev`. Recargar el navegador después de editar el frontend.

El servidor usa SQLite localmente o el adaptador de Neon para PostgreSQL. Las dependencias de desarrollo se usan para probar el navegador y generar el QR. El cuestionario no necesita claves de IA.

Para probar desde un teléfono, conectarlo al mismo Wi-Fi y abrir `http://IP-LOCAL-DE-LA-PC:3000`. `localhost` en el teléfono apunta al propio teléfono. La configuración escucha en `0.0.0.0`; la red y el firewall deben permitir conexiones. Esa dirección de prueba no reemplaza la URL pública del evento.

## Experiencia incluida

1. Presentación del centro y sus tres líneas actuales: Comunicaciones, Ingeniería de Software y Sistemas Inteligentes.
2. Selección de carrera, con opciones para secundaria y personas que aún están explorando.
3. Seis preguntas situacionales. Cada elección suma un punto a una línea; la carrera no condiciona el resultado.
4. Resultado explicado, distribución de elecciones y empates explícitos. Es una actividad de divulgación, no un instrumento vocacional validado.
5. Código aleatorio emitido en el servidor y guardado en SQLite o PostgreSQL según el entorno. Repetir la solicitud con el mismo identificador y edición devuelve el mismo código y resultado.
6. Invitación por WhatsApp, X, enlace copiable y menú nativo de compartir. Instagram permite copiar la invitación y abrir la app/web para pegarla en un mensaje. No se divulga el código de canje. Las apps disponibles en el menú nativo dependen del dispositivo; si no está disponible se ofrece copiar el texto.
7. Panel protegido por contraseña: búsqueda de código, canje inicial y canje extra separado. El extra requiere que el operador confirme haber visto el mensaje o publicación. La web no verifica automáticamente el envío.
8. Tema claro/oscuro que sigue al sistema inicialmente y conserva la elección manual. Logos institucionales adaptados al fondo, progreso visual, mensajes animados del sombrero y revelación del resultado. Respeta la preferencia de movimiento reducido. Salir con la X pide confirmación y conserva el progreso.
9. Después de completar el cuestionario, el inicio ofrece **Volver a responder el quiz**. Actualiza la carrera, las respuestas y la recomendación, conservando el identificador del navegador, el código original y los canjes inicial/extra. Si se interrumpe, **Continuar el quiz** retoma las respuestas nuevas sin perder el resultado anterior. El endpoint de repetición solo actualiza una participación existente: nunca emite un código nuevo.

Los visitantes conservan el progreso en su navegador. Si una solicitud falla pueden reintentar. El resultado puede recuperarse al recargar. El estado de canje se actualiza automáticamente al entrar al resultado, volver a la pestaña o recuperar la conexión, y cada 15 segundos mientras se visualiza. La revelación final ocupa la pantalla sin recuadro durante al menos 3,5 segundos para leer el mensaje; con movimiento reducido se mantiene ese tiempo sin animaciones.

## Operar el stand

1. Abrir `/admin` en los dispositivos del equipo e ingresar la contraseña configurada.
2. Escribir el código que muestra el visitante y tocar **Consultar**.
3. Tocar **Confirmar canje inicial**. Entregar el premio cuando aparezca la confirmación de registro.
4. Para el extra, pedir que muestre el mensaje o publicación con la invitación, marcar la comprobación y confirmar el canje extra.
5. Si se pierde la conexión, consultar nuevamente el código antes de entregar. Una solicitud puede haberse registrado aunque no llegara la respuesta.

Las actualizaciones son condicionales y atómicas: dos operadores simultáneos no pueden registrar dos veces el mismo premio. Un canje inicial y uno extra por código. Las sesiones del equipo duran hasta ocho horas y se cierran al reiniciar el servidor.

**Límite del modelo:** un código por identificador de navegador no equivale a una persona identificada. Borrar el almacenamiento, usar modo privado u otro teléfono permite obtener otra participación. El equipo debe controlar esa situación en el stand. No se solicita identidad ni se promete impedir ese abuso.

## Contenido editable

Todo el contenido del cuestionario está en `public/content.js`:

| Campo | Uso |
| --- | --- |
| `lines` | Descripción, ejemplos, etiquetas y texto del resultado |
| `careers` | Carreras y etapas del visitante |
| `questions` | Preguntas, opciones y línea que suma cada opción |
| `config.contactUrl` | Contacto oficial para sumarse, pendiente de confirmar. Vacío invita al stand |
| `config.publicUrl` | URL HTTPS definitiva que se compartirá por WhatsApp |
| `config.reward` | Texto del premio según disponibilidad |
| `config.eventId` | Identificador de la edición del evento |

Los logos de CInApTIC y UTN FRRe provienen de la carpeta `LogosCinaptic` proporcionada por el usuario; las variantes utilizadas se copiaron sin alterar a `public/assets`. El sombrero SVG es una ilustración original para la actividad. El frontend usa archivos locales, sin fuentes ni imágenes cargadas de terceros. Los temas y animaciones están en `public/theme.js` y `public/experience.css`.

**Congelar preguntas, orden de opciones y puntajes antes del evento.** Las participaciones guardan índices de respuesta: no cambiar esos significados después de emitir códigos. Para una futura edición, usar un nuevo `eventId` y archivar la base anterior; una evolución con varios cuestionarios simultáneos requeriría versionarlos en la base.

El 22/11/2026 se inició `noche-universidades-2026-v2` al actualizar las líneas con las presentaciones del centro. El usuario confirmó que las participaciones anteriores eran solo pruebas. El nuevo identificador separa el progreso local, los códigos y las estadísticas: no se borran las filas anteriores de SQLite/PostgreSQL, pero sus códigos dejan de aparecer en el panel de la edición nueva. Una pestaña con el cuestionario anterior debe recargarse; el servidor rechaza solicitudes con otra edición o sin `eventId`.

## Datos y despliegue

SQLite guarda carrera, respuestas, hash del identificador aleatorio, código y fechas de emisión/canjes en `.data/cinaptic.sqlite`. El código de acceso al panel queda en `.env`; ambos están excluidos de Git. No se piden nombre, correo ni teléfono. El navegador almacena un identificador aleatorio que sirve para recuperar la participación; no se debe compartir.

Con SQLite se necesita un servidor Node con disco persistente, una única instancia y HTTPS. Para Vercel se usa PostgreSQL/Neon, como se detalla abajo. Un alojamiento exclusivamente estático no ejecuta la validación de canjes. No montar múltiples réplicas con bases independientes.

Variables: ver `.env.example`. En producción establecer `COOKIE_SECURE=true`, configurar `ADMIN_PASSWORD` mediante secretos del proveedor y apuntar `DATABASE_PATH` al volumen persistente. La aplicación acepta el `PORT` del alojamiento. El proxy debe preservar el encabezado Host; los POST desde otro origen se rechazan. El límite de solicitudes usa la IP de la conexión, por lo que detrás de un proxy puede ser compartido por todos los visitantes; revisar capacidad y proxy antes de un evento con alta concurrencia.

Conservar una copia de la base antes y después del evento. Detener el proceso antes de copiarla, o usar una herramienta de respaldo de SQLite que incluya correctamente el WAL. No borrar `.data` durante el evento: se perdería el historial que evita dobles canjes. Definir con el centro el plazo de conservación y borrar/archivar la información cuando deje de ser necesaria.

Una vez publicada la URL y configurado `publicUrl`, generar el QR:

```sh
npm run qr -- https://TU-DOMINIO/
```

Se crea `.data/qr-evento.svg`, con margen para impresión. No hay un QR definitivo hasta disponer de una URL real. Probarlo con datos móviles y revisar el flujo de WhatsApp en un teléfono antes de imprimirlo.

### Despliegue en Vercel

El proyecto incluye `api/index.mjs` y `vercel.json`. Para producción hay que crear una integración de Neon desde Vercel y configurar las variables del proyecto:

- `DATABASE_URL`: URL de PostgreSQL proporcionada por la integración de Neon.
- `ADMIN_PASSWORD`: contraseña larga del panel.
- `COOKIE_SECURE=true`.

También puede aparecer como `POSTGRES_URL`; el servidor acepta ambos nombres. El adaptador crea automáticamente las tablas necesarias y conserva participaciones y canjes en PostgreSQL.

En el repositorio de GitHub, importá el proyecto en Vercel y desplegá la rama `main`. El build no necesita una base de datos SQLite local ni disco persistente. No configurés `DATABASE_PATH` en Vercel.

## Verificación

```sh
npm run check
npm test
npm run test:e2e
```

Las pruebas unitarias y de API cubren los 729 recorridos del cuestionario, empates, entradas inválidas, emisión idempotente, acceso privado, autenticación, canjes concurrentes, comprobación del extra, límites de login y persistencia tras reinicio.

Playwright prueba celular de 390 px y escritorio, y verifica también 320 px, navegación por teclado, recuperación del progreso, reintento sin conexión, temas persistentes, logos, confirmación al salir, movimiento reducido, opciones de compartir y el flujo de canje. Las interfaces de portapapeles y compartir se simulan en las pruebas; no se envían mensajes reales. En Windows usa Edge instalado; en otros sistemas instalar Chromium con `npx playwright install chromium`. `PLAYWRIGHT_CHANNEL` permite elegir otro canal instalado. Las pruebas levantan un servidor aislado en `127.0.0.1:3107`, con base en memoria y contraseña exclusiva de pruebas; no tocan los canjes reales.

Capturas y trazas: `test-results/` (excluido de Git). Se verificó la apertura del enlace de compartir como URL; enviar mensajes reales y la cámara de QR requieren prueba manual en el dispositivo del evento.

## Investigación y decisiones pendientes

Fuentes de contenido actualizadas el **22 de noviembre de 2026**:

- [Presentación del centro](https://docs.google.com/presentation/d/1iyTOjAheFD68h1qAUI5tS8mrYE54-Kc2/edit): diapositivas 12 y 14–26, proyectos y su pertenencia a cada línea.
- [Kickoff de becarios y becarias 2026](https://docs.google.com/presentation/d/1VVgYc6qEEmgOYjhSbSI_XzcsLNasmylq2L2ON6Tb6-E/edit): diapositivas 8–10, nombres de las tres líneas, temas y proyectos. Ambas presentaciones fueron proporcionadas por el usuario y leídas a través de sus exportaciones PPTX.
- [CInApTIC en UTN FRRe](https://www.frre.utn.edu.ar/secretaria_de_ciencia_y_tecnologia/investigacion/CInApTIC/): se conserva como enlace institucional por indicación del usuario. Su listado de líneas estaba desactualizado al realizar este cambio; las presentaciones tienen prioridad para el contenido del sitio.
- [Carreras de grado de UTN FRRe](https://www.frre.utn.edu.ar/carreras/Carreras_de_Grado/): base para la selección de carreras.

| Línea actual | Contenido reflejado en el sitio y cuestionario |
| --- | --- |
| Comunicaciones | Redes, protocolos, IoT, ciberseguridad y DiMIASA (salud y ambiente). Presentación del centro: 22–25; Kickoff: 9–10. |
| Ingeniería de Software | Requisitos, estimación, calidad de entregables, prácticas ágiles y Gobierno del Dato en organismos públicos del NEA. Presentación del centro: 14–20; Kickoff: 9–10. |
| Sistemas Inteligentes | IA, procesamiento de datos, modelos predictivos, automatización y clasificación de semillas de algodón mediante imágenes. Presentación del centro: 26; Kickoff: 9–10. |

Las preguntas y perfiles lúdicos son una adaptación editorial de los temas de las presentaciones, no un test institucional validado. Se mantuvieron seis preguntas con una opción por línea en cada una, posiciones rotadas, el mismo peso por respuesta y empates explícitos. Gobierno del Dato no se presenta como una línea separada: las presentaciones lo incluyen en Ingeniería de Software.

Pendientes para el evento: contacto de ingreso al centro, revisión del tono y preguntas por el equipo, premios/stock, URL pública con HTTPS y disco persistente, QR final y prueba en la red del lugar. No se cargó una fecha, dirección de stand o cuenta de contacto sin confirmar.
