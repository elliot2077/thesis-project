/* ============================================
   AppleVault - Home Page Module
   Featured products, categories display
   Demonstrates: async/await, Promise.all,
   dynamic rendering, intersection observer
   ============================================ */

import { loadFeaturedProducts, loadCategories, fetchParallel } from "./api.js";
import { t, applyTranslations } from "./i18n.js";
import { formatPrice, initScrollReveal } from "./app.js";

/* ---- DOM References ---- */
const categoriesGrid = document.getElementById("categories-grid");
const featuredGrid = document.getElementById("featured-grid");

/* ---- Initialization ---- */

/**
 * Initializes the home page.
 * Loads featured products and categories in parallel.
 * Demonstrates: Promise.all, concurrent async data fetching
 */
async function initHome() {
  try {
    // Load both data sets in parallel for faster page load
    const [categories, featuredProducts] = await Promise.all([
      loadCategories(),
      loadFeaturedProducts(),
    ]);

    renderCategories(categories);
    renderFeatured(featuredProducts);

    // Re-apply translations to dynamically rendered content
    await applyTranslations();

    // Re-initialize scroll reveal for new elements
    initScrollReveal();
  } catch (error) {
    console.error("Failed to initialize home page:", error);
  }
}

/* ---- Categories Rendering ---- */

/**
 * Renders the category cards on the homepage.
 * @param {object[]} categories - Array of category objects
 */
function renderCategories(categories) {
  if (!categoriesGrid) return;

  categoriesGrid.innerHTML = categories
    .map(
      (cat) => `
    <a href="catalog.html?category=${cat.id}" class="category-card reveal">
      <span class="category-card__icon">${cat.icon}</span>
      <h3 class="category-card__name" data-i18n="${cat.nameKey}">${t(cat.nameKey)}</h3>
      <p class="category-card__desc" data-i18n="${cat.descriptionKey}">${t(cat.descriptionKey)}</p>
      <span class="category-card__link" data-i18n="catalog.view_details">${t("catalog.view_details")}</span>
    </a>
  `,
    )
    .join("");
}

/* ---- Featured Products Rendering ---- */

/**
 * Renders the featured products grid on the homepage.
 * @param {object[]} products - Array of featured product objects
 */
function renderFeatured(products) {
  if (!featuredGrid) return;

  featuredGrid.innerHTML = products
    .map(
      (product) => `
    <a href="product.html?id=${product.id}" class="card product-card reveal">
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
        <p class="card__desc" data-i18n="${product.taglineKey}">${t(product.taglineKey)}</p>
        <div class="card__price">
          <span data-i18n="product.from">${t("product.from")}</span> ${formatPrice(product.price)}
        </div>
      </div>
    </a>
  `,
    )
    .join("");
}

/* ---- Helpers ---- */

function getCategoryEmoji(category) {
  const emojis = { iphones: "📱", macbooks: "💻", accessories: "🎧" };
  return emojis[category] || "📦";
}

function getCategoryLabel(category) {
  return t(`categories.${category}`) || category;
}

/* ---- Start ---- */
initHome();
