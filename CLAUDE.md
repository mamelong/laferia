# La Feria · contexto del proyecto

Tienda online de ropa de segunda mano ("moda circular") en Rosario, Argentina.
Los pedidos llegan por **WhatsApp**: no hay checkout, ni pagos online, ni cuentas de usuario.
Sitio en producción: **https://laferiamodacircular.ar**

## Cómo trabajar con la dueña

- **Idioma:** español rioplatense con voseo ("tocá", "subí", "fijate"), tanto en la web como en las respuestas.
- **No es programadora.** Usa la interfaz web de GitHub (Add file → Upload files, o el lápiz para editar) y los paneles de Vercel, Google Sheets y nic.ar. No usa terminal ni git.
- **Cómo se entregan los cambios:** se le pasan los archivos modificados, idealmente en un `.zip`, porque a veces el navegador bloquea la descarga de `.js` sueltos. Ella los sube a GitHub y Vercel publica solo.
- **Instrucciones paso a paso**, con nombres exactos de botones, y siempre con una prueba para confirmar que funcionó.
- **Cambios mínimos y probados.** Antes de entregar, probar en Playwright (ver Pruebas).
- Si pide **"desestimar"** un cambio, revertirlo por completo (código y manual) y entregar el archivo revertido.
- Existe un **manual de usuario** en Claude Docs ("Manual de la tienda · La Feria"). Si cambia algo que ella usa, actualizar también el manual.

## Arquitectura

Sitio **estático sin build**, alojado en Vercel y conectado al repositorio de GitHub `mamelong/laferia`, rama `main`.
Cada commit en `main` despliega automáticamente.

```
Google Sheets (catálogo) ──► Apps Script /exec (lectura en vivo + reservas)
        │                              ▲
        └─ CSV publicado (respaldo)    │ POST reservar
                    ▼                  │
            index.html + app.js  ──────┘
                    │
                    └─► wa.me/<número>?text=<pedido armado>
```

| Archivo | Rol |
|---|---|
| `index.html` | Head con SEO y Open Graph, favicon y JSON-LD de ClothingStore. Carga `config.js` y `app.js` |
| `config.js` | **Lo único que edita la dueña:** URLs de la planilla y el script, WhatsApp, Instagram, alias y titular, costos de envío, textos de la página |
| `app.js` | Toda la lógica de la tienda (IIFE en ES5, sin dependencias) |
| `styles.css` | Estilos con variables CSS en `:root` |
| `catalogo.csv` | Catálogo de respaldo, usado solo si `sheetCsvUrl` está vacío |
| `fotos/` | Fotos por código: `CODIGO-1.jpg`, `CODIGO-2.jpg`… |
| `img/` | `favicon.svg`, `favicon-32.png`, `apple-touch-icon.png`, `og.jpg` (1200×630) |
| `apps-script/reservas.gs` | Copia de referencia del Apps Script. **El que corre está pegado en la planilla** (Extensiones → Apps Script) |
| `vercel.json` | `cleanUrls`; sin caché para `config.js`, `app.js` y `catalogo.csv`; encabezados de seguridad básicos |
| `robots.txt`, `sitemap.xml` | SEO para el dominio |
| `LEEME.md` | Guía corta para la dueña |

### Infraestructura

- **Dominio:** `laferiamodacircular.ar`, registrado en nic.ar y delegado a `ns1.vercel-dns.com` y `ns2.vercel-dns.com`. Está en Vercel como dominio principal; `www` redirige con 308 al dominio sin www.
- **Vercel:** proyecto `laferia`, plan Hobby, Framework "Other", sin build. Si algo se rompe: Overview → **Instant Rollback**.
- **Planilla:** link CSV publicado en `config.sheetCsvUrl` (pestaña `gid=1132895453`).
- **Apps Script:** implementado como Aplicación web, ejecuta como la dueña, acceso "Cualquier usuario". La URL `/exec` está en `config.scriptUrl`. Si se cambia el script, usar **Administrar implementaciones → editar → Nueva versión** para que la URL no cambie.

## Catálogo (planilla)

Columnas, reconocidas por el título, en cualquier orden y sin importar acentos ni mayúsculas:
`Código, Nombre, Marca, Categoría, Talle, Estado, Precio, Medidas, Disponibilidad, Fotos, Reservado el`

- **Obligatorias:** Nombre y Precio. Una fila sin ellas no se muestra.
- **Código:** libre, sin formato fijo. Se pasa a mayúsculas y se le quitan los espacios. Un código vacío o duplicado se reemplaza por `FILA<n>`, y esa prenda no tiene fotos. Para que la reserva automática funcione: hasta 20 caracteres de `A-Z`, `0-9` o `-` (regex en el Apps Script).
- **Disponibilidad:**

  | Valor | Resultado |
  |---|---|
  | `Disponible` o vacío | A la venta |
  | `Reservada` | Visible, no se puede agregar |
  | `Vendida` (o "agotada", "no") | Visible en gris, al final del catálogo |
  | `Oculta` (o "no publicar", "borrador") | No se muestra |

- **Estado:** Como nueva / Muy buena / Buena.
- **Fotos:**
  - vacío → `fotos/CODIGO-1.jpg`
  - un número N → `CODIGO-1` … `CODIGO-N` (máximo 6)
  - si no, una lista de nombres o URLs separados por coma
  - **Extensión flexible:** si `CODIGO-1.jpg` no existe, la web prueba sola `.jpeg`, `.JPG`, `.JPEG`, `.png`, `.PNG` y `.webp` (manejador `error`, atributos `data-orig` y `data-tried`). La que encuentra queda en memoria (`photoFound`) para no volver a buscar al redibujar. Se agregó porque la dueña subió `AD001-1.jpeg` y no aparecía.
  - El **nombre base** sí respeta mayúsculas: el código va siempre en mayúsculas.
  - Si la imagen no existe con ninguna extensión, se oculta y queda el dibujo SVG de la prenda (el `shape` se adivina por el nombre).
- **Orden "Más nuevo":** por número de fila, de abajo hacia arriba. Las prendas nuevas van al final de la planilla.
- **Categoría:** primero se busca coincidencia exacta con una categoría existente. Si no hay, se aplican las reglas por palabra clave de `CAT_RULES` (por ejemplo, "Buzos" o "Camperas" van a Abrigos y "Carteras" a Accesorios). Si tampoco hay coincidencia, se crea una categoría nueva en el filtro.
  - Se intentó cambiar esto para que cualquier nombre no exacto creara su propio filtro, y **la dueña pidió desestimarlo**. No reintroducirlo sin que lo pida.
- **Columna "Reservado el":** la crea y completa el Apps Script.

## Reservas automáticas (decisiones de diseño)

- La **planilla es la única fuente de verdad.** Si `scriptUrl` está configurado, **no** se usan reservas locales del navegador: `loadHolds()` devuelve `{}`.
  - Antes había un bug: el celular que hacía el pedido seguía viendo la prenda Reservada durante 48 horas aunque la dueña la liberara.
  - Las reservas locales con vencimiento de 48 horas (`HOLD_HOURS`) solo se usan si no hay `scriptUrl`.
- **Flujo del cliente:**
  1. **"Enviar pedido por WhatsApp"** → valida el envío → **vuelve a leer el catálogo en vivo**. Si alguna prenda ya no está, la saca del carrito y avisa. Si todo está libre, muestra la ventana con alias y titular.
  2. **"Ya transferí, enviar por WhatsApp"** es un `<button>`. Hace esto:
     1. Abre `window.open("")` de forma sincrónica, para evitar el bloqueador de pop-ups.
     2. Hace POST al script `{action:"reserve", codes}`.
     3. Si sale bien, lleva la pestaña a `wa.me` y vacía el carrito.
     4. Si responde `taken`, cierra la pestaña, saca esas prendas del carrito y muestra "No transfieras todavía".
     5. Si hay un error de red o del servidor, **igual envía** el pedido (fail-open), y la dueña confirma a mano.
- **El POST** va sin encabezados, con body string (`text/plain`), para no disparar el preflight de CORS que Apps Script no maneja.
- **Las reservas NO vencen solas** (decisión de la dueña). Ella pasa la prenda a `Vendida` si le pagaron o a `Disponible` si no.
- **El Apps Script:**
  - Usa `LockService` contra pedidos simultáneos.
  - Reserva todo o nada: si alguna prenda ya está tomada, no reserva ninguna.
  - Acepta como máximo 15 prendas por pedido.
  - `doGet` devuelve `{ok, rows}` usando `getDisplayValues`.
- **Lectura del catálogo:**
  - Primero el script. Si falla, el CSV publicado, que Google cachea unos 5 minutos. Si falla, el último catálogo guardado en `localStorage` (`laferia-catalogo-cache-v2`).
  - Se refresca cada 60 segundos y al volver a la pestaña, salvo durante el pago.

## Mensaje de WhatsApp

Formato acordado: emoji solo en el saludo y en el detalle; **"Datos de envío" va sin emoji**. Los asteriscos son negrita de WhatsApp.

```
Hola! 👋 Quiero reservar estas prendas de La Feria:

*Detalle del pedido* 🛍️
- Nombre (talle M) $ 38.000 [AD002]
--------------------
*Datos de envío*
*Medio de envío:* Envío dentro de Rosario ($ 6.000)
*Nombre y apellido:* …   (dirección, localidad y CP solo si hay envío)
--------------------
*Total:* $ 44.000
```

Opciones de envío: "Envío dentro de Rosario" (`shipLocal`), "Envío resto del país - Correo Argentino" (`shipNational`) y "Pick Up Point - Fisherton" (gratis). Con envío a domicilio son obligatorios nombre, dirección, localidad y CP.

## Diseño

- Minimalista: fondo blanco, tipografía **Archivo** (Google Fonts, pesos 300/400/500), mayúsculas con espaciado amplio, botones rectos (`border-radius: 0`), grilla de 2, 3 o 4 columnas según el ancho.
- **Siempre claro:** se quitó el modo oscuro a pedido de la dueña. `color-scheme: light` en `:root` y `<meta name="color-scheme" content="light">`. No volver a agregar `prefers-color-scheme: dark`.
- Los colores se definen como variables en `:root` (`--paper`, `--ink`, `--muted`, `--accent`, `--tile-bg`…).
- `[hidden] { display: none !important; }` es imprescindible: `.modal` y `.drawer` tienen `display`, y sin esa regla las ventanas ocultas tapan los botones.
- Los textos de la página salen de `config.texts`. No hay edición desde la web: el panel de administración del Artifact original se eliminó porque dependía de `window.claude`.

## Historia

- El sitio nació como un Artifact de Claude (`La_FeriaV4.html`), con un panel de administración que solo funcionaba en claude.ai.
- Se migró a un sitio estático, con catálogo en Google Sheets y fotos por código, y se publicó en Vercel con el dominio propio.
- Después se agregaron las reservas automáticas con Apps Script.

## Pruebas

- Servidor local: `python3 -m http.server` en una **copia** del sitio, con `sheetCsvUrl` y `scriptUrl` vacíos (usa `catalogo.csv`), o con `scriptUrl` apuntando a un **mock** en Node que imite `doGet` y `doPost` (incluida la respuesta `taken` y la cabecera `Access-Control-Allow-Origin: *`).
- Playwright con Chromium preinstalado. Hacer `route` de `wa.me` para capturar el mensaje. Usar dos contextos para simular clientas simultáneas.
- Verificar como mínimo:
  - el carrito
  - la validación del envío
  - el texto del mensaje
  - el conflicto de reserva entre dos clientas
  - que una reserva liberada en la planilla vuelva a verse disponible
  - que no haya errores de JS
- Validar la sintaxis con `node -e "require('vm').createScript(require('fs').readFileSync('app.js','utf8'))"`.
- El entorno de Claude puede no tener acceso a docs.google.com ni a script.google.com: en ese caso, decirlo y pedirle a la dueña que pruebe el link en su navegador.

## Pendientes y pedidos conocidos

- Algunas medidas de las prendas importadas parecían datos de ejemplo (pantalón oxford, sweater gris, remera de volados). La dueña tiene que corregirlas en la planilla.
- Ideas ofrecidas y no hechas: consultar una prenda puntual por WhatsApp, link directo a cada prenda, alta en Google Search Console, optimización de fotos.
- En el manual quedó un comentario preguntando si quiere fijar un plazo para esperar el pago.
