/**
 * DATOVÁ VRSTVA
 * ---------------------------------------------
 * Supabase (pokud je nastavené v config.js), jinak DEMO režim:
 * výchozí data ze sample-data.js, změny z administrace se ukládají
 * do localStorage tohoto prohlížeče (klíč "padelKalendarDemoEvents").
 */
const DataService = (function () {
  const LOCAL_KEY = "padelKalendarDemoEvents";
  let supabaseClient = null;

  function init() {
    const cfg = window.APP_CONFIG || {};
    if (cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase) {
      try {
        supabaseClient = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
      } catch (err) {
        console.error("Nepodařilo se inicializovat Supabase, přepínám do DEMO režimu.", err);
        supabaseClient = null;
      }
    }
  }

  function isDemoMode() {
    return !supabaseClient;
  }

  function readLocal() {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (raw) return JSON.parse(raw);
    } catch (err) {
      console.warn("Nepodařilo se načíst lokální data, používám vzorová data.", err);
    }
    const seed = JSON.parse(JSON.stringify(window.SAMPLE_EVENTS || []));
    localStorage.setItem(LOCAL_KEY, JSON.stringify(seed));
    return seed;
  }

  function writeLocal(events) {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(events));
  }

  function uid() {
    return "evt-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
  }

  async function getEvents({ includeHidden = false } = {}) {
    if (supabaseClient) {
      let query = supabaseClient.from("events").select("*").order("date", { ascending: true });
      if (!includeHidden) query = query.eq("visibility", "verejne");
      const { data, error } = await query;
      if (error) {
        console.error("Chyba při načítání akcí ze Supabase:", error);
        return [];
      }
      return data || [];
    }
    const all = readLocal();
    const sorted = [...all].sort((a, b) => (a.date < b.date ? -1 : 1));
    return includeHidden ? sorted : sorted.filter((e) => e.visibility === "verejne");
  }

  async function addEvent(event) {
    if (supabaseClient) {
      const { data, error } = await supabaseClient.from("events").insert([event]).select();
      if (error) throw error;
      return data[0];
    }
    const all = readLocal();
    const newEvent = { ...event, id: uid() };
    all.push(newEvent);
    writeLocal(all);
    return newEvent;
  }

  async function updateEvent(id, updates) {
    if (supabaseClient) {
      const { data, error } = await supabaseClient.from("events").update(updates).eq("id", id).select();
      if (error) throw error;
      return data[0];
    }
    const all = readLocal();
    const idx = all.findIndex((e) => e.id === id);
    if (idx === -1) throw new Error("Akce nenalezena.");
    all[idx] = { ...all[idx], ...updates };
    writeLocal(all);
    return all[idx];
  }

  async function deleteEvent(id) {
    if (supabaseClient) {
      const { error } = await supabaseClient.from("events").delete().eq("id", id);
      if (error) throw error;
      return true;
    }
    const all = readLocal().filter((e) => e.id !== id);
    writeLocal(all);
    return true;
  }

  return { init, isDemoMode, getEvents, addEvent, updateEvent, deleteEvent };
})();
