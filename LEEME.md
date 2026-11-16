# La Feria · tienda online

Sitio estático (sin servidor) para Vercel. Los pedidos llegan por WhatsApp.

| Archivo | Para qué sirve |
|---|---|
| `config.js` | **El único que vas a tocar seguido**: WhatsApp, Instagram, alias, envíos, textos y link de la planilla |
| `catalogo.csv` | Catálogo de respaldo (se usa mientras no pegues el link de Google Sheets) |
| `fotos/` | Fotos de las prendas, nombradas por código: `AD001-1.jpg`, `AD001-2.jpg`… |
| `img/` | Logo, favicon e imagen para compartir el link |
| `index.html`, `app.js`, `styles.css` | La tienda (no hace falta tocarlos) |

## Planilla de Google Sheets

Columnas (la primera fila lleva estos títulos, el orden no importa):

`Código, Nombre, Marca, Categoría, Talle, Estado, Precio, Medidas, Disponibilidad, Fotos`

- **Obligatorias:** Nombre y Precio. Usá siempre Código: con él se buscan las fotos.
- **Disponibilidad:** `Disponible`, `Reservada`, `Vendida` u `Oculta` (no se muestra).
- **Estado:** `Como nueva`, `Muy buena` o `Buena`.
- **Categoría:** Vestidos, Remeras y camisas, Abrigos, Jeans y polleras, Accesorios. Si escribís otra, se crea sola.
- **Fotos:**
  - vacía → se muestra `fotos/CODIGO-1.jpg` si existe
  - un número, ej. `3` → `CODIGO-1.jpg`, `CODIGO-2.jpg`, `CODIGO-3.jpg`
  - o nombres/links separados por coma
- Las filas nuevas van **abajo**: "Más nuevo" muestra primero las últimas filas.
- Los cambios en la planilla tardan **unos 5 minutos** en verse (Google lo cachea).

Nombres de fotos: respetá mayúsculas (`AD001-1.jpg` ≠ `ad001-1.JPG`). Ideal: JPG de ~1200 px de lado y menos de 300 KB.
