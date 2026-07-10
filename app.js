/**
 * APLIKACE — veřejný klubový kalendář
 */
(function () {
  const CATEGORIES = [
    { slug: "turnaj", label: "Turnaj", emoji: "🎾" },
    { slug: "komunita", label: "Komunita", emoji: "👥" },
    { slug: "prednaska", label: "Přednáška / Workshop", emoji: "🧠" },
    { slug: "trenink", label: "Trénink", emoji: "💪" },
    { slug: "open_match", label: "Open Match", emoji: "🏓" },
    { slug: "zdravy_hrac", label: "Zdravý hráč", emoji: "❤️" },
    { slug: "firemni", label: "Firemní akce", emoji: "🤝" },
    { slug: "klubovy_zivot", label: "Klubový život", emoji: "🎬" },
  ];

  const FILTERS = [
    { slug: "vse", label: "Vše" },
    { slug: "turnaj", label: "Turnaje" },
    { slug: "komunita", label: "Komunita" },
    { slug: "prednaska", label: "Přednášky" },
    { slug: "trenink", label: "Tréninky" },
    { slug: "open_match", label: "Open Match" },
    { slug: "zdravy_hrac", label: "Zdravý hráč" },
    { slug: "firemni", label: "Firemní" },
    { slug: "klubovy_zivot", label: "Klubový život" },
  ];

  const STATUS = {
    otevreno: { label: "Otevřeno", cls: "status-open" },
    posledni_mista: { label: "Poslední místa", cls: "status-last" },
    plno: { label: "Plno", cls: "status-full" },
    zruseno: { label: "Zrušeno", cls: "status-cancelled" },
    probehlo: { label: "Proběhlo", cls: "status-past" },
  };

  const TAG_FREE = new Set(["zdarma", "veřejné"]);
  const TAG_ATTENTION = new Set(["registrace nutná", "kapacita omezená"]);

  const WEEKDAY_SHORT = ["NE", "PO", "ÚT", "ST", "ČT", "PÁ", "SO"];
  const WEEKDAYS = ["neděle", "pondělí", "úterý", "středa", "čtvrtek", "pátek", "sobota"];
  const MONTHS_GEN = ["ledna", "února", "března", "dubna", "května", "června", "července", "srpna", "září", "října", "listopadu", "prosince"];

  const state = { filter: "vse", search: "", events: [] };

  const el = {
    search: document.getElementById("searchInput"),
    filters: document.getElementById("filters"),
    list: document.getElementById("eventsList"),
    loading: document.getElementById("loadingState"),
    empty: document.getElementById("emptyState"),
    demoNote: document.getElementById("demoNote"),
    pastSection: document.getElementById("pastSection"),
    pastToggle: document.getElementById("pastToggle"),
    pastList: document.getElementById("pastList"),
    overlay: document.getElementById("modalOverlay"),
    sheet: document.getElementById("modalSheet"),
    quickLinks: document.getElementById("quickLinks"),
  };

  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function normalize(str) {
    return (str || "")
      .toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  function parseDate(dateStr) { return new Date(dateStr + "T00:00:00"); }

  function formatDateRow(dateStr) {
    const d = parseDate(dateStr);
    return { weekday: WEEKDAY_SHORT[d.getDay()], day: d.getDate(), month: d.getMonth() + 1 };
  }

  function formatDateFull(dateStr) {
    const d = parseDate(dateStr);
    return `${WEEKDAYS[d.getDay()]} ${d.getDate()}. ${MONTHS_GEN[d.getMonth()]} ${d.getFullYear()}`;
  }

  function categoryOf(slug) { return CATEGORIES.find((c) => c.slug === slug); }

  function priceLabel(e) {
    if (e.is_free || e.price === 0) return "Zdarma";
    if (e.price === null || e.price === undefined || e.price === "") return "Cena na dotaz";
    return `${e.price} Kč`;
  }

  function tagClass(tag) {
    if (TAG_FREE.has(tag)) return "tag-free";
    if (TAG_ATTENTION.has(tag)) return "tag-attention";
    return "";
  }

  function tagsHTML(tags) {
    if (!tags || tags.length === 0) return "";
    return `<div class="tag-row">${tags.map((t) => `<span class="pill-tag ${tagClass(t)}">${escapeHtml(t)}</span>`).join("")}</div>`;
  }

  function progressHTML(e) {
    if (!e.capacity || e.capacity <= 0) return "";
    const signed = e.signed_up_count || 0;
    const pct = Math.min(100, Math.round((signed / e.capacity) * 100));
    const full = signed >= e.capacity;
    return `
    <div class="event-progress">
      <div class="progress-bar"><div class="progress-bar-fill ${full ? "is-full" : ""}" style="width:${pct}%"></div></div>
      <span>${signed}/${e.capacity} přihlášeno</span>
    </div>`;
  }

  function whatsAppInterestLink(e) {
    const msg = `Ahoj, mám zájem o akci ${e.name}.`;
    const number = ((e.whatsapp || window.APP_CONFIG.WHATSAPP_NUMBER) || "").replace(/\D/g, "");
    const base = number ? `https://wa.me/${number}` : "https://wa.me/";
    return `${base}?text=${encodeURIComponent(msg)}`;
  }

  function shareLink(e) {
    const dr = formatDateRow(e.date);
    const msg = `${categoryOf(e.category) ? categoryOf(e.category).emoji : "📅"} ${e.name}\n${dr.day}.${dr.month}. · ${e.time_from}–${e.time_to}\n📍 ${e.location || ""}\n\n${e.description_short || ""}\n\nVíc info: Padel Klatovy — Co se děje v klubu`;
    return `https://wa.me/?text=${encodeURIComponent(msg)}`;
  }

  function findEvent(id) { return state.events.find((e) => String(e.id) === String(id)); }

  function coverHTML(e, modal) {
    const cat = categoryOf(e.category);
    const hasPhoto = !!e.photo_url;
    const coverClass = modal ? "modal-cover" : "event-cover";
    const bgStyle = hasPhoto ? ` style="background-image:url('${escapeHtml(e.photo_url)}')"` : "";
    const status = STATUS[e.status] || { label: e.status, cls: "" };
    const closeBtn = modal ? `<button class="modal-close" id="modalClose" aria-label="Zavřít detail">✕</button>` : "";
    return `
    <div class="${coverClass} ${hasPhoto ? "has-photo" : ""}"${bgStyle}>
      ${closeBtn}
      <span class="cover-emoji">${cat ? cat.emoji : "🎾"}</span>
      <div class="cover-badge-row">
        <span class="event-tag">${cat ? cat.emoji + " " + escapeHtml(cat.label) : ""}</span>
        <span class="status-pill ${status.cls}"><i class="dot"></i>${escapeHtml(status.label)}</span>
      </div>
    </div>`;
  }

  function isExternalOpenMatch(e) { return e._source === "core-openmatch"; }

  function interestButtonState(e) {
    if (isExternalOpenMatch(e)) {
      const cfg = window.APP_CONFIG || {};
      if (e.status === "plno") return { disabled: true, label: "Obsazeno", external: true };
      return { disabled: false, label: "Chci hrát", external: true, href: (cfg.CORE_APP_URL || "#") + "?tab=openmatches" };
    }
    if (e.status === "plno") return { disabled: true, label: "Obsazeno" };
    if (e.status === "zruseno") return { disabled: true, label: "Zrušeno" };
    if (e.status === "probehlo") return { disabled: true, label: "Proběhlo" };
    return { disabled: false, label: "Mám zájem" };
  }

  function interestButtonHTML(e, blockClass) {
    const interest = interestButtonState(e);
    const cls = `btn btn-primary btn-interest ${blockClass || ""}`;
    if (interest.external) {
      if (interest.disabled) return `<button class="${cls}" disabled>${interest.label}</button>`;
      return `<a class="${cls}" href="${escapeHtml(interest.href)}" target="_blank" rel="noopener">${interest.label} ↗</a>`;
    }
    return `<button class="${cls}" data-id="${e.id}" ${interest.disabled ? "disabled" : ""}>${interest.label}</button>`;
  }

  function eventCardHTML(e) {
    const dr = formatDateRow(e.date);
    const timeLabel = e.time_to ? `${escapeHtml(e.time_from)}–${escapeHtml(e.time_to)}` : escapeHtml(e.time_from);
    return `
    <article class="event-card" data-id="${e.id}" tabindex="0" role="button" aria-label="Detail akce ${escapeHtml(e.name)}">
      ${coverHTML(e, false)}
      <div class="event-body">
        <div class="event-date-row">${dr.weekday} ${dr.day}. ${dr.month}.<span class="sep">·</span><span class="time">${timeLabel}</span></div>
        <h3 class="event-title">${escapeHtml(e.name)}</h3>
        <p class="event-desc">${escapeHtml(e.description_short || "")}</p>
        ${tagsHTML(e.tags)}
        ${progressHTML(e)}
        <div class="event-meta">
          <span>📍 ${escapeHtml(e.location || "")}</span>
          <span>💳 ${escapeHtml(priceLabel(e))}</span>
        </div>
        <div class="event-actions">
          ${interestButtonHTML(e)}
          <button class="btn btn-secondary btn-share" data-id="${e.id}">Sdílet</button>
        </div>
      </div>
    </article>`;
  }

  function scheduleHTML(schedule) {
    if (!schedule || schedule.length === 0) return "";
    return `
    <div class="modal-section-label">Harmonogram</div>
    <div class="schedule-list">
      ${schedule.map((s) => `<div class="schedule-item"><span class="schedule-time">${escapeHtml(s.time)}</span>${escapeHtml(s.item)}</div>`).join("")}
    </div>`;
  }

  function detailHTML(e) {
    const cfg = window.APP_CONFIG || {};
    const contact = e.phone || cfg.CLUB_PHONE || "";
    const timeLabel = e.time_to ? `${escapeHtml(e.time_from)}–${escapeHtml(e.time_to)}` : escapeHtml(e.time_from);
    const external = isExternalOpenMatch(e);
    return `
      ${coverHTML(e, true)}
      <div class="modal-body">
        <div class="modal-date-row">
          <span class="event-tag">${escapeHtml(formatDateFull(e.date))}</span>
        </div>
        <h2 class="modal-title" id="modalTitle">${escapeHtml(e.name)}</h2>
        <p class="modal-datetime">🕒 ${timeLabel}</p>
        <p class="modal-location">📍 ${escapeHtml(e.location || "")}</p>
        ${progressHTML(e)}
        <p class="modal-desc">${escapeHtml(e.description_long || e.description_short || "")}</p>

        ${scheduleHTML(e.schedule)}

        ${e.what_to_bring ? `<div class="modal-section-label">Co s sebou</div><p class="modal-desc" style="margin-top:0">${escapeHtml(e.what_to_bring)}</p>` : ""}

        ${e.tags && e.tags.length ? `<div class="modal-section-label">Štítky</div>${tagsHTML(e.tags)}` : ""}

        ${external ? `<p class="modal-desc" style="margin-top:0;color:var(--text-faint);font-size:12.5px;">Živě z appky „Chybí nám hráč" — přihlášení i tvorba nových her probíhá přímo tam.</p>` : ""}

        <div class="modal-section-label">Info</div>
        <dl class="modal-facts">
          <div><dt>Cena</dt><dd>${escapeHtml(priceLabel(e))}</dd></div>
          <div><dt>Kapacita</dt><dd>${e.capacity ? (e.signed_up_count || 0) + " / " + e.capacity : "neomezeno"}</dd></div>
          <div><dt>Pořadatel</dt><dd>${escapeHtml(e.organizer || "Padel Klatovy")}</dd></div>
          <div><dt>Kontakt</dt><dd>${escapeHtml(contact || "—")}</dd></div>
        </dl>

        <a class="modal-map-link" href="${escapeHtml(cfg.MAP_URL || "#")}" target="_blank" rel="noopener">📍 Zobrazit areál na mapě</a>

        <div class="modal-actions">
          ${interestButtonHTML(e, "btn-block")}
          <button class="btn btn-secondary btn-share" data-id="${e.id}">Sdílet</button>
        </div>
      </div>`;
  }

  function openDetail(e) {
    if (!e) return;
    el.sheet.innerHTML = detailHTML(e);
    el.overlay.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    el.overlay.hidden = true;
    el.sheet.innerHTML = "";
    document.body.style.overflow = "";
  }

  function handleActionClick(target, evt) {
    const interestBtn = target.closest(".btn-interest");
    const shareBtn = target.closest(".btn-share");
    if (interestBtn && interestBtn.tagName === "A") {
      // Externí odkaz (Chybí nám hráč) — necháme prohlížeč normálně
      // navigovat, jen zabráníme otevření detailu akce pod tím.
      evt.stopPropagation();
      return true;
    }
    if (interestBtn && !interestBtn.disabled) {
      evt.stopPropagation();
      const e = findEvent(interestBtn.dataset.id);
      if (e) window.open(whatsAppInterestLink(e), "_blank", "noopener");
      return true;
    }
    if (interestBtn && interestBtn.disabled) {
      evt.stopPropagation();
      return true;
    }
    if (shareBtn) {
      evt.stopPropagation();
      const e = findEvent(shareBtn.dataset.id);
      if (e) window.open(shareLink(e), "_blank", "noopener");
      return true;
    }
    return false;
  }

  function attachListRow(container) {
    container.addEventListener("click", (evt) => {
      if (handleActionClick(evt.target, evt)) return;
      const card = evt.target.closest(".event-card");
      if (card) openDetail(findEvent(card.dataset.id));
    });
    container.addEventListener("keydown", (evt) => {
      if (evt.key !== "Enter" && evt.key !== " ") return;
      const card = evt.target.closest(".event-card");
      if (card) {
        evt.preventDefault();
        openDetail(findEvent(card.dataset.id));
      }
    });
  }

  attachListRow(el.list);
  attachListRow(el.pastList);

  el.sheet.addEventListener("click", (evt) => {
    if (handleActionClick(evt.target, evt)) return;
    if (evt.target.closest("#modalClose")) closeModal();
  });

  el.overlay.addEventListener("click", (evt) => { if (evt.target === el.overlay) closeModal(); });
  document.addEventListener("keydown", (evt) => { if (evt.key === "Escape" && !el.overlay.hidden) closeModal(); });

  el.pastToggle.addEventListener("click", () => {
    const isOpen = !el.pastList.hidden;
    el.pastList.hidden = isOpen;
    el.pastToggle.classList.toggle("open", !isOpen);
  });

  el.filters.addEventListener("click", (evt) => {
    const chip = evt.target.closest(".chip");
    if (!chip) return;
    state.filter = chip.dataset.slug;
    renderFilters();
    renderList();
  });

  el.search.addEventListener("input", (evt) => {
    state.search = evt.target.value;
    renderList();
  });

  function renderFilters() {
    el.filters.innerHTML = FILTERS.map(
      (f) => `<button class="chip ${f.slug === state.filter ? "active" : ""}" data-slug="${f.slug}">${escapeHtml(f.label)}</button>`
    ).join("");
  }

  function upcomingEvents() { return state.events.filter((e) => e.status !== "probehlo"); }
  function pastEvents() {
    return state.events.filter((e) => e.status === "probehlo").sort((a, b) => (a.date < b.date ? 1 : -1));
  }

  function visibleUpcoming() {
    let list = upcomingEvents();
    if (state.filter !== "vse") list = list.filter((e) => e.category === state.filter);
    const q = normalize(state.search.trim());
    if (q) list = list.filter((e) => normalize(e.name).includes(q) || normalize(e.description_short).includes(q));
    return list.sort((a, b) => (a.date < b.date ? -1 : 1));
  }

  function renderList() {
    const items = visibleUpcoming();
    el.loading.hidden = true;
    if (items.length === 0) {
      el.list.innerHTML = "";
      el.empty.hidden = false;
    } else {
      el.empty.hidden = true;
      el.list.innerHTML = items.map(eventCardHTML).join("");
    }

    const past = pastEvents();
    if (past.length > 0) {
      el.pastSection.hidden = false;
      el.pastList.innerHTML = past.map(eventCardHTML).join("");
    } else {
      el.pastSection.hidden = true;
    }
  }

  function renderQuickLinks() {
    const cfg = window.APP_CONFIG || {};
    const links = [
      { url: cfg.CORE_APP_URL, label: "🎾 Rezervace kurtů" },
      { url: cfg.BAR_APP_URL, label: "🍺 Klubový bar" },
      { url: cfg.ZDRAVY_HRAC_APP_URL, label: "❤️ Zdravý hráč" },
    ].filter((l) => l.url);
    if (links.length === 0) {
      el.quickLinks.hidden = true;
      return;
    }
    el.quickLinks.hidden = false;
    el.quickLinks.innerHTML = links
      .map((l) => `<a class="quick-link" href="${escapeHtml(l.url)}" target="_blank" rel="noopener">${l.label}</a>`)
      .join("");
  }

  async function loadOpenMatches() {
    if (typeof OpenMatchService === "undefined") return;
    const live = await OpenMatchService.getOpenMatchEvents();
    if (live.length === 0) return; // necháme, co už tam je (fallback/demo), pokud se živá data nenačtou
    state.events = state.events.filter((e) => e.category !== "open_match");
    state.events = state.events.concat(live);
    renderFilters();
    renderList();
  }

  async function init() {
    DataService.init();
    el.demoNote.hidden = !DataService.isDemoMode();
    state.events = await DataService.getEvents({ includeHidden: false });
    renderFilters();
    renderList();
    renderQuickLinks();
    loadOpenMatches(); // na pozadí, nečeká se na to při prvním vykreslení
  }

  init();
})();
