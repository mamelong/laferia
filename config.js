/* =====================================================================
   AJUSTES DE LA TIENDA · La Feria
   Este es el único archivo que necesitás tocar para cambiar datos de
   contacto, pago, envíos o textos. Cambiá solo lo que está entre comillas
   o los números, y no borres las comas del final de cada línea.
   ===================================================================== */
window.LAFERIA_CONFIG = {

  /* --- Catálogo ---------------------------------------------------------
     Link CSV de tu planilla de Google Sheets
     (Archivo → Compartir → Publicar en la Web → elegí la hoja → "Valores
     separados por comas (.csv)" → Publicar, y pegá el link acá).
     Si lo dejás vacío, la tienda usa el archivo catalogo.csv del sitio. */
  sheetCsvUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRAbSfYHAqD35hKIo66x4cit8AFLpJcfgxFafS1zF3I0kvAKIOlCQiweasdIZpa7jWMKXYtNTvcHNC6/pub?gid=1132895453&single=true&output=csv",

  /* --- Reservas automáticas ---------------------------------------------
     Link de la "Aplicación web" de Apps Script (termina en /exec).
     Con este link la tienda lee la planilla en vivo y, cuando alguien envía
     un pedido, marca sus prendas como "Reservada" para todas las visitas.
     Si lo dejás vacío, la tienda funciona igual pero sin reservas automáticas. */
  scriptUrl: "https://script.google.com/macros/s/AKfycbxTiO2S1HU0I3ABlpubBHql4vGHT1pbscVeea1GHWrfsqCn9r7OcJ1wex838ISDutEm/exec",

  /* --- Contacto ------------------------------------------------------- */
  // Con código de país, sin espacios ni signos: 549 + código de área sin 0 + número sin 15.
  whatsapp: "5493413700209",
  instagram: "laferiarosario_",

  /* --- Pago por transferencia ---------------------------------------- */
  alias: "laferia.rosario",
  titular: "Valentina Maria Fox",

  /* --- Envíos (en pesos) --------------------------------------------- */
  shipLocal: 6000,       // Envío dentro de Rosario
  shipNational: 10000,   // Envío resto del país - Correo Argentino

  /* --- Fotos ----------------------------------------------------------
     Subí las fotos a la carpeta "fotos" con el código de la prenda:
     AD001-1.jpg (portada), AD001-2.jpg, AD001-3.jpg… */
  photoExt: "jpg",

  /* --- Textos de la página ------------------------------------------- */
  texts: {
    logo: "La Feria",
    tagline: "Moda circular",
    heroTitle: "Ropa que ya tuvo una vida. Lista para una nueva historia.",
    heroLead: "Prendas de segunda mano, revisadas una por una y medidas a mano. Cada pieza es única: si la ves acá, todavía está.",
    fact1: "Piezas únicas",
    fact2: "Medidas reales",
    fact3: "Retiro o envío",
    howTitle: "Cómo comprar",
    step1Title: "Elegí tus prendas",
    step1Text: "Mirá las medidas de cada una y agregalas a tu pedido.",
    step2Title: "Mandá el pedido por WhatsApp",
    step2Text: "Seleccioná envío a domicilio o retiro por Pick Up Point.",
    step3Title: "Coordinamos pago y entrega",
    step3Text: "Te confirmamos disponibilidad y acordamos retiro o envío.",
    noReturns: "No se aceptan cambios ni devoluciones.",
    footer: "La Feria · Moda circular · Rosario",
    cartEmpty: "Todavía no agregaste prendas. Cada una es única, así que conviene reservarla antes de que se vaya."
  }
};
