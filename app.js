const state = {
  type: "all",
  search: "",
  vibe: "all",
  sort: "title-asc",
  favoritesOnly: "all"
};

const favoritesRow = document.getElementById("favoritesRow");
const cardGrid = document.getElementById("cardGrid");
const searchInput = document.getElementById("searchInput");
const vibeSelect = document.getElementById("vibeSelect");
const sortSelect = document.getElementById("sortSelect");
const favoritesOnly = document.getElementById("favoritesOnly");
const resultsTitle = document.getElementById("resultsTitle");
const resultsMeta = document.getElementById("resultsMeta");
const clearFiltersBtn = document.getElementById("clearFiltersBtn");
const randomPickBtn = document.getElementById("randomPickBtn");

const detailsModal = document.getElementById("detailsModal");
const modalBackdrop = document.getElementById("modalBackdrop");
const modalBody = document.getElementById("modalBody");
const closeModalBtn = document.getElementById("closeModalBtn");

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getPosterMarkup(item, className = "poster") {
  if (item.poster && item.poster.trim()) {
    return `
      <div class="${className}">
        <img src="${escapeHtml(item.poster)}" alt="${escapeHtml(item.title)} poster" loading="lazy" />
      </div>
    `;
  }

  return `
    <div class="${className}">
      <div class="poster-fallback">${escapeHtml(item.title)}</div>
    </div>
  `;
}

function getUniqueVibes(items) {
  return [...new Set(items.map(item => item.vibe))].sort((a, b) => a.localeCompare(b));
}

function populateVibeSelect() {
  const vibes = getUniqueVibes(WATCHLIST);
  vibeSelect.innerHTML = `
    <option value="all">All vibes</option>
    ${vibes.map(vibe => `<option value="${escapeHtml(vibe)}">${escapeHtml(vibe)}</option>`).join("")}
  `;
}

function renderFavorites() {
  const favorites = WATCHLIST.filter(item => item.favorite);

  favoritesRow.innerHTML = favorites.map(item => `
    <article class="favorite-card" data-title="${escapeHtml(item.title)}">
      ${getPosterMarkup(item, "favorite-poster")}
      <div class="favorite-body">
        <h3>${escapeHtml(item.title)}</h3>
        <p><em>${escapeHtml(item.hint)}</em></p>
      </div>
    </article>
  `).join("");

  favoritesRow.querySelectorAll(".favorite-card").forEach((card, index) => {
    card.addEventListener("click", () => openModal(favorites[index]));
  });
}

function filterItems(items) {
  return items.filter(item => {
    const matchesType = state.type === "all" || item.type === state.type;
    const matchesVibe = state.vibe === "all" || item.vibe === state.vibe;
    const matchesFavorite = state.favoritesOnly === "all" || item.favorite;
    const q = state.search;

    const matchesSearch =
      !q ||
      item.title.toLowerCase().includes(q) ||
      item.hint.toLowerCase().includes(q) ||
      item.vibe.toLowerCase().includes(q);

    return matchesType && matchesVibe && matchesFavorite && matchesSearch;
  });
}

function sortItems(items) {
  const sorted = [...items];

  switch (state.sort) {
    case "title-desc":
      sorted.sort((a, b) => b.title.localeCompare(a.title));
      break;
    case "year-desc":
      sorted.sort((a, b) => (b.year || 0) - (a.year || 0));
      break;
    case "year-asc":
      sorted.sort((a, b) => (a.year || 9999) - (b.year || 9999));
      break;
    default:
      sorted.sort((a, b) => a.title.localeCompare(b.title));
  }

  return sorted;
}

function renderCards(items) {
  if (!items.length) {
    cardGrid.innerHTML = `
      <div class="empty-state">
        <h3>Nothing matched</h3>
        <p>your filters got too specific; loosen them up a little</p>
      </div>
    `;
    return;
  }

  cardGrid.innerHTML = items.map((item, index) => `
    <article class="card" data-index="${index}">
      ${getPosterMarkup(item)}
      <div class="card-body">
        <div class="meta-row">
          <span class="badge">${escapeHtml(item.type)}</span>
          <span class="badge">${escapeHtml(item.vibe)}</span>
          ${item.year ? `<span class="badge">${item.year}</span>` : ""}
          ${item.favorite ? `<span class="badge favorite-badge">favorite</span>` : ""}
        </div>
        <h3>${escapeHtml(item.title)}</h3>
        <p><em>${escapeHtml(item.hint)}</em></p>
      </div>
    </article>
  `).join("");

  cardGrid.querySelectorAll(".card").forEach((card, index) => {
    card.addEventListener("click", () => openModal(items[index]));
  });
}

function updateResults(items) {
  const typeLabelMap = {
    all: "All Titles",
    movie: "Movies",
    show: "TV Shows",
    anime: "Anime"
  };

  const base = typeLabelMap[state.type];
  const vibePart = state.vibe === "all" ? "" : ` • ${state.vibe}`;
  const favPart = state.favoritesOnly === "favorites" ? " • Favorites" : "";

  resultsTitle.textContent = `${base}${vibePart}${favPart}`;
  resultsMeta.textContent = `${items.length} title${items.length === 1 ? "" : "s"}`;
}

function openModal(item) {
  modalBody.innerHTML = `
    ${getPosterMarkup(item, "modal-poster")}
    <div class="modal-content">
      <h2>${escapeHtml(item.title)}</h2>
      <div class="detail-row">
        <span class="detail">${escapeHtml(item.type)}</span>
        <span class="detail">${escapeHtml(item.vibe)}</span>
        ${item.year ? `<span class="detail">${item.year}</span>` : ""}
        ${item.favorite ? `<span class="detail">favorite</span>` : ""}
      </div>
      <p><em>${escapeHtml(item.hint)}</em></p>
    </div>
  `;

  detailsModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  detailsModal.classList.add("hidden");
  document.body.style.overflow = "";
}

function render() {
  const filtered = filterItems(WATCHLIST);
  const sorted = sortItems(filtered);
  renderCards(sorted);
  updateResults(sorted);
}

document.querySelectorAll(".top-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    state.type = tab.dataset.type;
    document.querySelectorAll(".top-tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    render();
  });
});

searchInput.addEventListener("input", e => {
  state.search = e.target.value.trim().toLowerCase();
  render();
});

vibeSelect.addEventListener("change", e => {
  state.vibe = e.target.value;
  render();
});

sortSelect.addEventListener("change", e => {
  state.sort = e.target.value;
  render();
});

favoritesOnly.addEventListener("change", e => {
  state.favoritesOnly = e.target.value;
  render();
});

clearFiltersBtn.addEventListener("click", () => {
  state.type = "all";
  state.search = "";
  state.vibe = "all";
  state.sort = "title-asc";
  state.favoritesOnly = "all";

  searchInput.value = "";
  vibeSelect.value = "all";
  sortSelect.value = "title-asc";
  favoritesOnly.value = "all";

  document.querySelectorAll(".top-tab").forEach(t => t.classList.remove("active"));
  document.querySelector('.top-tab[data-type="all"]').classList.add("active");

  render();
});

randomPickBtn.addEventListener("click", () => {
  const filtered = sortItems(filterItems(WATCHLIST));
  if (!filtered.length) return;
  const pick = filtered[Math.floor(Math.random() * filtered.length)];
  openModal(pick);
});

closeModalBtn.addEventListener("click", closeModal);
modalBackdrop.addEventListener("click", closeModal);

document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeModal();
});

populateVibeSelect();
renderFavorites();
render();