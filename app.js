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
  featuredIndex: 0,
  currentFeaturedItemId: null,
  ratingDraft: null
};

const POSTER_CACHE_KEY = "screenkiss-poster-cache-v1";
const WATCHLIST_STORAGE_KEY = "screenkiss-watchlist-v1";

const storedWatchlist = localStorage.getItem(WATCHLIST_STORAGE_KEY);
let WATCHLIST_STATE = storedWatchlist ? JSON.parse(storedWatchlist) : WATCHLIST;

const posterCache = JSON.parse(localStorage.getItem(POSTER_CACHE_KEY) || "{}");

const rootEl = document.documentElement;

const movieModeOverlay = document.getElementById("movieModeOverlay");

const featuredDisplay = document.getElementById("featuredDisplay");
const featuredPrevBtn = document.getElementById("featuredPrevBtn");
const featuredNextBtn = document.getElementById("featuredNextBtn");
const featuredOpenBtnExternal = document.getElementById("featuredOpenBtnExternal");
const featuredWatchBtnExternal = document.getElementById("featuredWatchBtnExternal");

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
const lightDarkToggleBtn = document.getElementById("lightDarkToggleBtn");
const movieTimeBtn = document.getElementById("movieTimeBtn");
const loginBtn = document.getElementById("loginBtn");

const rankingSidebar = document.getElementById("rankingSidebar");
const rankingList = document.getElementById("rankingList");
const sidebarSubtitle = document.getElementById("sidebarSubtitle");
const pageLayout = document.getElementById("pageLayout");

const detailsModal = document.getElementById("detailsModal");
const modalBackdrop = document.getElementById("modalBackdrop");
const modalBody = document.getElementById("modalBody");
const closeModalBtn = document.getElementById("closeModalBtn");

function saveWatchlistState() {
  localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(WATCHLIST_STATE));
}

function getItemById(id) {
  return WATCHLIST_STATE.find(item => item.id === id);
}

function updateItem(id, updates) {
  WATCHLIST_STATE = WATCHLIST_STATE.map(item => item.id === id ? { ...item, ...updates } : item);
  saveWatchlistState();
}

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
  const remainder = rating - full;

  let fraction = "";
  if (remainder >= 0.74) fraction = "¾";
  else if (remainder >= 0.49) fraction = "½";
  else if (remainder >= 0.24) fraction = "¼";

  return "★".repeat(full) + fraction;
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
 * Future auto-poster hook.
 * Next step: wire TMDb lookup in here.
 */
async function ensurePoster(item) {
  if (!item.autoPoster) return;
  if (getResolvedPoster(item)) return;
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
  lightDarkToggleBtn.textContent = state.theme === "light" ? "Dark Mode" : "Light Mode";
  localStorage.setItem("screenkiss-theme", state.theme);
}

function toggleLightDark() {
  state.theme = state.theme === "light" ? "dark" : "light";
  applyTheme();
}

function triggerMovieModeAnimation() {
  movieModeOverlay.classList.remove("hidden", "reveal", "dim-lights", "hide-lights");
  void movieModeOverlay.offsetWidth;

  requestAnimationFrame(() => {
    movieModeOverlay.classList.add("reveal");
  });

  setTimeout(() => {
    movieModeOverlay.classList.add("dim-lights");
  }, 3000);

  setTimeout(() => {
    movieModeOverlay.classList.add("hide-lights");
  }, 4300);

  setTimeout(() => {
    movieModeOverlay.classList.add("hidden");
  }, 5200);
}

function enterMovieTimeMode() {
  state.theme = "movietime";
  applyTheme();
  triggerMovieModeAnimation();
}

function getBaseTypeItems() {
  return WATCHLIST_STATE.filter(item => item.type === state.type);
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
  const vibes = [...new Set(getBaseTypeItems().map(item => item.vibe))].sort((a, b) => a.localeCompare(b));
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

function getWatchUrl(item) {
  if (item.watchSlug && item.watchSlug.trim()) {
    return `https://wmovies.one/${item.watchSlug.trim()}/`;
  }
  return "https://wmovies.one/";
}

function renderFeatured() {
  const featuredItems = WATCHLIST_STATE.filter(item => item.featured);

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
    state.currentFeaturedItemId = null;
    return;
  }

  const normalizedIndex = ((state.featuredIndex % featuredItems.length) + featuredItems.length) % featuredItems.length;
  state.featuredIndex = normalizedIndex;
  const item = featuredItems[normalizedIndex];
  state.currentFeaturedItemId = item.id;

  featuredDisplay.innerHTML = `
    <div class="featured-slide">
      ${getPosterMarkup(item, "featured-poster")}
      <div class="featured-info">
        <div class="featured-kicker">Featured ${normalizedIndex + 1} / ${featuredItems.length}</div>
        <h2>${escapeHtml(item.title)}</h2>
        <div class="featured-year">${escapeHtml(item.year)}</div>
        <div class="featured-meta">
          <span class="badge">${escapeHtml(item.vibe)}</span>
          <span class="badge">${escapeHtml(getIntensityLabel(item.intensity))}</span>
          ${item.watched ? `<span class="rating-pill ${item.rating === 5 ? "perfect-score" : ""}">${escapeHtml(formatKisses(item.rating))}</span>` : ""}
        </div>
        <p><em>${escapeHtml(item.hint)}</em></p>
        <div class="featured-adjectives">${escapeHtml((item.adjectives || []).join(" • "))}</div>
      </div>
    </div>
  `;
}

function renderCards() {
  const visibleItems = sortItems(getVisibleItems());

  const typeLabel = getTypeLabel(state.type);
  const statusLabel = { watched: "Watched", unwatched: "Unwatched", all: "All" }[state.watchStatus];

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
          <span class="badge">${escapeHtml(item.vibe)}</span>
          <span class="badge">${escapeHtml(getIntensityLabel(item.intensity))}</span>
          ${item.nostalgic ? `<span class="badge">Nostalgic</span>` : ""}
          ${item.watched ? `<span class="rating-pill ${item.rating === 5 ? "perfect-score" : ""}">${escapeHtml(formatKisses(item.rating))}</span>` : ""}
        </div>
        <h3>${escapeHtml(item.title)}</h3>
        <div class="card-year">${escapeHtml(item.year)}</div>
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

function getTopRankedItems(limit = 10) {
  return WATCHLIST_STATE
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
  pageLayout.classList.toggle("with-sidebar", shouldShow);

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

function ratingValueFromSegment(segmentIndex) {
  const map = {
    1: 1,
    2: 1.5,
    3: 2,
    4: 2.5,
    5: 3,
    6: 3.5,
    7: 4,
    8: 4.25,
    9: 4.5,
    10: 4.75,
    11: 5
  };
  return map[segmentIndex] ?? 5;
}

function fillPercentFromRating(rating) {
  const percentMap = {
    1: 20,
    1.5: 30,
    2: 40,
    2.5: 50,
    3: 60,
    3.5: 70,
    4: 80,
    4.25: 85,
    4.5: 90,
    4.75: 95,
    5: 100
  };
  return percentMap[rating] ?? 0;
}

function buildStarSegments() {
  return Array.from({ length: 11 }, (_, i) => {
    const rating = ratingValueFromSegment(i + 1);
    const start = (i / 11) * 100;
    const width = 100 / 11;
    return `<div class="star-segment" data-rating="${rating}" style="left:${start}%; width:${width}%"></div>`;
  }).join("");
}

function openModal(item, fromRandom = false) {
  state.ratingDraft = item.rating ?? null;
  const watchUrl = getWatchUrl(item);

  modalBody.innerHTML = `
    ${getPosterMarkup(item, "modal-poster")}
    <div class="modal-content">
      <h2>${escapeHtml(item.title)}</h2>
      <div class="card-year">${escapeHtml(item.year)}</div>

      <div class="detail-row">
        <span class="detail">${escapeHtml(item.vibe)}</span>
        <span class="detail">${escapeHtml(getIntensityLabel(item.intensity))}</span>
        ${item.nostalgic ? `<span class="detail">Nostalgic</span>` : ""}
        ${item.watched ? `<span class="rating-pill ${item.rating === 5 ? "perfect-score" : ""}">${escapeHtml(formatKisses(item.rating))}</span>` : `<span class="detail">Unwatched</span>`}
      </div>

      <p><em>${escapeHtml(item.hint)}</em></p>
      <p>${escapeHtml((item.adjectives || []).join(" • "))}</p>

      <div class="modal-actions">
        <a class="watch-btn" href="${escapeHtml(watchUrl)}" target="_blank" rel="noopener noreferrer">Watch</a>
        <button id="toggleWatchedBtn" class="secondary-btn">${item.watched ? "Mark Unwatched" : "Mark Watched"}</button>
        ${fromRandom ? `<button id="pickAnotherBtn" class="primary-btn">Pick Another</button>` : ""}
      </div>

      <div class="modal-rating-box">
        <h3>Rate it in kisses</h3>
        <div class="rating-preview" id="ratingPreview">${escapeHtml(state.ratingDraft ? `${formatKisses(state.ratingDraft)} selected` : "Hover to choose a rating")}</div>

        <div class="star-rating" id="starRating" style="--fill-percent:${fillPercentFromRating(state.ratingDraft)}%;">
          <div class="star-rating-base">★★★★★</div>
          <div class="star-rating-fill">★★★★★</div>
          <div class="star-rating-hitbox" id="starRatingHitbox">
            ${buildStarSegments()}
          </div>
        </div>

        <div class="rating-submit-row">
          <button id="submitRatingBtn" class="primary-btn">Submit Rating</button>
          <button id="resetRatingBtn" class="rating-reset-btn">Clear Rating</button>
        </div>
      </div>
    </div>
  `;

  detailsModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";

  const starRating = document.getElementById("starRating");
  const ratingPreview = document.getElementById("ratingPreview");
  const hitbox = document.getElementById("starRatingHitbox");

  hitbox.querySelectorAll(".star-segment").forEach(segment => {
    segment.addEventListener("mouseenter", () => {
      const rating = Number(segment.dataset.rating);
      starRating.style.setProperty("--fill-percent", `${fillPercentFromRating(rating)}%`);
      ratingPreview.textContent = `${formatKisses(rating)} preview`;
    });

    segment.addEventListener("click", () => {
      const rating = Number(segment.dataset.rating);
      state.ratingDraft = rating;
      starRating.style.setProperty("--fill-percent", `${fillPercentFromRating(rating)}%`);
      ratingPreview.textContent = `${formatKisses(rating)} selected`;
    });
  });

  hitbox.addEventListener("mouseleave", () => {
    starRating.style.setProperty("--fill-percent", `${fillPercentFromRating(state.ratingDraft)}%`);
    ratingPreview.textContent = state.ratingDraft ? `${formatKisses(state.ratingDraft)} selected` : "Hover to choose a rating";
  });

  const toggleWatchedBtn = document.getElementById("toggleWatchedBtn");
  toggleWatchedBtn.addEventListener("click", () => {
    const target = getItemById(item.id);
    if (!target) return;

    if (target.watched) {
      updateItem(item.id, { watched: false, rating: null });
    } else {
      updateItem(item.id, { watched: true, rating: target.rating ?? 3.5 });
    }

    const refreshed = getItemById(item.id);
    renderAll();
    openModal(refreshed, fromRandom);
  });

  const submitRatingBtn = document.getElementById("submitRatingBtn");
  submitRatingBtn.addEventListener("click", () => {
    if (state.ratingDraft === null) return;
    updateItem(item.id, { watched: true, rating: state.ratingDraft });
    const refreshed = getItemById(item.id);
    renderAll();
    openModal(refreshed, fromRandom);
  });

  const resetRatingBtn = document.getElementById("resetRatingBtn");
  resetRatingBtn.addEventListener("click", () => {
    state.ratingDraft = null;
    updateItem(item.id, { rating: null });
    const refreshed = getItemById(item.id);
    renderAll();
    openModal(refreshed, fromRandom);
  });

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

    if (state.watchStatus === "watched" && state.sort === "date-desc") {
      state.sort = "rating-desc";
      sortSelect.value = "rating-desc";
    }

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

lightDarkToggleBtn.addEventListener("click", toggleLightDark);
movieTimeBtn.addEventListener("click", enterMovieTimeMode);

featuredPrevBtn.addEventListener("click", () => {
  state.featuredIndex -= 1;
  renderFeatured();
});

featuredNextBtn.addEventListener("click", () => {
  state.featuredIndex += 1;
  renderFeatured();
});

featuredOpenBtnExternal.addEventListener("click", () => {
  if (!state.currentFeaturedItemId) return;
  const item = getItemById(state.currentFeaturedItemId);
  if (item) openModal(item, false);
});

featuredWatchBtnExternal.addEventListener("click", () => {
  if (!state.currentFeaturedItemId) return;
  const item = getItemById(state.currentFeaturedItemId);
  if (!item) return;
  window.open(getWatchUrl(item), "_blank", "noopener,noreferrer");
});

loginBtn.addEventListener("click", () => {
  alert("Login/admin page is a future build. For now this is just a placeholder.");
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

renderAll();