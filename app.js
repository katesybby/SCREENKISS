const state = {
  type: "movie",
  watchStatus: "unwatched",
  search: "",
  vibe: "all",
  intensity: "all",
  ratingFilter: "all",
  nostalgicOnly: false,
  sort: "date-desc",
  theme: localStorage.getItem("screenkiss-theme") || "dark",
  featuredIndex: 0
};

const POSTER_CACHE_KEY = "screenkiss-poster-cache-v1";
const posterCache = JSON.parse(localStorage.getItem(POSTER_CACHE_KEY) || "{}");

const rootEl = document.documentElement;

const featuredDisplay = document.getElementById("featuredDisplay");
const featuredPrevBtn = document.getElementById("featuredPrevBtn");
const featuredNextBtn = document.getElementById("featuredNextBtn");

const searchInput = document.getElementById("searchInput");
const vibeSelect = document.getElementById("vibeSelect");
const intensitySelect = document.getElementById("intensitySelect");
const sortSelect = document.getElementById("sortSelect");
const ratingFilterSelect = document.getElementById("ratingFilterSelect");
const ratingFilterWrap = document.getElementById("ratingFilterWrap");
const nostalgicToggle = document.getElementById("nostalgicToggle");
const cardGrid = document.getElementById("cardGrid");
const resultsTitle = document.getElementById("resultsTitle");
const resultsMeta = document.getElementById("resultsMeta");
const clearFiltersBtn = document.getElementById("clearFiltersBtn");
const randomPickBtn = document.getElementById("randomPickBtn");
const themeToggleBtn = document.getElementById("themeToggleBtn");

const rankingSidebar = document.getElementById("rankingSidebar");
const rankingList = document.getElementById("rankingList");
const sidebarSubtitle = document.getElementById("sidebarSubtitle");

const detailsModal = document.getElementById("detailsModal");
const modalBackdrop = document.getElementById("modalBackdrop");
const modalBody = document.getElementById("modalBody");
const closeModalBtn = document.getElementById("closeModalBtn");

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getTypeLabel(type) {
  return {
    movie: "Movies",
    show: "TV Shows",
    anime: "Anime"
  }[type] || "Titles";
}

function formatKisses(rating) {
  if (rating === null || rating === undefined) return "No kisses yet";

  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return "★".repeat(full) + (half ? "½" : "");
}

function getIntensityLabel(value) {
  return {
    glossy: "Glossy",
    messy: "Messy",
    unwell: "Unwell"
  }[value] || value;
}

function savePosterCache() {
  localStorage.setItem(POSTER_CACHE_KEY, JSON.stringify(posterCache));
}

function getPosterCacheKey(item) {
  return `${item.type}::${item.title}::${item.year}`;
}

function getResolvedPoster(item) {
  if (item.poster && item.poster.trim()) return item.poster;

  const cacheKey = getPosterCacheKey(item);
  if (posterCache[cacheKey]) return posterCache[cacheKey];

  return "";
}

function setCachedPoster(item, url) {
  const cacheKey = getPosterCacheKey(item);
  posterCache[cacheKey] = url;
  savePosterCache();
}

/**
 * Placeholder for future poster API lookup.
 * Right now it safely does nothing unless you manually add a URL.
 * Later we can plug TMDb here.
 */
async function ensurePoster(item) {
  if (!item.autoPoster) return;
  if (getResolvedPoster(item)) return;

  // Future poster lookup goes here.
  // Example idea later:
  // 1. search title + year via API
  // 2. cache image url with setCachedPoster(item, foundUrl)
}

function getPosterMarkup(item, className = "poster") {
  const resolvedPoster = getResolvedPoster(item);

  if (resolvedPoster) {
    return `
      <div class="${className}">
        <img src="${escapeHtml(resolvedPoster)}" alt="${escapeHtml(item.title)} poster" loading="lazy" />
      </div>
    `;
  }

  return `
    <div class="${className}">
      <div class="poster-fallback">${escapeHtml(item.title)}</div>
    </div>
  `;
}

function applyTheme() {
  rootEl.setAttribute("data-theme", state.theme);
  themeToggleBtn.textContent = state.theme === "dark" ? "Light Mode" : "Dark Mode";
  localStorage.setItem("screenkiss-theme", state.theme);
}

function getBaseTypeItems() {
  return WATCHLIST.filter(item => item.type === state.type);
}

function matchesWatchStatus(item) {
  if (state.watchStatus === "all") return true;
  if (state.watchStatus === "watched") return item.watched === true;
  if (state.watchStatus === "unwatched") return item.watched !== true;
  return true;
}

function matchesRatingFilter(item) {
  if (state.watchStatus !== "watched") return true;
  if (state.ratingFilter === "all") return true;
  if (item.rating === null || item.rating === undefined) return false;

  return item.rating >= Number(state.ratingFilter);
}

function getVisibleItems() {
  const q = state.search.toLowerCase().trim();

  return getBaseTypeItems()
    .filter(matchesWatchStatus)
    .filter(item => state.vibe === "all" ? true : item.vibe === state.vibe)
    .filter(item => state.intensity === "all" ? true : item.intensity === state.intensity)
    .filter(matchesRatingFilter)
    .filter(item => state.nostalgicOnly ? item.nostalgic === true : true)
    .filter(item => {
      if (!q) return true;

      const haystack = [
        item.title,
        item.vibe,
        item.hint,
        ...(item.adjectives || [])
      ].join(" ").toLowerCase();

      return haystack.includes(q);
    });
}

function sortItems(items) {
  const sorted = [...items];

  switch (state.sort) {
    case "date-asc":
      sorted.sort((a, b) => (a.year || 9999) - (b.year || 9999));
      break;
    case "title-asc":
      sorted.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case "title-desc":
      sorted.sort((a, b) => b.title.localeCompare(a.title));
      break;
    case "rating-desc":
      sorted.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1) || a.title.localeCompare(b.title));
      break;
    case "rating-asc":
      sorted.sort((a, b) => (a.rating ?? 999) - (b.rating ?? 999) || a.title.localeCompare(b.title));
      break;
    case "date-desc":
    default:
      sorted.sort((a, b) => (b.year || 0) - (a.year || 0));
      break;
  }

  return sorted;
}

function populateVibeSelect() {
  const vibes = [...new Set(
    getBaseTypeItems().map(item => item.vibe)
  )].sort((a, b) => a.localeCompare(b));

  const currentValue = state.vibe;

  vibeSelect.innerHTML = `
    <option value="all">All vibes</option>
    ${vibes.map(vibe => `<option value="${escapeHtml(vibe)}">${escapeHtml(vibe)}</option>`).join("")}
  `;

  if ([...vibeSelect.options].some(option => option.value === currentValue)) {
    vibeSelect.value = currentValue;
  } else {
    state.vibe = "all";
    vibeSelect.value = "all";
  }
}

function renderFeatured() {
  const featuredItems = WATCHLIST.filter(item => item.featured);

  if (!featuredItems.length) {
    featuredDisplay.innerHTML = `
      <div class="featured-slide">
        <div class="featured-poster"><div class="poster-fallback">No featured picks yet</div></div>
        <div class="featured-info">
          <div class="featured-kicker">Featured</div>
          <h2>Add some top favorites</h2>
          <p>Set <strong>featured: true</strong> in your data entries and they will appear here.</p>
        </div>
      </div>
    `;
    return;
  }

  const normalizedIndex = ((state.featuredIndex % featuredItems.length) + featuredItems.length) % featuredItems.length;
  state.featuredIndex = normalizedIndex;
  const item = featuredItems[normalizedIndex];

  featuredDisplay.innerHTML = `
    <div class="featured-slide">
      ${getPosterMarkup(item, "featured-poster")}
      <div class="featured-info">
        <div class="featured-kicker">Featured ${normalizedIndex + 1} / ${featuredItems.length}</div>
        <h2>${escapeHtml(item.title)}</h2>
        <div class="featured-meta">
          <span class="badge">${escapeHtml(getTypeLabel(item.type).slice(0, -1))}</span>
          <span class="badge">${escapeHtml(item.year)}</span>
          <span class="badge">${escapeHtml(item.vibe)}</span>
          <span class="badge">${escapeHtml(getIntensityLabel(item.intensity))}</span>
          ${item.watched ? `<span class="rating-pill">${escapeHtml(formatKisses(item.rating))}</span>` : ""}
        </div>
        <p><em>${escapeHtml(item.hint)}</em></p>
        <div class="featured-adjectives">${escapeHtml((item.adjectives || []).join(" • "))}</div>
        <div class="featured-action">
          <button class="primary-btn" id="featuredOpenBtn">Open Details</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById("featuredOpenBtn").addEventListener("click", () => openModal(item, false));
}

function renderCards() {
  const visibleItems = sortItems(getVisibleItems());

  const typeLabel = getTypeLabel(state.type);
  const statusLabel = {
    watched: "Watched",
    unwatched: "Unwatched",
    all: "All"
  }[state.watchStatus];

  resultsTitle.textContent = `${statusLabel} ${typeLabel}`;
  resultsMeta.textContent = `${visibleItems.length} title${visibleItems.length === 1 ? "" : "s"}`;

  if (!visibleItems.length) {
    cardGrid.innerHTML = `
      <div class="empty-state">
        <h3>Nothing matched</h3>
        <p>your filters got too specific; loosen them up a little</p>
      </div>
    `;
    return;
  }

  cardGrid.innerHTML = visibleItems.map((item, index) => `
    <article class="card" data-index="${index}">
      ${getPosterMarkup(item)}
      <div class="card-body">
        <div class="meta-row">
          <span class="badge">${escapeHtml(item.year)}</span>
          <span class="badge">${escapeHtml(item.vibe)}</span>
          <span class="badge">${escapeHtml(getIntensityLabel(item.intensity))}</span>
          ${item.nostalgic ? `<span class="badge">Nostalgic</span>` : ""}
          ${item.watched ? `<span class="rating-pill">${escapeHtml(formatKisses(item.rating))}</span>` : ""}
        </div>
        <h3>${escapeHtml(item.title)}</h3>
        <p><em>${escapeHtml(item.hint)}</em></p>
        <div class="card-adjectives">${escapeHtml((item.adjectives || []).join(" • "))}</div>
      </div>
    </article>
  `).join("");

  const cards = cardGrid.querySelectorAll(".card");
  cards.forEach((card, index) => {
    card.addEventListener("click", () => openModal(visibleItems[index], false));
  });

  visibleItems.forEach(item => ensurePoster(item));
}

function getRandomVisibleItem() {
  const visibleItems = sortItems(getVisibleItems());
  if (!visibleItems.length) return null;
  return visibleItems[Math.floor(Math.random() * visibleItems.length)];
}

function openModal(item, fromRandom = false) {
  modalBody.innerHTML = `
    ${getPosterMarkup(item, "modal-poster")}
    <div class="modal-content">
      <h2>${escapeHtml(item.title)}</h2>
      <div class="detail-row">
        <span class="detail">${escapeHtml(getTypeLabel(item.type).slice(0, -1))}</span>
        <span class="detail">${escapeHtml(item.year)}</span>
        <span class="detail">${escapeHtml(item.vibe)}</span>
        <span class="detail">${escapeHtml(getIntensityLabel(item.intensity))}</span>
        ${item.nostalgic ? `<span class="detail">Nostalgic</span>` : ""}
        ${item.watched ? `<span class="rating-pill">${escapeHtml(formatKisses(item.rating))}</span>` : `<span class="detail">Unwatched</span>`}
      </div>
      <p><em>${escapeHtml(item.hint)}</em></p>
      <p>${escapeHtml((item.adjectives || []).join(" • "))}</p>

      <div class="modal-actions">
        ${fromRandom ? `<button id="pickAnotherBtn" class="primary-btn">Pick Another</button>` : ""}
        <button id="closeModalInnerBtn" class="secondary-btn">Close</button>
      </div>
    </div>
  `;

  detailsModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";

  const closeInner = document.getElementById("closeModalInnerBtn");
  if (closeInner) closeInner.addEventListener("click", closeModal);

  const pickAnotherBtn = document.getElementById("pickAnotherBtn");
  if (pickAnotherBtn) {
    pickAnotherBtn.addEventListener("click", () => {
      const nextItem = getRandomVisibleItem();
      if (nextItem) openModal(nextItem, true);
    });
  }
}

function closeModal() {
  detailsModal.classList.add("hidden");
  document.body.style.overflow = "";
}

function getTopRankedItems(limit = 10) {
  return WATCHLIST
    .filter(item => item.type === state.type)
    .filter(item => item.watched === true)
    .filter(item => item.rating !== null && item.rating !== undefined)
    .sort((a, b) => (b.rating - a.rating) || a.title.localeCompare(b.title))
    .slice(0, limit);
}

function renderRankingSidebar() {
  const shouldShow = state.watchStatus === "watched";

  rankingSidebar.classList.toggle("hidden", !shouldShow);
  ratingFilterWrap.classList.toggle("hidden", !shouldShow);

  if (!shouldShow) return;

  const ranked = getTopRankedItems(10);
  sidebarSubtitle.textContent = `Top ${ranked.length} ${getTypeLabel(state.type).toLowerCase()}`;

  if (!ranked.length) {
    rankingList.innerHTML = `
      <div class="empty-state">
        <h3>No ratings yet</h3>
        <p>Once you mark things watched and rate them, your ranking shows here.</p>
      </div>
    `;
    return;
  }

  rankingList.innerHTML = ranked.map((item, index) => `
    <article class="rank-item" data-rank-index="${index}">
      <div class="rank-number">${index + 1}</div>
      ${getPosterMarkup(item, "rank-poster")}
      <div class="rank-content">
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(formatKisses(item.rating))}</p>
      </div>
    </article>
  `).join("");

  const rankItems = rankingList.querySelectorAll(".rank-item");
  rankItems.forEach((el, index) => {
    el.addEventListener("click", () => openModal(ranked[index], false));
  });
}

function renderAll() {
  applyTheme();
  populateVibeSelect();
  renderFeatured();
  renderRankingSidebar();
  renderCards();
}

document.querySelectorAll("#typeTabs .top-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    state.type = tab.dataset.type;
    document.querySelectorAll("#typeTabs .top-tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    renderAll();
  });
});

document.querySelectorAll("#statusTabs .top-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    state.watchStatus = tab.dataset.status;
    document.querySelectorAll("#statusTabs .top-tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    renderAll();
  });
});

searchInput.addEventListener("input", e => {
  state.search = e.target.value;
  renderCards();
});

vibeSelect.addEventListener("change", e => {
  state.vibe = e.target.value;
  renderCards();
});

intensitySelect.addEventListener("change", e => {
  state.intensity = e.target.value;
  renderCards();
});

sortSelect.addEventListener("change", e => {
  state.sort = e.target.value;
  renderCards();
});

ratingFilterSelect.addEventListener("change", e => {
  state.ratingFilter = e.target.value;
  renderCards();
});

nostalgicToggle.addEventListener("change", e => {
  state.nostalgicOnly = e.target.checked;
  renderCards();
});

clearFiltersBtn.addEventListener("click", () => {
  state.search = "";
  state.vibe = "all";
  state.intensity = "all";
  state.ratingFilter = "all";
  state.nostalgicOnly = false;
  state.sort = state.watchStatus === "watched" ? "rating-desc" : "date-desc";

  searchInput.value = "";
  vibeSelect.value = "all";
  intensitySelect.value = "all";
  ratingFilterSelect.value = "all";
  nostalgicToggle.checked = false;
  sortSelect.value = state.sort;

  renderAll();
});

randomPickBtn.addEventListener("click", () => {
  const item = getRandomVisibleItem();
  if (item) openModal(item, true);
});

themeToggleBtn.addEventListener("click", () => {
  state.theme = state.theme === "dark" ? "light" : "dark";
  applyTheme();
});

featuredPrevBtn.addEventListener("click", () => {
  state.featuredIndex -= 1;
  renderFeatured();
});

featuredNextBtn.addEventListener("click", () => {
  state.featuredIndex += 1;
  renderFeatured();
});

closeModalBtn.addEventListener("click", closeModal);
modalBackdrop.addEventListener("click", closeModal);

document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeModal();

  if (e.key === "ArrowLeft") {
    state.featuredIndex -= 1;
    renderFeatured();
  }

  if (e.key === "ArrowRight") {
    state.featuredIndex += 1;
    renderFeatured();
  }
});

if (state.watchStatus === "watched") {
  state.sort = "rating-desc";
  sortSelect.value = "rating-desc";
}

renderAll();