/**
 * ADMINISTRACE — přidávání, úprava, duplikace, mazání akcí
 */
(function () {
  const CATEGORIES = [
    { slug: "turnaj", label: "🎾 Turnaj" },
    { slug: "komunita", label: "👥 Komunita" },
    { slug: "prednaska", label: "🧠 Přednáška / Workshop" },
    { slug: "trenink", label: "💪 Trénink" },
    { slug: "open_match", label: "🏓 Open Match" },
    { slug: "zdravy_hrac", label: "❤️ Zdravý hráč" },
    { slug: "firemni", label: "🤝 Firemní akce" },
    { slug: "klubovy_zivot", label: "🎬 Klubový život" },
  ];

  const STATUS_OPTIONS = [
    { slug: "otevreno", label: "Otevřeno" },
    { slug: "posledni_mista", label: "Poslední místa" },
    { slug: "plno", label: "Plno" },
    { slug: "zruseno", label: "Zrušeno" },
    { slug: "probehlo", label: "Proběhlo" },
  ];

  const SESSION_KEY = "padelAdminAuthed";
  let events = [];

  // ---------- PROPOJENÍ NA REZERVACE (CORE app, tabulka reservations/venues/courts) ----------
  let coreClient = null;
  let venuesData = []; // [{id, name, club_id, courts:[{id,name}]}]
  let CORE_CLUB_ID = null;

  async function initCoreLink() {
    const cfg = window.APP_CONFIG || {};
    if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY || !window.supabase) return;
    try {
      coreClient = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
      const { data: clubs } = await coreClient.from("clubs").select("id").limit(1);
      CORE_CLUB_ID = clubs && clubs[0] ? clubs[0].id : null;
      const { data: venues, error } = await coreClient.from("venues").select("id, name, courts(id, name)").order("name");
      if (error) { console.error("Nepodařilo se načíst hřiště/kurty z Rezervací:", error); return; }
      venuesData = venues || [];
    } catch (err) {
      console.error("Napojení na Rezervace se nepovedlo:", err);
    }
  }

  function timeToDecimal(t) {
    if (!t) return null;
    const [h, m] = t.split(":").map(Number);
    return h + (m || 0) / 60;
  }

  async function findLinkedReservation(eventId) {
    if (!coreClient || !eventId) return null;
    const { data, error } = await coreClient.from("reservations").select("*").eq("source_event_id", eventId)
      .not("status", "in", "(cancelled_by_user,cancelled_by_admin)").maybeSingle();
    if (error) { console.error(error); return null; }
    return data;
  }

  async function syncCourtBlock(eventRow, formEl) {
    const shouldBlock = formEl.querySelector('[name="block_court"]').checked;
    const venueId = formEl.querySelector('[name="block_venue"]').value;
    const courtId = formEl.querySelector('[name="block_court_id"]').value;
    const existing = await findLinkedReservation(eventRow.id);

    if (!shouldBlock) {
      if (existing) {
        await coreClient.from("reservations").update({ status: "cancelled_by_admin" }).eq("id", existing.id);
      }
      return;
    }
    if (!venueId || !courtId) return; // nevybráno, nic nedělej

    const startHour = timeToDecimal(eventRow.time_from);
    const endHour = timeToDecimal(eventRow.time_to);
    const payload = {
      club_id: CORE_CLUB_ID, venue_id: venueId, court_id: courtId,
      date: eventRow.date, start_hour: startHour, duration_hours: endHour - startHour, end_hour: endHour,
      type: "club_event", status: "club_blocked", event_name: eventRow.name,
      source_event_id: eventRow.id, created_by: "kalendar_admin"
    };
    if (existing) {
      await coreClient.from("reservations").update(payload).eq("id", existing.id);
    } else {
      await coreClient.from("reservations").insert(payload);
    }
  }

  function blockCourtFieldsHTML(pre) {
    const checked = pre && pre.checked ? "checked" : "";
    const venueOptions = venuesData.map(v => `<option value="${v.id}" ${pre && pre.venueId === v.id ? "selected" : ""}>${escapeHtml(v.name)}</option>`).join("");
    return `
      <div class="form-section-label">Propojení s Rezervacemi kurtů</div>
      <div class="form-field full">
        <label class="form-checkbox"><input type="checkbox" name="block_court" id="blockCourtCheck" ${checked}/> Blokovat kurt v appce Rezervace po dobu akce</label>
      </div>
      <div class="form-field" id="blockVenueField" style="${checked ? "" : "display:none;"}">
        <label>Hřiště</label>
        <select name="block_venue" id="blockVenueSelect"><option value="">— vyber —</option>${venueOptions}</select>
      </div>
      <div class="form-field" id="blockCourtField" style="${checked ? "" : "display:none;"}">
        <label>Kurt</label>
        <select name="block_court_id" id="blockCourtSelect"><option value="">— nejdřív vyber hřiště —</option></select>
      </div>`;
  }

  function wireBlockCourtFields(pre) {
    const checkEl = document.getElementById("blockCourtCheck");
    const venueField = document.getElementById("blockVenueField");
    const courtField = document.getElementById("blockCourtField");
    const venueSel = document.getElementById("blockVenueSelect");
    const courtSel = document.getElementById("blockCourtSelect");
    if (!checkEl) return;

    function fillCourts(venueId, selectedCourtId) {
      const v = venuesData.find(v => v.id === venueId);
      const courts = v ? v.courts : [];
      courtSel.innerHTML = courts.map(c => `<option value="${c.id}" ${selectedCourtId === c.id ? "selected" : ""}>${escapeHtml(c.name)}</option>`).join("") || `<option value="">Žádné kurty</option>`;
    }
    checkEl.addEventListener("change", () => {
      venueField.style.display = checkEl.checked ? "" : "none";
      courtField.style.display = checkEl.checked ? "" : "none";
    });
    venueSel.addEventListener("change", () => fillCourts(venueSel.value, null));
    if (pre && pre.venueId) fillCourts(pre.venueId, pre.courtId);
  }

  const el = {
    loginScreen: document.getElementById("loginScreen"),
    loginForm: document.getElementById("loginForm"),
    passwordInput: document.getElementById("passwordInput"),
    loginError: document.getElementById("loginError"),
    dashboard: document.getElementById("dashboard"),
    logoutBtn: document.getElementById("logoutBtn"),
    demoNote: document.getElementById("adminDemoNote"),
    addBtn: document.getElementById("addEventBtn"),
    list: document.getElementById("adminList"),
    formOverlay: document.getElementById("formOverlay"),
    formSheet: document.getElementById("formSheet"),
  };

  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function categoryLabel(slug) {
    const c = CATEGORIES.find((c) => c.slug === slug);
    return c ? c.label : slug;
  }

  function statusLabel(slug) {
    const s = STATUS_OPTIONS.find((s) => s.slug === slug);
    return s ? s.label : slug;
  }

  function parseTagsInput(str) {
    return (str || "").split(",").map((s) => s.trim()).filter(Boolean);
  }
  function serializeTags(arr) { return (arr || []).join(", "); }

  function parseScheduleInput(str) {
    return (str || "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const idx = line.indexOf(" - ");
        if (idx === -1) return { time: "", item: line };
        return { time: line.slice(0, idx).trim(), item: line.slice(idx + 3).trim() };
      });
  }
  function serializeSchedule(arr) { return (arr || []).map((s) => `${s.time} - ${s.item}`).join("\n"); }

  // ---------- AUTH ----------

  function showDashboard() {
    el.loginScreen.hidden = true;
    el.dashboard.hidden = false;
    el.demoNote.hidden = !DataService.isDemoMode();
    loadEvents();
  }
  function showLogin() { el.dashboard.hidden = true; el.loginScreen.hidden = false; }

  el.loginForm.addEventListener("submit", (evt) => {
    evt.preventDefault();
    const value = el.passwordInput.value;
    const expected = (window.APP_CONFIG && window.APP_CONFIG.ADMIN_PASSWORD) || "";
    if (value && value === expected) {
      sessionStorage.setItem(SESSION_KEY, "1");
      el.loginError.hidden = true;
      showDashboard();
    } else {
      el.loginError.hidden = false;
    }
  });

  el.logoutBtn.addEventListener("click", () => {
    sessionStorage.removeItem(SESSION_KEY);
    showLogin();
  });

  // ---------- LIST ----------

  async function loadEvents() {
    events = await DataService.getEvents({ includeHidden: true });
    renderList();
  }

  function renderList() {
    const sorted = [...events].sort((a, b) => (a.date < b.date ? -1 : 1));
    if (sorted.length === 0) {
      el.list.innerHTML = `<p class="empty-state">Zatím tu nejsou žádné akce. Přidej první přes tlačítko výše.</p>`;
      return;
    }
    el.list.innerHTML = sorted.map(adminRowHTML).join("");
  }

  function adminRowHTML(e) {
    const visBadge =
      e.visibility === "skryte"
        ? `<span class="badge badge-hidden">Skryté</span>`
        : `<span class="badge badge-visible">Veřejné</span>`;
    return `
    <div class="admin-row" data-id="${e.id}">
      <div class="admin-row-top">
        <div class="admin-row-title">${escapeHtml(e.name)}</div>
        ${visBadge}
      </div>
      <div class="admin-row-meta">
        <span>🗓 ${escapeHtml(e.date)}</span>
        <span>🕒 ${escapeHtml(e.time_from)}–${escapeHtml(e.time_to)}</span>
        <span>${categoryLabel(e.category)}</span>
        <span>· ${escapeHtml(statusLabel(e.status))}</span>
      </div>
      <div class="admin-row-actions">
        <button class="btn-mini" data-action="edit" data-id="${e.id}">Upravit</button>
        <button class="btn-mini" data-action="duplicate" data-id="${e.id}">Duplikovat</button>
        <button class="btn-mini" data-action="toggle-full" data-id="${e.id}">${e.status === "plno" ? "Zrušit obsazeno" : "Označit plné"}</button>
        <button class="btn-mini" data-action="toggle-cancel" data-id="${e.id}">${e.status === "zruseno" ? "Obnovit" : "Zrušit akci"}</button>
        <button class="btn-mini" data-action="toggle-past" data-id="${e.id}">${e.status === "probehlo" ? "Vrátit mezi nadcházející" : "Označit proběhlé"}</button>
        <button class="btn-mini" data-action="toggle-visibility" data-id="${e.id}">${e.visibility === "skryte" ? "Zveřejnit" : "Skrýt"}</button>
        <button class="btn-mini danger" data-action="delete" data-id="${e.id}">Smazat</button>
      </div>
    </div>`;
  }

  el.list.addEventListener("click", async (evt) => {
    const btn = evt.target.closest(".btn-mini");
    if (!btn) return;
    const id = btn.dataset.id;
    const action = btn.dataset.action;
    const ev = events.find((e) => String(e.id) === String(id));
    if (!ev) return;

    try {
      if (action === "edit") {
        openForm(ev);
      } else if (action === "duplicate") {
        const clone = { ...ev };
        delete clone.id;
        clone.name = ev.name + " (kopie)";
        const created = await DataService.addEvent(clone);
        await loadEvents();
        const fresh = events.find((e) => String(e.id) === String(created.id)) || created;
        openForm(fresh);
      } else if (action === "toggle-full") {
        await DataService.updateEvent(ev.id, { status: ev.status === "plno" ? "otevreno" : "plno" });
        await loadEvents();
      } else if (action === "toggle-cancel") {
        await DataService.updateEvent(ev.id, { status: ev.status === "zruseno" ? "otevreno" : "zruseno" });
        await loadEvents();
      } else if (action === "toggle-past") {
        await DataService.updateEvent(ev.id, { status: ev.status === "probehlo" ? "otevreno" : "probehlo" });
        await loadEvents();
      } else if (action === "toggle-visibility") {
        await DataService.updateEvent(ev.id, { visibility: ev.visibility === "skryte" ? "verejne" : "skryte" });
        await loadEvents();
      } else if (action === "delete") {
        if (confirm(`Opravdu smazat akci „${ev.name}“? Tuto akci nelze vrátit zpět.`)) {
          if (coreClient) {
            const linked = await findLinkedReservation(ev.id);
            if (linked) await coreClient.from("reservations").update({ status: "cancelled_by_admin" }).eq("id", linked.id);
          }
          await DataService.deleteEvent(ev.id);
          await loadEvents();
        }
      }
    } catch (err) {
      console.error(err);
      alert("Něco se nepovedlo. Zkus to prosím znovu. Detail chyby je v konzoli prohlížeče.");
    }
  });

  el.addBtn.addEventListener("click", () => openForm(null));

  // ---------- FORM ----------

  function categoryOptionsHTML(selected) {
    return CATEGORIES.map((c) => `<option value="${c.slug}" ${c.slug === selected ? "selected" : ""}>${escapeHtml(c.label)}</option>`).join("");
  }
  function statusOptionsHTML(selected) {
    return STATUS_OPTIONS.map((s) => `<option value="${s.slug}" ${s.slug === selected ? "selected" : ""}>${escapeHtml(s.label)}</option>`).join("");
  }

  function formHTML(ev) {
    const isEdit = !!ev;
    const v = ev || {
      name: "", category: CATEGORIES[0].slug, date: "", time_from: "", time_to: "", location: "",
      description_short: "", description_long: "", capacity: "", signed_up_count: "",
      price: "", is_free: false, organizer: "", phone: "", whatsapp: "",
      photo_url: "", tags: [], schedule: [], what_to_bring: "",
      status: "otevreno", visibility: "verejne",
      _block: { checked: false, venueId: null, courtId: null },
    };
    return `
      <button class="modal-close" id="formClose" aria-label="Zavřít">✕</button>
      <h2 class="form-title" id="formTitle">${isEdit ? "Upravit akci" : "Přidat novou akci"}</h2>
      <p class="form-subtitle">Pole označená * jsou povinná.</p>
      <div class="form-scroll">
      <p class="form-error" id="formError" hidden></p>
      <form id="eventForm">
        <div class="form-grid">
          <div class="form-field full">
            <label>Název akce *</label>
            <input type="text" name="name" value="${escapeHtml(v.name)}" required />
          </div>

          <div class="form-field">
            <label>Kategorie * <span class="form-hint">(Open Match se jinak plní živě z „Chybí nám hráč" — sem přidávej jen jako záložní/testovací záznam)</span></label>
            <select name="category">${categoryOptionsHTML(v.category)}</select>
          </div>
          <div class="form-field">
            <label>Místo *</label>
            <input type="text" name="location" placeholder="Kurt 1, terasa, klubovna…" value="${escapeHtml(v.location)}" required />
          </div>

          <div class="form-field">
            <label>Datum *</label>
            <input type="date" name="date" value="${escapeHtml(v.date)}" required />
          </div>
          <div class="form-field">
            <label>Stav</label>
            <select name="status">${statusOptionsHTML(v.status)}</select>
          </div>

          <div class="form-field">
            <label>Čas od *</label>
            <input type="time" name="time_from" value="${escapeHtml(v.time_from)}" required />
          </div>
          <div class="form-field">
            <label>Čas do *</label>
            <input type="time" name="time_to" value="${escapeHtml(v.time_to)}" required />
          </div>

          <div class="form-field full">
            <label>Krátký popis (do karty akce)</label>
            <textarea name="description_short" rows="2">${escapeHtml(v.description_short)}</textarea>
          </div>
          <div class="form-field full">
            <label>Dlouhý popis (do detailu)</label>
            <textarea name="description_long" rows="4">${escapeHtml(v.description_long)}</textarea>
          </div>

          <div class="form-field">
            <label>Kapacita (počet míst)</label>
            <input type="number" min="0" name="capacity" value="${escapeHtml(v.capacity)}" />
          </div>
          <div class="form-field">
            <label>Počet přihlášených</label>
            <input type="number" min="0" name="signed_up_count" value="${escapeHtml(v.signed_up_count)}" />
          </div>

          <div class="form-field">
            <label>Cena (Kč)</label>
            <input type="number" min="0" name="price" value="${escapeHtml(v.price)}" />
          </div>
          <div class="form-field">
            <label class="form-checkbox" style="margin-top:22px"><input type="checkbox" name="is_free" ${v.is_free ? "checked" : ""}/> Akce je zdarma</label>
          </div>

          <div class="form-field">
            <label>Pořadatel / kdo akci vede</label>
            <input type="text" name="organizer" value="${escapeHtml(v.organizer)}" />
          </div>
          <div class="form-field">
            <label>Telefon</label>
            <input type="text" name="phone" value="${escapeHtml(v.phone)}" />
          </div>

          <div class="form-field full">
            <label>WhatsApp pro tuto akci <span class="form-hint">(nepovinné — jinak se použije klubové číslo z config.js)</span></label>
            <input type="text" name="whatsapp" placeholder="420777123456" value="${escapeHtml(v.whatsapp)}" />
          </div>

          <div class="form-section-label">Doplňující info pro detail akce</div>

          <div class="form-field full">
            <label>Fotografie <span class="form-hint">(URL obrázku — necháš-li prázdné, zobrazí se barevný placeholder s ikonou kategorie)</span></label>
            <input type="text" name="photo_url" placeholder="https://…" value="${escapeHtml(v.photo_url)}" />
          </div>

          <div class="form-field full">
            <label>Štítky <span class="form-hint">(odděl čárkou, např. zdarma, pro členy, registrace nutná)</span></label>
            <input type="text" name="tags" list="tagSuggestions" value="${escapeHtml(serializeTags(v.tags))}" />
          </div>

          <div class="form-field full">
            <label>Harmonogram <span class="form-hint">(jeden řádek = jedna položka, formát "ČAS - POPIS")</span></label>
            <textarea name="schedule" rows="4" placeholder="09:00 - Registrace&#10;09:30 - Zahájení">${escapeHtml(serializeSchedule(v.schedule))}</textarea>
          </div>

          <div class="form-field full">
            <label>Co si vzít s sebou</label>
            <input type="text" name="what_to_bring" value="${escapeHtml(v.what_to_bring)}" />
          </div>

          <div class="form-field">
            <label>Viditelnost</label>
            <select name="visibility">
              <option value="verejne" ${v.visibility === "verejne" ? "selected" : ""}>Veřejné</option>
              <option value="skryte" ${v.visibility === "skryte" ? "selected" : ""}>Skryté</option>
            </select>
          </div>

          ${blockCourtFieldsHTML(v._block)}
        </div>

        <div class="form-actions">
          <button type="submit" class="btn btn-primary btn-block">${isEdit ? "Uložit změny" : "Přidat akci"}</button>
          <button type="button" class="btn btn-secondary" id="formCancel">Zrušit</button>
        </div>
      </form>
      </div>`;
  }

  async function openForm(ev) {
    let blockPre = { checked: false, venueId: null, courtId: null };
    if (ev) {
      const linked = await findLinkedReservation(ev.id);
      if (linked) blockPre = { checked: true, venueId: linked.venue_id, courtId: linked.court_id };
      ev = { ...ev, _block: blockPre };
    }
    el.formSheet.innerHTML = formHTML(ev);
    el.formSheet.dataset.editingId = ev ? ev.id : "";
    el.formOverlay.hidden = false;
    document.body.style.overflow = "hidden";
    wireBlockCourtFields(blockPre.checked ? blockPre : null);
  }

  function closeForm() {
    el.formOverlay.hidden = true;
    el.formSheet.innerHTML = "";
    document.body.style.overflow = "";
  }

  el.formOverlay.addEventListener("click", (evt) => { if (evt.target === el.formOverlay) closeForm(); });
  el.formSheet.addEventListener("click", (evt) => {
    if (evt.target.closest("#formClose") || evt.target.closest("#formCancel")) closeForm();
  });

  el.formSheet.addEventListener("submit", async (evt) => {
    evt.preventDefault();
    if (evt.target.id !== "eventForm") return;
    const form = evt.target;
    const fd = new FormData(form);
    const payload = {
      name: (fd.get("name") || "").trim(),
      category: fd.get("category"),
      date: fd.get("date"),
      time_from: fd.get("time_from"),
      time_to: fd.get("time_to"),
      location: (fd.get("location") || "").trim(),
      description_short: (fd.get("description_short") || "").trim(),
      description_long: (fd.get("description_long") || "").trim(),
      capacity: fd.get("capacity") ? Number(fd.get("capacity")) : null,
      signed_up_count: fd.get("signed_up_count") ? Number(fd.get("signed_up_count")) : 0,
      price: fd.get("price") ? Number(fd.get("price")) : null,
      is_free: fd.get("is_free") === "on",
      organizer: (fd.get("organizer") || "").trim(),
      phone: (fd.get("phone") || "").trim(),
      whatsapp: (fd.get("whatsapp") || "").trim(),
      photo_url: (fd.get("photo_url") || "").trim(),
      tags: parseTagsInput(fd.get("tags")),
      schedule: parseScheduleInput(fd.get("schedule")),
      what_to_bring: (fd.get("what_to_bring") || "").trim(),
      status: fd.get("status"),
      visibility: fd.get("visibility"),
    };

    if (!payload.name || !payload.date || !payload.time_from || !payload.time_to || !payload.location) {
      const errEl = document.getElementById("formError");
      errEl.textContent = "Vyplň prosím všechna povinná pole (*).";
      errEl.hidden = false;
      return;
    }

    const editingId = el.formSheet.dataset.editingId;
    try {
      let savedEvent;
      if (editingId) {
        savedEvent = await DataService.updateEvent(editingId, payload);
        savedEvent = savedEvent || { ...payload, id: editingId };
      } else {
        savedEvent = await DataService.addEvent(payload);
      }
      if (coreClient) await syncCourtBlock(savedEvent, form);
      closeForm();
      await loadEvents();
    } catch (err) {
      console.error(err);
      const errEl = document.getElementById("formError");
      errEl.textContent = "Uložení se nepovedlo. Zkus to prosím znovu.";
      errEl.hidden = false;
    }
  });

  document.addEventListener("keydown", (evt) => { if (evt.key === "Escape" && !el.formOverlay.hidden) closeForm(); });

  // ---------- INIT ----------

  DataService.init();
  initCoreLink();
  if (sessionStorage.getItem(SESSION_KEY) === "1") {
    showDashboard();
  } else {
    showLogin();
  }
})();
