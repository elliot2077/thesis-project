/* ============================================
   AppleVault - Catalog Page Module
   Product listing, filtering, sorting, search
   Demonstrates: async/await, Promise.all,
   dynamic DOM rendering, event debouncing
   ============================================ */

import {
  loadAllProducts,
  loadProductsByCategory,
  loadCategories,
  searchProducts,
  fetchParallel,
} from "./api.js";
import { t, applyTranslations } from "./i18n.js";
import { formatPrice, addToCart, showToast } from "./app.js";

/* ---- State ---- */
let allProducts = [];
let filteredProducts = [];
let categories = [];
let currentCategory = "all";
let currentSort = "featured";
let currentSearch = "";
let maxPrice = 5000;
let priceFilter = 5000;

/* ---- DOM References ---- */
const productGrid = document.getElementById("product-grid");
const categoryTabs = document.getElementById("category-tabs");
const sortSelect = document.getElementById("catalog-sort");
const searchInput = document.getElementById("catalog-search");
const resultCount = document.getElementById("result-count");
const priceRange = document.getElementById("price-range");
const priceValue = document.getElementById("price-value");

/* ---- Initialization ---- */

/**
 * Initializes the catalog page.
 * Loads categories and products in parallel using Promise.all.
 * Demonstrates: Promise.all for parallel async operations
 */
async function initCatalog() {
  try {
    showLoadingState();

    // Parallel fetch: load categories and products simultaneously
    const [categoriesData, productsData] = await Promise.all([
      loadCategories(),
      loadAllProducts(),
    ]);

    categories = categoriesData;
    allProducts = productsData.products;
    filteredProducts = [...allProducts];

    // Calculate max price for filter
    maxPrice = Math.max(...allProducts.map((p) => p.price));
    priceFilter = maxPrice;

    // Check URL for pre-selected category
    const urlParams = new URLSearchParams(window.location.search);
    const urlCategory = urlParams.get("category");
    if (urlCategory) {
      currentCategory = urlCategory;
    }

    // Render UI components
    renderCategoryTabs();
    initPriceFilter();
    applyFilters();
    bindEvents();

    await applyTranslations();
  } catch (error) {
    console.error("Failed to initialize catalog:", error);
    showErrorState(error.message);
  }
}

/* ---- Rendering ---- */

/**
 * Renders the category tab buttons.
 */
function renderCategoryTabs() {
  if (!categoryTabs) return;

  const allTab = `<button class="category-tab ${
    currentCategory === "all" ? "category-tab--active" : ""
  }" data-category="all" data-i18n="catalog.all">${t("catalog.all")}</button>`;

  const tabs = categories
    .map(
      (cat) => `
    <button class="category-tab ${
      currentCategory === cat.id ? "category-tab--active" : ""
    }" data-category="${cat.id}">
      ${cat.icon} <span data-i18n="categories.${cat.id}">${t(`categories.${cat.id}`)}</span>
    </button>
  `,
    )
    .join("");

  categoryTabs.innerHTML = allTab + tabs;
}

/**
 * Renders the product grid with the filtered products.
 * Demonstrates: dynamic DOM creation, template literals
 */
function renderProducts() {
  if (!productGrid) return;

  if (filteredProducts.length === 0) {
    productGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">🔍</div>
        <h3 class="empty-state__title" data-i18n="catalog.no_results">${t(
          "catalog.no_results",
        )}</h3>
        <p class="empty-state__desc">${t("catalog.no_results")}</p>
        <button class="btn btn--secondary" id="clear-filters-btn" data-i18n="catalog.clear_filters">
          ${t("catalog.clear_filters")}
        </button>
      </div>
    `;

    const clearBtn = document.getElementById("clear-filters-btn");
    if (clearBtn) {
      clearBtn.addEventListener("click", clearAllFilters);
    }
    return;
  }

  const cards = filteredProducts
    .map(
      (product, index) => `
    <article class="product-card card" 
       style="animation-delay: ${index * 60}ms"
       data-product-id="${product.id}"
       aria-label="${product.name}">
      <a href="product.html?id=${product.id}" class="product-card__link">
        <div class="card__image">
          ${
            product.badge
              ? `<span class="card__badge card__badge--${product.badge.toLowerCase()}">${product.badge}</span>`
              : ""
          }
          <div class="card__image-gradient" style="background: ${product.gradient}">
            ${
              product.image
                ? `<img src="${product.image}" alt="${product.name}" class="product-media-img product-media-img--card${product.category === "iphones" ? " product-media-img--phone-card" : ""}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                 <span class="product-media-fallback product-media-fallback--card">${getCategoryEmoji(product.category)}</span>`
                : `<span class="product-media-fallback product-media-fallback--card" style="display: block;">
              ${getCategoryEmoji(product.category)}
            </span>`
            }
          </div>
        </div>
        <div class="card__body">
          <span class="card__category">${getCategoryLabel(product.category)}</span>
          <h3 class="card__title">${product.name}</h3>
          <div class="card__colors">
            ${product.colors
              .slice(0, 5)
              .map(
                (color) =>
                  `<span class="card__color-dot" style="background: ${color.hex};" title="${color.name}"></span>`,
              )
              .join("")}
          </div>
          <div class="card__price">
            <span data-i18n="product.from">${t("product.from")}</span> ${formatPrice(product.price)}
          </div>
        </div>
      </a>
      <button class="product-card__quick-add btn btn--primary btn--sm" data-product-id="${product.id}" aria-label="${t("catalog.quick_add")} ${product.name}">
        ${t("catalog.quick_add")}
      </button>
    </article>
  `,
    )
    .join("");

  productGrid.innerHTML = cards;

  // Animate cards in
  productGrid.querySelectorAll(".product-card").forEach((card) => {
    card.style.opacity = "0";
    card.style.transform = "translateY(20px)";

    requestAnimationFrame(() => {
      card.style.transition = "opacity 0.4s ease, transform 0.4s ease";
      card.style.opacity = "1";
      card.style.transform = "translateY(0)";
    });
  });

  updateResultCount();
}

/**
 * Updates the result count display.
 */
function updateResultCount() {
  if (!resultCount) return;
  resultCount.innerHTML = `<strong>${filteredProducts.length}</strong> ${t(
    "catalog.items_found",
  )}`;
}

/**
 * Shows loading skeleton placeholder.
 */
function showLoadingState() {
  if (!productGrid) return;

  const skeletons = Array(6)
    .fill("")
    .map(
      () => `
    <div class="skeleton skeleton--card"></div>
  `,
    )
    .join("");

  productGrid.innerHTML = skeletons;
}

/**
 * Shows an error state in the product grid.
 * @param {string} message - Error message
 */
function showErrorState(message) {
  if (!productGrid) return;

  productGrid.innerHTML = `
    <div class="empty-state">
      <div class="empty-state__icon">⚠️</div>
      <h3 class="empty-state__title" data-i18n="common.error">${t("common.error")}</h3>
      <p class="empty-state__desc">${message}</p>
      <button class="btn btn--primary" onclick="location.reload()" data-i18n="common.retry">
        ${t("common.retry")}
      </button>
    </div>
  `;
}

/* ---- Filtering & Sorting ---- */

/**
 * Applies all active filters and sorting to the product list.
 * Demonstrates: async data processing, chaining array methods
 */
function applyFilters() {
  // Start with all products or category-filtered
  let results =
    currentCategory === "all"
      ? [...allProducts]
      : allProducts.filter((p) => p.category === currentCategory);

  // Apply search filter
  if (currentSearch) {
    results = results.filter((p) => matchesSearch(p, currentSearch));
  }

  // Apply price filter
  results = results.filter((p) => p.price <= priceFilter);

  // Apply sorting
  switch (currentSort) {
    case "price_asc":
      results.sort((a, b) => a.price - b.price);
      break;
    case "price_desc":
      results.sort((a, b) => b.price - a.price);
      break;
    case "name":
      results.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "featured":
    default:
      results.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
      break;
  }

  filteredProducts = results;
  renderProducts();
}

/**
 * Clears all filters and resets to default view.
 */
function clearAllFilters() {
  currentCategory = "all";
  currentSearch = "";
  currentSort = "featured";
  priceFilter = maxPrice;

  if (searchInput) searchInput.value = "";
  if (sortSelect) sortSelect.value = "featured";
  if (priceRange) priceRange.value = maxPrice;
  if (priceValue) priceValue.textContent = formatPrice(maxPrice);

  renderCategoryTabs();
  applyFilters();
}

/**
 * Initializes the price range filter.
 */
function initPriceFilter() {
  if (!priceRange || !priceValue) return;

  priceRange.max = maxPrice;
  priceRange.value = maxPrice;
  priceValue.textContent = formatPrice(maxPrice);
}

/* ---- Event Handlers ---- */

/**
 * Creates a debounced version of a function.
 * Demonstrates: closures, setTimeout, async patterns
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Debounce delay in ms
 * @returns {Function} Debounced function
 */
function debounce(fn, delay = 300) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Binds event listeners for filtering, sorting, and searching.
 */
function bindEvents() {
  // Category tab clicks
  if (categoryTabs) {
    categoryTabs.addEventListener("click", (e) => {
      const tab = e.target.closest(".category-tab");
      if (!tab) return;

      currentCategory = tab.dataset.category;

      // Update active tab
      categoryTabs.querySelectorAll(".category-tab").forEach((t) => {
        t.classList.remove("category-tab--active");
      });
      tab.classList.add("category-tab--active");

      applyFilters();
    });
  }

  // Sort change
  if (sortSelect) {
    sortSelect.addEventListener("change", (e) => {
      currentSort = e.target.value;
      applyFilters();
    });
  }

  // Search input with debounce
  if (searchInput) {
    const debouncedSearch = debounce((value) => {
      currentSearch = value;
      applyFilters();
    }, 300);

    searchInput.addEventListener("input", (e) => {
      debouncedSearch(e.target.value);
    });
  }

  // Price range filter
  if (priceRange) {
    priceRange.addEventListener("input", (e) => {
      priceFilter = parseInt(e.target.value, 10);
      if (priceValue) {
        priceValue.textContent = formatPrice(priceFilter);
      }
      applyFilters();
    });
  }

  // Quick add button on product card hover/overlay
  if (productGrid) {
    productGrid.addEventListener("click", async (e) => {
      const quickAddBtn = e.target.closest(".product-card__quick-add");
      if (!quickAddBtn) return;

      e.preventDefault();

      const productId = quickAddBtn.dataset.productId;
      const product = allProducts.find((entry) => entry.id === productId);
      if (!product) return;

      const defaultOptions = getDefaultCartOptions(product);

      quickAddBtn.disabled = true;
      try {
        await addToCart(product, defaultOptions);
      } catch (error) {
        console.error("Quick add failed:", error);
        showToast(t("common.error"), "error");
      } finally {
        quickAddBtn.disabled = false;
      }
    });
  }
}

function getDefaultCartOptions(product) {
  const firstColor = product.colors?.[0]?.name || "";
  const firstStorageOption = product.specs?.storageOptions?.[0] || null;

  return {
    color: firstColor,
    storage: firstStorageOption?.size || "",
    priceAdd: firstStorageOption?.priceAdd || 0,
  };
}

/* ---- Helpers ---- */

/**
 * Gets the emoji icon for a category.
 * @param {string} category - Category ID
 * @returns {string} Emoji
 */
function getCategoryEmoji(category) {
  const emojis = {
    iphones: "📱",
    macbooks: "💻",
    accessories: "🎧",
  };
  return emojis[category] || "📦";
}

/**
 * Gets the display label for a category.
 * @param {string} category - Category ID
 * @returns {string} Display label
 */
function getCategoryLabel(category) {
  const labels = {
    iphones: t("categories.iphones"),
    macbooks: t("categories.macbooks"),
    accessories: t("categories.accessories"),
  };
  return labels[category] || category;
}

/**
 * Normalizes user and product text for tolerant searching.
 * Lowercases, removes diacritics, and strips punctuation to spaces.
 * @param {string} value
 * @returns {string}
 */
function normalizeSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Returns normalized text with spaces removed to catch "i phone" vs "iphone".
 * @param {string} value
 * @returns {string}
 */
function compactSearchText(value) {
  return normalizeSearchText(value).replace(/\s+/g, "");
}

/**
 * Computes bounded Levenshtein distance and exits early once limit is exceeded.
 * @param {string} a
 * @param {string} b
 * @param {number} limit
 * @returns {number}
 */
function boundedLevenshtein(a, b, limit) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  if (Math.abs(a.length - b.length) > limit) return limit + 1;

  let previous = new Array(b.length + 1);
  let current = new Array(b.length + 1);

  for (let j = 0; j <= b.length; j += 1) {
    previous[j] = j;
  }

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    let rowMin = current[0];

    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + cost,
      );
      rowMin = Math.min(rowMin, current[j]);
    }

    if (rowMin > limit) return limit + 1;
    [previous, current] = [current, previous];
  }

  return previous[b.length];
}

/**
 * Determines if query token is a close match for a candidate token.
 * @param {string} queryToken
 * @param {string} candidateToken
 * @returns {boolean}
 */
function isCloseTokenMatch(queryToken, candidateToken) {
  if (!queryToken || !candidateToken) return false;
  if (
    candidateToken.includes(queryToken) ||
    queryToken.includes(candidateToken)
  ) {
    return true;
  }

  // Keep typo tolerance conservative for very short tokens.
  if (queryToken.length <= 2 || candidateToken.length <= 2) {
    return false;
  }

  const maxDistance = queryToken.length >= 7 ? 2 : 1;
  return (
    boundedLevenshtein(queryToken, candidateToken, maxDistance) <= maxDistance
  );
}

/**
 * Creates searchable tokens for a product.
 * @param {object} product
 * @returns {string[]}
 */
function buildProductSearchTokens(product) {
  const categoryAliases = {
    iphones: "iphone phone ios",
    macbooks: "mac macbook laptop",
    accessories: "accessory accessories",
  };

  const searchableText = [
    product.name,
    product.category,
    categoryAliases[product.category],
    product.specs?.chip,
    product.specs?.ram,
    product.specs?.storage,
    product.tagline,
  ]
    .filter(Boolean)
    .join(" ");

  return normalizeSearchText(searchableText).split(" ").filter(Boolean);
}

/**
 * Tolerant search matcher for catalog products.
 * Handles punctuation/spacing differences and minor typos.
 * @param {object} product
 * @param {string} rawQuery
 * @returns {boolean}
 */
function matchesSearch(product, rawQuery) {
  const normalizedQuery = normalizeSearchText(rawQuery);
  if (!normalizedQuery) return true;

  const queryCompact = compactSearchText(rawQuery);
  const productTokens = buildProductSearchTokens(product);
  const productText = productTokens.join(" ");
  const productCompact = productText.replace(/\s+/g, "");

  if (
    productText.includes(normalizedQuery) ||
    productCompact.includes(queryCompact)
  ) {
    return true;
  }

  const queryTokens = normalizedQuery.split(" ").filter(Boolean);
  return queryTokens.every((queryToken) =>
    productTokens.some((candidateToken) =>
      isCloseTokenMatch(queryToken, candidateToken),
    ),
  );
}

/* ---- Start ---- */
initCatalog();
