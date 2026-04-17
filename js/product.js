/* ============================================
   AppleVault - Product Detail Page Module
   Single product view, variant selection,
   add to cart, specifications, related products
   Demonstrates: async/await, Promise.all,
   URL params, dynamic rendering, state mgmt
   ============================================ */

import { loadProductById, loadRelatedProducts } from "./api.js";
import { t, applyTranslations } from "./i18n.js";
import { formatPrice, addToCart, getQueryParam, showToast } from "./app.js";

/* ---- State ---- */
let product = null;
let selectedColor = 0;
let selectedStorage = 0;
let currentPrice = 0;

/* ---- DOM References ---- */
const productContainer = document.getElementById("product-detail");
const specsContainer = document.getElementById("product-specs");
const relatedContainer = document.getElementById("related-products");

/* ---- Initialization ---- */

/**
 * Loads the product detail page.
 * Reads product ID from URL params, fetches data asynchronously.
 * Demonstrates: async/await, URL params, parallel fetch with Promise.all
 */
async function initProductPage() {
  const productId = getQueryParam("id");

  if (!productId) {
    showError("No product specified.");
    return;
  }

  try {
    showLoadingState();

    // Fetch product details and related products in parallel
    const [productData, relatedData] = await Promise.all([
      loadProductById(productId),
      loadRelatedProducts(productId, 4),
    ]);

    product = productData;
    currentPrice = product.price;

    // Render all product sections
    renderProduct();
    renderSpecs();
    renderRelated(relatedData);

    // Apply translations to newly rendered content
    await applyTranslations();

    // Update page title
    document.title = `${product.name} — AppleVault`;
  } catch (error) {
    console.error("Failed to load product:", error);
    showError(error.message);
  }
}

/* ---- Main Product Rendering ---- */

/**
 * Renders the main product detail view.
 * Demonstrates: template literals, dynamic DOM, event binding
 */
function renderProduct() {
  if (!productContainer || !product) return;

  const categoryLabel = getCategoryLabel(product.category);
  const hasStorage = product.specs?.storageOptions?.length > 0;

  productContainer.innerHTML = `
    <div class="product-hero">
      <!-- Gallery -->
      <div class="product-gallery">
        <div class="product-gallery__main">
          <div class="product-gallery__image" id="main-image" style="background: ${product.gradient};">
            ${
              product.image
                ? `<img src="${product.image}" alt="${product.name}" class="product-media-img product-media-img--hero${product.category === "iphones" ? " product-media-img--phone-hero" : ""}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                 <span class="product-media-fallback product-media-fallback--hero">${getCategoryEmoji(product.category)}</span>`
                : `<span class="product-media-fallback product-media-fallback--hero" style="display: block;">
              ${getCategoryEmoji(product.category)}
            </span>`
            }
          </div>
        </div>

      </div>

      <!-- Info -->
      <div class="product-info">
        <nav class="product-info__breadcrumb">
          <a href="catalog.html" data-i18n="product.back_to_catalog">${t("product.back_to_catalog")}</a>
          <span>/</span>
          <a href="catalog.html?category=${product.category}">${categoryLabel}</a>
          <span>/</span>
          <span>${product.name}</span>
        </nav>

        <h1 class="product-info__name">${product.name}</h1>
        <p class="product-info__tagline" data-i18n="${product.taglineKey}">${t(product.taglineKey)}</p>

        <div class="product-info__price" id="product-price">
          ${hasStorage ? `<span class="product-info__price-from" data-i18n="product.from">${t("product.from")}</span> ` : ""}
          ${formatPrice(currentPrice)}
        </div>

        <!-- Color Selector -->
        <div class="selector">
          <div class="selector__label">
            <span data-i18n="product.select_color">${t("product.select_color")}</span>
            <span class="selector__label-value" id="selected-color-name">${product.colors[0]?.name || ""}</span>
          </div>
          <div class="color-options" id="color-options">
            ${product.colors
              .map(
                (color, i) => `
              <button class="color-option ${i === 0 ? "color-option--active" : ""}" 
                      data-index="${i}" 
                      style="--swatch-color: ${color.hex};"
                      title="${color.name}"
                      aria-label="${color.name}">
              </button>
            `,
              )
              .join("")}
          </div>
        </div>

        <!-- Storage Selector -->
        ${
          hasStorage
            ? `
          <div class="selector">
            <div class="selector__label">
              <span data-i18n="product.select_storage">${t("product.select_storage")}</span>
            </div>
            <div class="storage-options" id="storage-options">
              ${product.specs.storageOptions
                .map(
                  (opt, i) => `
                <button class="storage-option ${i === 0 ? "storage-option--active" : ""}" data-index="${i}" data-price-add="${opt.priceAdd}">
                  <span class="storage-option__size">${opt.size}</span>
                  <span class="storage-option__price">${
                    opt.priceAdd > 0
                      ? `+${formatPrice(opt.priceAdd)}`
                      : t("product.from") + " " + formatPrice(product.price)
                  }</span>
                </button>
              `,
                )
                .join("")}
            </div>
          </div>
        `
            : ""
        }

        <!-- Add to Cart -->
        <div class="add-to-cart-section">
          <button class="btn btn--primary add-to-cart-btn" id="add-to-cart-btn" data-i18n="product.add_to_cart">
            ${t("product.add_to_cart")}
          </button>
        </div>

        <!-- Description -->
        <div class="product-description">
          <p class="product-description__text" data-i18n="${product.descriptionKey}">
            ${t(product.descriptionKey)}
          </p>
        </div>
      </div>
    </div>
  `;

  // Bind interactive events
  bindProductEvents();
}

/* ---- Specifications ---- */

/**
 * Renders the product specifications section.
 * Adapts layout based on product category.
 */
function renderSpecs() {
  if (!specsContainer || !product) return;

  const specs = product.specs;
  const rows = [];

  // Display specs
  if (specs.display) {
    rows.push({
      label: t("product.display"),
      value: formatDisplaySpecs(specs.display),
    });
  }

  // Chip
  if (specs.chip) {
    rows.push({
      label: t("product.chip"),
      value: localizeSpecText(specs.chip),
    });
  }

  // CPU
  if (specs.cpu) {
    rows.push({ label: t("product.cpu"), value: localizeSpecText(specs.cpu) });
  }

  // GPU
  if (specs.gpu) {
    rows.push({ label: t("product.gpu"), value: localizeSpecText(specs.gpu) });
  }

  // Camera
  if (specs.camera) {
    rows.push({
      label: t("product.camera"),
      value: formatCameraSpecs(specs.camera),
    });
  }

  // RAM
  if (specs.ram) {
    rows.push({ label: t("product.ram"), value: localizeSpecText(specs.ram) });
  }

  // Storage
  if (specs.storageOptions) {
    rows.push({
      label: t("product.storage"),
      value: specs.storageOptions
        .map((o) => localizeSpecText(o.size))
        .join(" / "),
    });
  }

  // Battery
  if (specs.battery || specs.batteryLife) {
    const battery = specs.battery || formatBatterySpecs(specs.batteryLife);
    rows.push({
      label: t("product.battery"),
      value: localizeSpecText(battery),
    });
  }

  // OS
  if (specs.os) {
    rows.push({ label: t("product.os"), value: localizeSpecText(specs.os) });
  }

  // Weight
  if (specs.weight) {
    rows.push({
      label: t("product.weight"),
      value: localizeSpecText(specs.weight),
    });
  }

  // Dimensions
  if (specs.dimensions) {
    rows.push({
      label: t("product.dimensions"),
      value: localizeSpecText(specs.dimensions),
    });
  }

  // Connectivity
  if (specs.connectivity) {
    rows.push({
      label: t("product.connectivity"),
      value: Array.isArray(specs.connectivity)
        ? specs.connectivity.map((entry) => localizeSpecText(entry)).join(", ")
        : localizeSpecText(specs.connectivity),
    });
  }

  // Water Resistance
  if (specs.waterResistance) {
    rows.push({
      label: t("product.water_resistance"),
      value: localizeSpecText(specs.waterResistance),
    });
  }

  // Security
  if (specs.security) {
    rows.push({
      label: t("product.security"),
      value: localizeSpecText(specs.security),
    });
  }

  // Material
  if (specs.material) {
    rows.push({
      label: t("product.material"),
      value: localizeSpecText(specs.material),
    });
  }

  specsContainer.innerHTML = `
    <div class="specs-section">
      <div class="container">
        <div class="specs-section__header">
          <h2 class="specs-section__title" data-i18n="product.tech_specs">${t("product.tech_specs")}</h2>
        </div>
        <div class="specs-table">
          ${rows
            .map(
              (row) => `
            <div class="specs-row">
              <div class="specs-row__label">${row.label}</div>
              <div class="specs-row__value">${row.value}</div>
            </div>
          `,
            )
            .join("")}
        </div>
      </div>
    </div>
  `;
}

/**
 * Formats display specifications into readable HTML.
 * @param {object} display - Display specs object
 * @returns {string} Formatted HTML string
 */
function formatDisplaySpecs(display) {
  const parts = [];
  if (display.size) parts.push(localizeSpecText(display.size));
  if (display.type) parts.push(localizeSpecText(display.type));
  if (display.resolution)
    parts.push(localizeSpecText(display.resolution + ` (${display.ppi} ppi)`));
  if (display.refreshRate) parts.push(localizeSpecText(display.refreshRate));
  if (display.brightness) parts.push(localizeSpecText(display.brightness));
  return parts.join("<br>");
}

/**
 * Formats camera specifications.
 * @param {object} camera - Camera specs object
 * @returns {string} Formatted HTML
 */
function formatCameraSpecs(camera) {
  const specs = [];
  if (camera.main)
    specs.push(`${t("product.camera_main")}: ${localizeSpecText(camera.main)}`);
  if (camera.ultrawide)
    specs.push(
      `${t("product.camera_ultrawide")}: ${localizeSpecText(camera.ultrawide)}`,
    );
  if (camera.telephoto)
    specs.push(
      `${t("product.camera_telephoto")}: ${localizeSpecText(camera.telephoto)}`,
    );
  if (camera.front)
    specs.push(
      `${t("product.camera_front")}: ${localizeSpecText(camera.front)}`,
    );
  if (camera.video)
    specs.push(
      `${t("product.camera_video")}: ${localizeSpecText(camera.video)}`,
    );
  return specs.join("<br>");
}

/**
 * Formats battery life specs.
 * @param {object} batteryLife - Battery specs object
 * @returns {string} Formatted string
 */
function formatBatterySpecs(batteryLife) {
  if (!batteryLife) return "";
  return Object.entries(batteryLife)
    .map(([key, value]) => {
      const translatedKey = t(`product.battery_${key}`);
      const label = translatedKey.startsWith("product.") ? key : translatedKey;
      return `${label}: ${localizeSpecText(value)}`;
    })
    .join("<br>");
}

function localizeSpecText(value) {
  if (typeof value !== "string") return value;

  const replacements = [
    ["Up to", t("product.spec_up_to")],
    ["hours video playback", t("product.spec_hours_video_playback")],
    ["hours", t("product.spec_hours")],
    ["low power mode", t("product.spec_low_power_mode")],
    ["peak outdoor", t("product.spec_peak_outdoor")],
    ["peak HDR", t("product.spec_peak_hdr")],
    ["peak XDR", t("product.spec_peak_xdr")],
  ];

  return replacements.reduce((result, [needle, translated]) => {
    if (!translated || translated.startsWith("product.")) {
      return result;
    }
    return result.replaceAll(needle, translated);
  }, value);
}

/* ---- Related Products ---- */

/**
 * Renders the related products section.
 * @param {object[]} related - Array of related products
 */
function renderRelated(related) {
  if (!relatedContainer || !related.length) return;

  relatedContainer.innerHTML = `
    <div class="related-section">
      <div class="container">
        <h2 class="related-section__title" data-i18n="product.related">${t("product.related")}</h2>
        <div class="related-grid">
          ${related
            .map(
              (p) => `
            <a href="product.html?id=${p.id}" class="card product-card">
              <div class="card__image">
                <div class="card__image-gradient" style="background: ${p.gradient}">
                  ${
                    p.image
                      ? `<img src="${p.image}" alt="${p.name}" class="product-media-img product-media-img--card${p.category === "iphones" ? " product-media-img--phone-card" : ""}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                       <span class="product-media-fallback product-media-fallback--related">${getCategoryEmoji(p.category)}</span>`
                      : `<span class="product-media-fallback product-media-fallback--related" style="display: block;">
                    ${getCategoryEmoji(p.category)}
                  </span>`
                  }
                </div>
              </div>
              <div class="card__body">
                <h3 class="card__title">${p.name}</h3>
                <div class="card__price">${formatPrice(p.price)}</div>
              </div>
            </a>
          `,
            )
            .join("")}
        </div>
      </div>
    </div>
  `;
}

/* ---- Event Binding ---- */

/**
 * Binds events for color/storage selection and add to cart.
 * Demonstrates: event delegation, async event handlers
 */
function bindProductEvents() {
  // Color selection
  const colorOptions = document.getElementById("color-options");
  const colorName = document.getElementById("selected-color-name");

  if (colorOptions) {
    colorOptions.addEventListener("click", (e) => {
      const option = e.target.closest(".color-option");
      if (!option) return;

      selectedColor = parseInt(option.dataset.index, 10);

      // Update active states
      colorOptions
        .querySelectorAll(".color-option")
        .forEach((o) => o.classList.remove("color-option--active"));
      option.classList.add("color-option--active");

      // Update color name
      if (colorName) {
        colorName.textContent = product.colors[selectedColor]?.name || "";
      }
    });
  }

  // Storage selection
  const storageOptions = document.getElementById("storage-options");
  if (storageOptions) {
    storageOptions.addEventListener("click", (e) => {
      const option = e.target.closest(".storage-option");
      if (!option) return;

      selectedStorage = parseInt(option.dataset.index, 10);
      const priceAdd = parseInt(option.dataset.priceAdd, 10) || 0;
      currentPrice = product.price + priceAdd;

      // Update active state
      storageOptions
        .querySelectorAll(".storage-option")
        .forEach((o) => o.classList.remove("storage-option--active"));
      option.classList.add("storage-option--active");

      // Update displayed price
      const priceEl = document.getElementById("product-price");
      if (priceEl) {
        priceEl.innerHTML = `
          <span class="product-info__price-from" data-i18n="product.from">${t("product.from")}</span>
          ${formatPrice(currentPrice)}
        `;
      }
    });
  }

  // Add to cart button
  const addToCartBtn = document.getElementById("add-to-cart-btn");
  if (addToCartBtn) {
    addToCartBtn.addEventListener("click", async () => {
      const storageOption = product.specs?.storageOptions?.[selectedStorage];

      await addToCart(product, {
        color: product.colors[selectedColor]?.name,
        storage: storageOption?.size || "",
        priceAdd: storageOption?.priceAdd || 0,
      });

      // Visual feedback
      addToCartBtn.classList.add("add-to-cart-btn--added");
      addToCartBtn.textContent = t("product.added_to_cart");

      setTimeout(() => {
        addToCartBtn.classList.remove("add-to-cart-btn--added");
        addToCartBtn.textContent = t("product.add_to_cart");
      }, 2000);
    });
  }
}

/* ---- Loading & Error States ---- */

/**
 * Shows loading skeleton for product page.
 */
function showLoadingState() {
  if (!productContainer) return;

  productContainer.innerHTML = `
    <div class="product-hero">
      <div class="product-gallery">
        <div class="skeleton" style="aspect-ratio: 1; border-radius: var(--radius-xl);"></div>
      </div>
      <div class="product-info">
        <div class="skeleton skeleton--text" style="width: 40%;"></div>
        <div class="skeleton skeleton--text-lg" style="width: 80%;"></div>
        <div class="skeleton skeleton--text" style="width: 60%;"></div>
        <div class="skeleton skeleton--text-lg" style="width: 30%; margin-top: 2rem;"></div>
        <div style="display: flex; gap: 1rem; margin-top: 2rem;">
          <div class="skeleton" style="width: 36px; height: 36px; border-radius: 50%;"></div>
          <div class="skeleton" style="width: 36px; height: 36px; border-radius: 50%;"></div>
          <div class="skeleton" style="width: 36px; height: 36px; border-radius: 50%;"></div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Shows an error message on the product page.
 * @param {string} message - Error message
 */
function showError(message) {
  if (!productContainer) return;

  productContainer.innerHTML = `
    <div class="empty-state" style="padding: 6rem 2rem;">
      <div class="empty-state__icon">😞</div>
      <h3 class="empty-state__title">Product Not Found</h3>
      <p class="empty-state__desc">${message}</p>
      <a href="catalog.html" class="btn btn--primary" data-i18n="product.back_to_catalog">
        ${t("product.back_to_catalog")}
      </a>
    </div>
  `;
}

/* ---- Helpers ---- */

function getCategoryEmoji(category) {
  const emojis = { iphones: "📱", macbooks: "💻", accessories: "🎧" };
  return emojis[category] || "📦";
}

function getCategoryLabel(category) {
  const labels = {
    iphones: t("categories.iphones"),
    macbooks: t("categories.macbooks"),
    accessories: t("categories.accessories"),
  };
  return labels[category] || category;
}

/* ---- Start ---- */
initProductPage();
