/**
 * OPEN MATCH SERVICE — most na Open Matches z appky Rezervace kurtů (CORE)
 * ---------------------------------------------------------------------
 * PŮVODNĚ tohle četlo ze samostatné appky "Chybí nám hráč" (jiný Supabase
 * projekt). Ta appka je ZRUŠENÁ. Open Match teď žije v appce Rezervace
 * kurtů jako plnohodnotná rezervace s vlastní platbou — tenhle soubor
 * čte tabulky `reservations` + `open_matches` + `open_match_players`
 * ve STEJNÉM Supabase projektu, který už Kalendář používá (viz config.js,
 * SUPABASE_URL/SUPABASE_ANON_KEY jsou ty samé, žádné nové přihlašovací
 * údaje nejsou potřeba).
 *
 * Toto je JEN ČTENÍ. Kalendář sem nic nezapisuje.
 *
 * Skutečné "přidat se" vede do appky Rezervace kurtů (CORE),
 * konkrétně na záložku Open Matches (?tab=openmatches).
 *
 * Pokud se načtení nepovede (výpadek sítě, ...), appka potichu
 * spadne zpět na to, co má v `events` (prázdno, nebo ručně zadaný
 * záznam v adminu).
 */
const OpenMatchService = (function () {
  const LEVEL_LABELS = { D2: "D2 — Začátečník", D1: "D1 — Začátečník+", C2: "C2 — Mírně pokročilý", C1: "C1 — Mírně pokročilý+", B2: "B2 — Pokročilý", B1: "B1 — Pokročilý+", A: "A — Závodní" };

  function client() {
    const cfg = window.APP_CONFIG || {};
    if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY || !window.supabase) return null;
    try {
      return window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
    } catch (err) {
      console.warn("OpenMatchService: nepodařilo se vytvořit klienta.", err);
      return null;
    }
  }

  function formatHour(h) {
    if (h === null || h === undefined) return "";
    const hh = Math.floor(h);
    const mm = Math.round((h - hh) * 60);
    return String(hh).padStart(2, "0") + ":" + String(mm).padStart(2, "0");
  }

  function mapRowToEvent(row) {
    const om = (row.open_matches && row.open_matches[0]) || null;
    const joined = om ? (om.open_match_players || []).length : 0;
    const needed = om ? om.players_needed : 2;
    const missing = Math.max(needed - joined, 0);
    const levelLabel = om && LEVEL_LABELS[om.level] ? LEVEL_LABELS[om.level] : (om ? om.level : "");
    const isFull = missing === 0;

    const venueName = row.venues ? row.venues.name : "";
    const courtName = row.courts ? row.courts.name : "";

    const tags = [];
    if (levelLabel) tags.push(levelLabel);
    tags.push("pro registrované");

    return {
      id: "openmatch-" + row.id,
      name: "Otevřený zápas",
      category: "open_match",
      date: row.date,
      time_from: formatHour(row.start_hour),
      time_to: formatHour(row.end_hour),
      location: [venueName, courtName].filter(Boolean).join(" · "),
      description_short: isFull ? "Sestava je plná." : `Hledáme ještě ${missing} ${missing === 1 ? "hráče" : "hráčů"}.`,
      description_long: "",
      capacity: needed,
      signed_up_count: joined,
      price: 0,
      is_free: true,
      organizer: row.organizer_name || "Hráč",
      phone: row.organizer_phone || "",
      whatsapp: "",
      photo_url: "",
      tags: tags,
      schedule: [],
      what_to_bring: "Raketu, obuv na padel",
      status: isFull ? "plno" : missing <= 1 ? "posledni_mista" : "otevreno",
      visibility: "verejne",
      _source: "core-openmatch",
    };
  }

  async function getOpenMatchEvents() {
    const sb = client();
    if (!sb) return [];
    try {
      const todayIso = new Date().toISOString().slice(0, 10);
      const { data, error } = await sb
        .from("reservations")
        .select("*, venues(name), courts(name), open_matches(*, open_match_players(*))")
        .eq("is_open_match", true)
        .eq("status", "paid_confirmed")
        .gte("date", todayIso)
        .order("date", { ascending: true });
      if (error) throw error;
      return (data || []).map(mapRowToEvent);
    } catch (err) {
      console.warn("OpenMatchService: nepodařilo se načíst otevřené zápasy z Rezervací, appka pokračuje bez nich.", err);
      return [];
    }
  }

  return { getOpenMatchEvents };
})();
