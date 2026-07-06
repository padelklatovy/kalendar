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
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: "",

  // --- Živé propojení na "Chybí nám hráč" (Open Match) ---
  // Toto je JIŽ ŽIVÝ, samostatný projekt (github.com/padelklatovy/chybi-nam-hrac).
  // Kalendář si odtud jen ČTE otevřené hry (žádný zápis) a kategorii
  // "Open Match" jimi automaticky naplní. Nic tu neměň, pokud
  // nezakládáš úplně nový projekt "Chybí nám hráč".
  CHYBI_NAM_HRAC_SUPABASE_URL: "https://yynkcxanfglptmznkiwx.supabase.co",
  CHYBI_NAM_HRAC_SUPABASE_ANON_KEY: "sb_publishable_DY2iR5z1GmK_-jb7XVa0hw_Z_6uNYzo",
  CHYBI_NAM_HRAC_URL: "https://padelklatovy.github.io/chybi-nam-hrac/",

  // --- Rychlé odkazy na ostatní klubové appky ---
  BAR_APP_URL: "https://padelklatovy.github.io/padel-klatovy-bar/",
  ZDRAVY_HRAC_APP_URL: "https://padelklatovy.github.io/zdravyhrac/"
};
