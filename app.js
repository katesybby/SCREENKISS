const state = {
  type: "americano",
  watchStatus: "all",
  search: "",
  vibe: "all",
  intensity: "all",
  ratingFilter: "all",
  nostalgicOnly: false,
  sort: "date-desc",
  theme: localStorage.getItem("screenkiss-theme") || "light",
  featuredIndex: 0,
  currentFeaturedItemId: null,
  ratingDraft: null
};

const TMDB_API_KEY = "33c28903a3ec65c0baf768470ac4f02c";
const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG = "https://image.tmdb.org/t/p/w500";

const POSTER_CACHE_KEY = "screenkiss-poster-cache-v1";
const WATCHLIST_STORAGE_KEY = "screenkiss-watchlist-v1";

// to reload the data.js file into screen kiss, take the 2 lines above and replace with this: 
  // localStorage.removeItem("screenkiss-watchlist-v1");
  // localStorage.removeItem("screenkiss-poster-cache-v1");
  // location.reload();

const storedWatchlist = localStorage.getItem(WATCHLIST_STORAGE_KEY);

function mergeWatchlistState(baseList, savedList) {
  if (!savedList) return baseList;

  const savedMap = new Map(savedList.map(item => [item.id, item]));

  return baseList.map(baseItem => {
    const savedItem = savedMap.get(baseItem.id);
    if (!savedItem) return baseItem;

    return {
      ...baseItem,
      watched: savedItem.watched ?? baseItem.watched,
      rating: savedItem.rating ?? baseItem.rating,
      review: savedItem.review ?? baseItem.review
    };
  });
}

let WATCHLIST_STATE = mergeWatchlistState(
  WATCHLIST,
  storedWatchlist ? JSON.parse(storedWatchlist) : null
);

const posterCache = JSON.parse(localStorage.getItem(POSTER_CACHE_KEY) || "{}");

const rootEl = document.documentElement;

const movieModeOverlay = document.getElementById("movieModeOverlay");

const featuredDisplay = document.getElementById("featuredDisplay");
const featuredPrevBtn = document.getElementById("featuredPrevBtn");
const featuredNextBtn = document.getElementById("featuredNextBtn");
const featuredOpenBtnExternal = document.getElementById("featuredOpenBtnExternal");
const featuredWatchBtnExternal = document.getElementById("featuredWatchBtnExternal");
let featuredInterval = null;

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

function startFeaturedAutoplay() {
  if (featuredInterval) clearInterval(featuredInterval);

  featuredInterval = setInterval(() => {
    state.featuredIndex += 1;
    renderFeatured();
  }, 10000);
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
    all: "All",
    americano: "Movies + TV Shows",
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

async function ensurePoster(item) {
  if (!item.autoPoster) return;

  const existing = getResolvedPoster(item);
  if (existing) return;

  try {
    const query = encodeURIComponent(item.title);
    const endpoint = item.type === "movie" ? "movie" : "tv";
    const url = `${TMDB_BASE}/search/${endpoint}?api_key=${TMDB_API_KEY}&query=${query}`;

    const res = await fetch(url);
    const data = await res.json();

    if (!data.results || data.results.length === 0) return;

    let match = null;

    if (item.year) {
      match = data.results.find(r => {
        const date = r.release_date || r.first_air_date;
        return date && date.startsWith(String(item.year));
      });
    }

    if (!match) match = data.results[0];
    if (!match.poster_path) return;

    const posterUrl = TMDB_IMG + match.poster_path;

    setCachedPoster(item, posterUrl);
    renderCards();

  } catch (err) {
    console.warn("Poster fetch failed:", item.title);
  }
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

function clearPosterCacheForItem(item) {
  const cacheKey = getPosterCacheKey(item);
  delete posterCache[cacheKey];
  savePosterCache();
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
  movieModeOverlay.className = "movie-mode-overlay";
  void movieModeOverlay.offsetWidth;

  setTimeout(() => {
    movieModeOverlay.classList.add("drop-closed");
  }, 30);

  // flash once before dimming
  setTimeout(() => {
    movieModeOverlay.classList.add("flash-bulbs");
  }, 3000);

  setTimeout(() => {
    movieModeOverlay.classList.remove("flash-bulbs");
  }, 3400);

  // dim scene + bulbs together
  setTimeout(() => {
    movieModeOverlay.classList.add("dim-bulbs", "dim-scene");
  }, 4500);

  // spotlight enters sooner / faster
  setTimeout(() => {
    movieModeOverlay.classList.add("show-spotlight");
  }, 7000);

  setTimeout(() => {
    movieModeOverlay.classList.add("move-spotlight");
  }, 7250);

  setTimeout(() => {
    movieModeOverlay.classList.add("settle-spotlight");
  }, 9300);

  // curtains open, spotlight fades during opening
  setTimeout(() => {
    movieModeOverlay.classList.add("part-open", "fade-spotlight");
  }, 10500);

  // bring side bulbs back up after curtains open
  setTimeout(() => {
    movieModeOverlay.classList.remove("dim-bulbs");
  }, 13600);

  // do NOT hide the overlay anymore
}

function enterMovieTimeMode() {
  state.theme = "movietime";
  applyTheme();
  triggerMovieModeAnimation();
}

function getBaseTypeItems() {
  if (state.type === "all") {
    return WATCHLIST_STATE;
  }

  if (state.type === "americano") {
    return WATCHLIST_STATE.filter(item => item.type === "movie" || item.type === "show");
  }

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
    .filter(item => state.vibe === "all" ? true : (item.filterTags || []).includes(state.vibe))
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
    case "random":
      sorted.sort(() => Math.random() - 0.5);
      break;
  }

  return sorted;
}

function populateVibeSelect() {
  const tags = [...new Set(
    getBaseTypeItems().flatMap(item => item.filterTags || [])
  )].sort((a, b) => a.localeCompare(b));

  const currentValue = state.vibe;

  vibeSelect.innerHTML = `
    <option value="all">All vibes</option>
    ${tags.map(tag => `<option value="${escapeHtml(tag)}">${escapeHtml(tag)}</option>`).join("")}
  `;

  if ([...vibeSelect.options].some(option => option.value === currentValue)) {
    vibeSelect.value = currentValue;
  } else {
    state.vibe = "all";
    vibeSelect.value = "all";
  }
}

function getWatchUrl(item) {
  const query = encodeURIComponent(item.title);

  if (item.type === "anime") {
    return `https://9animetv.to/search?keyword=${query}`;
  }

  return `https://theflixertv.to/search/${query}`;
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
    <div class="featured-slide" data-featured-id="${escapeHtml(item.id)}">
      ${getPosterMarkup(item, "featured-poster")}
      <div class="featured-info">
        <div class="featured-kicker">Featured ${normalizedIndex + 1} / ${featuredItems.length}</div>
        <h2>${escapeHtml(item.title)}</h2>
        <div class="featured-year featured-year-row">
          <span class="year-text">${escapeHtml(item.year)}</span>
          ${item.watched && item.rating !== null ? `<span class="inline-rating ${item.rating === 5 ? "perfect-score-inline" : ""}">${escapeHtml(formatKisses(item.rating))}</span>` : ""}
        </div>
        <div class="featured-meta">
          <span class="badge">${escapeHtml(item.vibe)}</span>
          <span class="badge">${escapeHtml(getIntensityLabel(item.intensity))}</span>
        </div>
        <p><em>${escapeHtml(item.hint)}</em></p>
        <div class="featured-adjectives">${escapeHtml((item.adjectives || []).join(" • "))}</div>
      </div>
    </div>
  `;

  const slide = featuredDisplay.querySelector(".featured-slide");
  if (slide) {
    slide.addEventListener("click", () => openModal(item, false));
  }
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
        </div>
        <h3>${escapeHtml(item.title)}</h3>
        <div class="card-year card-year-row">
          <span class="year-text">${escapeHtml(item.year)}</span>
          ${item.watched && item.rating !== null ? `<span class="inline-rating ${item.rating === 5 ? "perfect-score-inline" : ""}">${escapeHtml(formatKisses(item.rating))}</span>` : ""}
        </div>
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
  return getBaseTypeItems()
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
    return `<div class="star-segment" data-rating="${rating}"></div>`;
  }).join("");
}

function openModal(item, fromRandom = false) {
  state.ratingDraft = item.rating ?? null;
  const watchUrl = getWatchUrl(item);
  const showRatingEditor = item.watched && item.rating === null;
  const showChangeRatingButton = item.watched && item.rating !== null;

  modalBody.innerHTML = `
    ${getPosterMarkup(item, "modal-poster")}
    <div class="modal-content">
      <h2>${escapeHtml(item.title)}</h2>
      <div class="card-year card-year-row">
        <span class="year-text">${escapeHtml(item.year)}</span>
        ${item.watched && item.rating !== null ? `<span class="inline-rating ${item.rating === 5 ? "perfect-score-inline" : ""}">${escapeHtml(formatKisses(item.rating))}</span>` : ""}
      </div>

      <div class="detail-row">
        <span class="detail">${escapeHtml(item.vibe)}</span>
        <span class="detail">${escapeHtml(getIntensityLabel(item.intensity))}</span>
        ${item.nostalgic ? `<span class="detail">Nostalgic</span>` : ""}
        ${!item.watched ? `<span class="detail">Unwatched</span>` : ""}
      </div>

      <p><em>${escapeHtml(item.hint)}</em></p>
      <p>${escapeHtml((item.adjectives || []).join(" • "))}</p>

      <div class="modal-actions">
        <a class="watch-btn" href="${escapeHtml(watchUrl)}" target="_blank" rel="noopener noreferrer">Watch</a>
        <button id="toggleWatchedBtn" class="secondary-btn">${item.watched ? "Mark Unwatched" : "Mark Watched"}</button>
        ${showChangeRatingButton ? `<button id="changeRatingBtn" class="secondary-btn">Change Rating</button>` : ""}
        ${fromRandom ? `<button id="pickAnotherBtn" class="primary-btn">Pick Another</button>` : ""}
      </div>

      <div class="modal-rating-box ${showRatingEditor ? "" : "hidden"}" id="modalRatingBox">
        <h3>Rate it in kisses</h3>
        <div class="rating-preview" id="ratingPreview">${escapeHtml(state.ratingDraft ? `${formatKisses(state.ratingDraft)} selected` : "Hover to choose a rating")}</div>

        <div class="star-rating-wrap">
          <div class="star-rating" id="starRating" style="--fill-percent:${fillPercentFromRating(state.ratingDraft)}%;">
            <div class="star-rating-base">★★★★★</div>
            <div class="star-rating-fill">★★★★★</div>
            <div class="star-rating-hitbox" id="starRatingHitbox">
              ${buildStarSegments()}
            </div>
          </div>
        </div>

        <div class="rating-submit-row">
          <button id="submitRatingBtn" class="primary-btn ${state.ratingDraft === null ? "hidden" : ""}">Submit Rating</button>
          <button id="resetDraftBtn" class="rating-reset-btn">Clear Draft</button>
        </div>
      </div>
    </div>
  `;

  detailsModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";

  const toggleWatchedBtn = document.getElementById("toggleWatchedBtn");
  const modalRatingBox = document.getElementById("modalRatingBox");
  const changeRatingBtn = document.getElementById("changeRatingBtn");
  const submitRatingBtn = document.getElementById("submitRatingBtn");
  const resetDraftBtn = document.getElementById("resetDraftBtn");
  const ratingPreview = document.getElementById("ratingPreview");
  const starRating = document.getElementById("starRating");
  const hitbox = document.getElementById("starRatingHitbox");

  toggleWatchedBtn.addEventListener("click", () => {
    const target = getItemById(item.id);
    if (!target) return;

    if (target.watched) {
      updateItem(item.id, { watched: false, rating: null });
    } else {
      updateItem(item.id, { watched: true });
    }

    const refreshed = getItemById(item.id);
    renderAll();
    openModal(refreshed, fromRandom);
  });

  if (changeRatingBtn) {
    changeRatingBtn.addEventListener("click", () => {
      modalRatingBox.classList.remove("hidden");
      changeRatingBtn.classList.add("hidden");
      state.ratingDraft = item.rating;
      if (starRating) {
        starRating.style.setProperty("--fill-percent", `${fillPercentFromRating(state.ratingDraft)}%`);
      }
      if (ratingPreview) {
        ratingPreview.textContent = `${formatKisses(state.ratingDraft)} selected`;
      }
      if (submitRatingBtn) {
        submitRatingBtn.classList.remove("hidden");
      }
    });
  }

  if (hitbox && starRating && ratingPreview) {
    hitbox.querySelectorAll(".star-segment").forEach(segment => {
      segment.addEventListener("mouseenter", () => {
        if (state.ratingDraft !== null) return;
        const rating = Number(segment.dataset.rating);
        starRating.style.setProperty("--fill-percent", `${fillPercentFromRating(rating)}%`);
        ratingPreview.textContent = `${formatKisses(rating)} preview`;
      });

      segment.addEventListener("click", () => {
        const rating = Number(segment.dataset.rating);

        if (state.ratingDraft === rating) {
          state.ratingDraft = null;
          starRating.style.setProperty("--fill-percent", `0%`);
          ratingPreview.textContent = "Hover to choose a rating";
          if (submitRatingBtn) submitRatingBtn.classList.add("hidden");
        } else {
          state.ratingDraft = rating;
          starRating.style.setProperty("--fill-percent", `${fillPercentFromRating(rating)}%`);
          ratingPreview.textContent = `${formatKisses(rating)} selected`;
          if (submitRatingBtn) submitRatingBtn.classList.remove("hidden");
        }
      });
    });

    hitbox.addEventListener("mousemove", event => {
      if (state.ratingDraft !== null) return;
      const rect = hitbox.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const pct = Math.max(0, Math.min(1, x / rect.width));

      let rating = 1;
      if (pct <= 1 / 11) rating = 1;
      else if (pct <= 2 / 11) rating = 1.5;
      else if (pct <= 3 / 11) rating = 2;
      else if (pct <= 4 / 11) rating = 2.5;
      else if (pct <= 5 / 11) rating = 3;
      else if (pct <= 6 / 11) rating = 3.5;
      else if (pct <= 7 / 11) rating = 4;
      else if (pct <= 8 / 11) rating = 4.25;
      else if (pct <= 9 / 11) rating = 4.5;
      else if (pct <= 10 / 11) rating = 4.75;
      else rating = 5;

      starRating.style.setProperty("--fill-percent", `${fillPercentFromRating(rating)}%`);
      ratingPreview.textContent = `${formatKisses(rating)} preview`;
    });

    hitbox.addEventListener("mouseleave", () => {
      if (state.ratingDraft !== null) {
        starRating.style.setProperty("--fill-percent", `${fillPercentFromRating(state.ratingDraft)}%`);
        ratingPreview.textContent = `${formatKisses(state.ratingDraft)} selected`;
      } else {
        starRating.style.setProperty("--fill-percent", `0%`);
        ratingPreview.textContent = "Hover to choose a rating";
      }
    });
  }

  if (submitRatingBtn) {
    submitRatingBtn.addEventListener("click", () => {
      if (state.ratingDraft === null) return;
      updateItem(item.id, { watched: true, rating: state.ratingDraft });
      const refreshed = getItemById(item.id);
      renderAll();
      openModal(refreshed, fromRandom);
    });
  }

  if (resetDraftBtn) {
    resetDraftBtn.addEventListener("click", () => {
      state.ratingDraft = null;
      if (starRating) starRating.style.setProperty("--fill-percent", `0%`);
      if (ratingPreview) ratingPreview.textContent = "Hover to choose a rating";
      if (submitRatingBtn) submitRatingBtn.classList.add("hidden");
    });
  }

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
  state.sort = "date-desc";

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
  startFeaturedAutoplay();
});

featuredNextBtn.addEventListener("click", () => {
  state.featuredIndex += 1;
  renderFeatured();
  startFeaturedAutoplay();
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

startFeaturedAutoplay();