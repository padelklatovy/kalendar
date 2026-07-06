/**
 * OPEN MATCH SERVICE — most na živá data "Chybí nám hráč"
 * ---------------------------------------------------------
 * Toto je JEN ČTENÍ. Kalendář sem nic nezapisuje a nijak
 * neovlivňuje appku "Chybí nám hráč" — je to jen zrcadlo jejích
 * otevřených her do kategorie "Open Match".
 *
 * Skutečné "přidat se"/"vytvořit hru" akce vedou zpět do
 * https://padelklatovy.github.io/chybi-nam-hrac/, kde běží
 * originální (jednodušší, bez účtů) mechanismus — nepřepisujeme ho.
 *
 * Pokud se načtení nepovede (výpadek sítě, CORS, ...), appka
 * potichu spadne zpět na to, co má v `events` (ať je to prázdno,
 * nebo záložní ručně zadaná akce v admin/sample datech).
 */
const OpenMatchService = (function () {
  const LEVEL_LABELS = { mix: "Nezáleží", A: "A", B1: "B1", B2: "B2", C1: "C1", C2: "C2", D1: "D1", D2: "D2" };

  function client() {
    const cfg = window.APP_CONFIG || {};
    if (!cfg.CHYBI_NAM_HRAC_SUPABASE_URL || !cfg.CHYBI_NAM_HRAC_SUPABASE_ANON_KEY || !window.supabase) return null;
    try {
      return window.supabase.createClient(cfg.CHYBI_NAM_HRAC_SUPABASE_URL, cfg.CHYBI_NAM_HRAC_SUPABASE_ANON_KEY);
    } catch (err) {
      console.warn("OpenMatchService: nepodařilo se vytvořit klienta.", err);
      return null;
    }
  }

  function mapRowToEvent(row) {
    const levelLabel = LEVEL_LABELS[row.level] || row.level || "mix";
    const isFull = row.status === "full" || row.needed === 0;
    const title = row.type && row.type !== "volná hra" ? row.type : "Otevřený zápas";

    const tags = [];
    if (levelLabel !== "Nezáleží") tags.push("úroveň " + levelLabel);
    if (row.type) tags.push(row.type);
    tags.push("pro členy");

    return {
      id: "openmatch-" + row.id,
      name: title,
      category: "open_match",
      date: row.date,
      time_from: (row.time || "").slice(0, 5),
      time_to: "",
      location: row.court || "Kurt (upřesní se ve hře)",
      description_short: isFull
        ? "Sestava je plná."
        : `Hledáme ještě ${row.needed} ${row.needed === 1 ? "hráče" : "hráčů"}.${row.note ? " " + row.note : ""}`,
      description_long: row.note || "",
      capacity: null,
      signed_up_count: 0,
      price: 0,
      is_free: true,
      organizer: row.creator || "Hráč",
      phone: "",
      whatsapp: "",
      photo_url: "",
      tags: tags,
      schedule: [],
      what_to_bring: "Raketu, obuv na padel",
      status: isFull ? "plno" : row.needed <= 1 ? "posledni_mista" : "otevreno",
      visibility: "verejne",
      _source: "chybi-nam-hrac",
    };
  }

  async function getOpenMatchEvents() {
    const sb = client();
    if (!sb) return [];
    try {
      const { data, error } = await sb
        .from("matches")
        .select("*")
        .neq("status", "closed")
        .order("date", { ascending: true })
        .order("time", { ascending: true });
      if (error) throw error;
      return (data || []).map(mapRowToEvent);
    } catch (err) {
      console.warn("OpenMatchService: nepodařilo se načíst živé otevřené hry, appka pokračuje bez nich.", err);
      return [];
    }
  }

  return { getOpenMatchEvents };
})();
