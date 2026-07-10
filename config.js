/**
 * KONFIGURACE — PADEL KLATOVY / Klubový kalendář
 * ---------------------------------------------
 * Kontakty a odkaz na mapu jsou předvyplněné podle padelklatovy.cz.
 * Uprav, pokud se něco změní. ADMIN_PASSWORD si prosím změň.
 */
window.APP_CONFIG = {
  // Výchozí telefon/WhatsApp klubu (z padelklatovy.cz)
  WHATSAPP_NUMBER: "420602431363",
  CLUB_PHONE: "+420 602 431 363",
  CLUB_EMAIL: "info@padelklatovy.cz",
  CLUB_ADDRESS: "Centrum míčových sportů, U Elektrárny 917, 339 01 Klatovy",

  // Odkaz na mapu (stejný, jaký klub používá na svém webu)
  MAP_URL: "https://mapy.cz/zakladni?source=firm&id=12747454&ds=1&x=13.2789700&y=49.3885772&z=17",

  // Heslo do administrace. ZMĚŇ PŘED NASAZENÍM!
  ADMIN_PASSWORD: "zmenteHeslo2026",

  // --- Supabase pro VLASTNÍ akce kalendáře (volitelné) ---
  // Necháš-li prázdné, aplikace běží v DEMO režimu (viz sample-data.js
  // + localStorage). Klidně použij stejný Supabase projekt jako
  // u Hubu / BAR appky (zlgqsndoreimophthvpw) — tabulka "events" si
  // s ostatními tabulkami nekoliduje, viz schema.sql.
  SUPABASE_URL: "https://ppntayyhksqgsxmemvaj.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_lFkYMLqXgmRGx0T5c-T9wg_h9V_BeKa",

  // --- Open Match ---
  // PŮVODNĚ zde bylo živé napojení na samostatnou appku "Chybí nám hráč"
  // (github.com/padelklatovy/chybi-nam-hrac). Ta appka je od teď ZRUŠENÁ —
  // kategorie "Open Match" se teď plní z appky Rezervace kurtů (CORE),
  // která běží nad stejným Supabase projektem jako tenhle Kalendář
  // (žádné nové přihlašovací údaje netřeba, viz openmatch-service.js).
  CORE_APP_URL: "https://padelklatovy.github.io/padel-klatovy-core/",

  // --- Rychlé odkazy na ostatní klubové appky ---
  BAR_APP_URL: "https://padelklatovy.github.io/padel-klatovy-bar/",
  ZDRAVY_HRAC_APP_URL: "https://padelklatovy.github.io/zdravyhrac/"
};
