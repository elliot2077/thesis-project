/* ============================================
   AppleVault - Cart Page Module
   Cart display, quantity management, totals,
   checkout simulation
   Demonstrates: async/await, localStorage,
   dynamic DOM updates, event delegation
   ============================================ */

import { t, applyTranslations } from "./i18n.js";
import {
  getCart,
  removeFromCart,
  updateCartQuantity,
  clearCart,
  formatPrice,
  showToast,
  getCartCount,
  updateCartBadge,
} from "./app.js";
import { simulateDelay } from "./api.js";

/* ---- DOM References ---- */
const cartContainer = document.getElementById("cart-container");

/* ---- State ---- */
const TAX_RATE = 0.08;

/* ---- Initialization ---- */

/**
 * Initializes the cart page.
 * Loads cart data from localStorage and renders the UI.
 * Demonstrates: async initialization, conditional rendering
 */
async function initCart() {
  try {
    // Simulate async cart loading (as if from an API)
    await simulateDelay(200);

    const cart = getCart();
    renderCart(cart);

    await applyTranslations();
  } catch (error) {
    console.error("Failed to initialize cart:", error);
  }
}

/* ---- Cart Rendering ---- */

/**
 * Renders the complete cart view.
 * Shows empty state or cart items + summary.
 * @param {object[]} cart - Array of cart items
 */
function renderCart(cart) {
  if (!cartContainer) return;

  if (cart.length === 0) {
    renderEmptyCart();
    return;
  }

  const subtotal = calculateSubtotal(cart);
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  cartContainer.innerHTML = `
    <!-- Cart Header -->
    <div class="cart-header">
      <h1 class="cart-header__title" data-i18n="cart.title">${t("cart.title")}</h1>
      <p class="cart-header__count">
        ${itemCount} ${itemCount === 1 ? t("cart.item") : t("cart.items")}
      </p>
    </div>

    <div class="container">
      <div class="cart-layout">
        <!-- Cart Items Column -->
        <div>
          <div class="cart-clear">
            <button class="cart-clear__btn" id="clear-cart-btn" data-i18n="cart.clear_cart">
              ${t("cart.clear_cart")}
            </button>
          </div>
          <div class="cart-items" id="cart-items">
            ${cart.map((item) => renderCartItem(item)).join("")}
          </div>
        </div>

        <!-- Order Summary Column -->
        <div class="cart-summary">
          <h2 class="cart-summary__title" data-i18n="cart.order_summary">${t("cart.order_summary")}</h2>

          <div class="cart-summary__row">
            <span class="cart-summary__label" data-i18n="cart.subtotal">${t("cart.subtotal")}</span>
            <span class="cart-summary__value" id="summary-subtotal">${formatPrice(subtotal)}</span>
          </div>

          <div class="cart-summary__row">
            <span class="cart-summary__label" data-i18n="cart.shipping">${t("cart.shipping")}</span>
            <span class="cart-summary__value cart-summary__value--free" data-i18n="cart.shipping_free">
              ${t("cart.shipping_free")}
            </span>
          </div>

          <div class="cart-summary__row">
            <span class="cart-summary__label" data-i18n="cart.tax">${t("cart.tax")}</span>
            <span class="cart-summary__value" id="summary-tax">${formatPrice(tax)}</span>
          </div>

          <div class="cart-summary__row cart-summary__row--total">
            <span data-i18n="cart.total">${t("cart.total")}</span>
            <span id="summary-total">${formatPrice(total)}</span>
          </div>

          <div class="cart-summary__checkout">
            <button class="btn btn--primary btn--block btn--lg" id="checkout-btn" data-i18n="cart.checkout">
              ${t("cart.checkout")}
            </button>
          </div>

          <a href="catalog.html" class="cart-summary__continue" data-i18n="cart.continue_shopping">
            ${t("cart.continue_shopping")}
          </a>
        </div>
      </div>
    </div>
  `;

  bindCartEvents();
}

/**
 * Renders a single cart item.
 * @param {object} item - Cart item object
 * @returns {string} HTML string for the cart item
 */
function renderCartItem(item) {
  const lineTotal = item.price * item.quantity;

  return `
    <div class="cart-item" data-cart-id="${item.cartItemId}">
      <div class="cart-item__image" style="background: ${item.gradient || "var(--color-border-light)"}">
        ${
          item.image
            ? `<img src="${item.image}" alt="${item.name}" class="product-media-img product-media-img--cart" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';">
             <span class="product-media-fallback" style="display: none;">${getCategoryEmoji(item.category)}</span>`
            : `<span class="product-media-fallback" style="display: block;">${getCategoryEmoji(item.category)}</span>`
        }
      </div>

      <div class="cart-item__details">
        <a href="product.html?id=${item.productId}" class="cart-item__name">${item.name}</a>
        <span class="cart-item__variant">
          ${[item.color, item.storage].filter(Boolean).join(" • ")}
        </span>
        <span class="cart-item__price">${formatPrice(item.price)}</span>
      </div>

      <div class="cart-item__actions">
        <span class="cart-item__line-total">${formatPrice(lineTotal)}</span>

        <div class="qty-control">
          <button class="qty-control__btn qty-minus" data-cart-id="${item.cartItemId}" 
                  ${item.quantity <= 1 ? "disabled" : ""} aria-label="Decrease quantity">−</button>
          <span class="qty-control__value">${item.quantity}</span>
          <button class="qty-control__btn qty-plus" data-cart-id="${item.cartItemId}" 
                  aria-label="Increase quantity">+</button>
        </div>

        <button class="cart-item__remove" data-cart-id="${item.cartItemId}" data-i18n="cart.remove">
          ${t("cart.remove")}
        </button>
      </div>
    </div>
  `;
}

/**
 * Renders the empty cart state.
 */
function renderEmptyCart() {
  if (!cartContainer) return;

  cartContainer.innerHTML = `
    <div class="cart-empty">
      <div class="cart-empty__icon">🛒</div>
      <h2 class="cart-empty__title" data-i18n="cart.empty">${t("cart.empty")}</h2>
      <p class="cart-empty__desc" data-i18n="cart.empty_desc">${t("cart.empty_desc")}</p>
      <a href="catalog.html" class="btn btn--primary btn--lg" data-i18n="cart.continue_shopping">
        ${t("cart.continue_shopping")}
      </a>
    </div>
  `;
}

/* ---- Calculations ---- */

/**
 * Calculates the cart subtotal.
 * @param {object[]} cart - Cart items
 * @returns {number} Subtotal amount
 */
function calculateSubtotal(cart) {
  return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

/**
 * Updates the summary totals without full re-render.
 */
function updateSummary() {
  const cart = getCart();
  const subtotal = calculateSubtotal(cart);
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;

  const subtotalEl = document.getElementById("summary-subtotal");
  const taxEl = document.getElementById("summary-tax");
  const totalEl = document.getElementById("summary-total");

  if (subtotalEl) subtotalEl.textContent = formatPrice(subtotal);
  if (taxEl) taxEl.textContent = formatPrice(tax);
  if (totalEl) totalEl.textContent = formatPrice(total);
}

/* ---- Event Handlers ---- */

/**
 * Binds event listeners for cart interactions.
 * Uses event delegation for dynamic elements.
 * Demonstrates: event delegation, async handlers
 */
function bindCartEvents() {
  const cartItems = document.getElementById("cart-items");
  const clearCartBtn = document.getElementById("clear-cart-btn");
  const checkoutBtn = document.getElementById("checkout-btn");

  // Quantity and remove controls via event delegation
  if (cartItems) {
    cartItems.addEventListener("click", async (e) => {
      const target = e.target;

      // Decrease quantity
      if (target.classList.contains("qty-minus")) {
        const cartItemId = target.dataset.cartId;
        const cart = getCart();
        const item = cart.find((i) => i.cartItemId === cartItemId);
        if (item && item.quantity > 1) {
          updateCartQuantity(cartItemId, item.quantity - 1);
          renderCart(getCart());
        }
        return;
      }

      // Increase quantity
      if (target.classList.contains("qty-plus")) {
        const cartItemId = target.dataset.cartId;
        const cart = getCart();
        const item = cart.find((i) => i.cartItemId === cartItemId);
        if (item) {
          updateCartQuantity(cartItemId, item.quantity + 1);
          renderCart(getCart());
        }
        return;
      }

      // Remove item
      if (target.classList.contains("cart-item__remove")) {
        const cartItemId = target.dataset.cartId;
        const itemEl = target.closest(".cart-item");

        // Animate removal
        if (itemEl) {
          itemEl.style.transition = "all 0.3s ease";
          itemEl.style.opacity = "0";
          itemEl.style.transform = "translateX(50px)";

          await new Promise((resolve) => setTimeout(resolve, 300));
        }

        removeFromCart(cartItemId);
        renderCart(getCart());
        showToast(t("cart.remove") + " ✓");
        return;
      }
    });
  }

  // Clear entire cart
  if (clearCartBtn) {
    clearCartBtn.addEventListener("click", () => {
      if (confirm("Clear all items from your cart?")) {
        clearCart();
        renderCart([]);
        showToast("Cart cleared");
      }
    });
  }

  // Checkout simulation
  if (checkoutBtn) {
    checkoutBtn.addEventListener("click", () => {
      window.location.href = "checkout.html";
    });
  }
}

/* ---- Helpers ---- */

function getCategoryEmoji(category) {
  const emojis = { iphones: "📱", macbooks: "💻", accessories: "🎧" };
  return emojis[category] || "📦";
}

/* ---- Cart Updated Listener ---- */
window.addEventListener("cartUpdated", () => {
  // Re-render if cart page is active
  if (cartContainer) {
    renderCart(getCart());
  }
});

/* ---- Start ---- */
initCart();
