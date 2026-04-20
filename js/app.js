/* ============================================
   AppleVault - Main Application Module
   Navigation, cart badge, scroll effects,
   toast notifications, global utilities
   Demonstrates: async/await, DOM events, modules
   ============================================ */

import { initI18n, t, setLanguage, getCurrentLanguage } from "./i18n.js";
import { getFirebaseAuth, signOut } from "./firebase.js";

const ORDERS_STORAGE_KEY = "applevault_orders";

/* ---- Cart Utilities (localStorage) ---- */

/**
 * Retrieves the cart from localStorage.
 * @returns {object[]} Array of cart items
 */
function getCart() {
  try {
    return JSON.parse(localStorage.getItem("applevault_cart")) || [];
  } catch {
    return [];
  }
}

/**
 * Saves the cart to localStorage.
 * @param {object[]} cart - Cart items array
 */
function saveCart(cart) {
  localStorage.setItem("applevault_cart", JSON.stringify(cart));
  updateCartBadge();
  window.dispatchEvent(new CustomEvent("cartUpdated", { detail: { cart } }));
}

/**
 * Gets the total number of items in cart.
 * @returns {number}
 */
function getCartCount() {
  const cart = getCart();
  return cart.reduce((total, item) => total + item.quantity, 0);
}

/**
 * Adds a product to the cart.
 * Demonstrates: async simulation, state management
 * @param {object} product - Product to add
 * @param {object} options - Selected options (color, storage)
 * @returns {Promise<object[]>} Updated cart
 */
async function addToCart(product, options = {}) {
  const cart = getCart();

  const cartItemId = `${product.id}-${options.color || ""}-${options.storage || ""}`;

  const existingIndex = cart.findIndex(
    (item) => item.cartItemId === cartItemId,
  );

  if (existingIndex > -1) {
    cart[existingIndex].quantity += 1;
  } else {
    cart.push({
      cartItemId,
      productId: product.id,
      name: product.name,
      price: product.price + (options.priceAdd || 0),
      color: options.color || product.colors?.[0]?.name || "",
      storage: options.storage || "",
      gradient: product.gradient,
      category: product.category,
      image: product.image || "",
      quantity: 1,
    });
  }

  saveCart(cart);
  showToast(
    `${product.name} ${t("product.added_to_cart") || "added to cart!"}`,
  );
  return cart;
}

/**
 * Removes an item from the cart.
 * @param {string} cartItemId - Unique cart item identifier
 * @returns {object[]} Updated cart
 */
function removeFromCart(cartItemId) {
  let cart = getCart();
  cart = cart.filter((item) => item.cartItemId !== cartItemId);
  saveCart(cart);
  return cart;
}

/**
 * Updates the quantity of a cart item.
 * @param {string} cartItemId - Unique cart item identifier
 * @param {number} quantity - New quantity
 * @returns {object[]} Updated cart
 */
function updateCartQuantity(cartItemId, quantity) {
  const cart = getCart();
  const item = cart.find((i) => i.cartItemId === cartItemId);
  if (item) {
    item.quantity = Math.max(1, quantity);
  }
  saveCart(cart);
  return cart;
}

/**
 * Clears the entire cart.
 * @returns {object[]} Empty cart
 */
function clearCart() {
  saveCart([]);
  return [];
}

/* ---- Auth Utilities (localStorage) ---- */

/**
 * Gets the current user session from localStorage.
 * @returns {object|null} User session or null
 */
function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("applevault_user"));
  } catch {
    return null;
  }
}

/**
 * Saves user session.
 * @param {object} user - User data with token
 */
function saveUserSession(user) {
  localStorage.setItem("applevault_user", JSON.stringify(user));
  updateAuthUI();
}

/**
 * Clears user session (logout).
 */
async function logoutUser() {
  try {
    const auth = getFirebaseAuth();
    if (auth.currentUser) {
      await signOut(auth);
    }
  } catch (error) {
    console.warn("Firebase sign-out warning:", error);
  } finally {
    localStorage.removeItem("applevault_user");
    updateAuthUI();
    showToast("Signed out successfully");
  }
}

/**
 * Checks if user is logged in.
 * @returns {boolean}
 */
function isLoggedIn() {
  return getCurrentUser() !== null;
}

/* ---- Order Utilities (localStorage) ---- */

function getUserOrderKey(user = getCurrentUser()) {
  if (!user) return null;
  return user.uid || user.email || null;
}

function getAllOrdersMap() {
  try {
    return JSON.parse(localStorage.getItem(ORDERS_STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveAllOrdersMap(ordersMap) {
  localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(ordersMap));
}

function getOrdersForCurrentUser() {
  const userKey = getUserOrderKey();
  if (!userKey) return [];

  const ordersMap = getAllOrdersMap();
  const orders = ordersMap[userKey] || [];
  return [...orders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

function placeOrder(details = {}) {
  const user = getCurrentUser();
  const userKey = getUserOrderKey(user);
  const cart = getCart();

  if (!user || !userKey) {
    throw new Error("Please sign in to place an order.");
  }

  if (!cart.length) {
    throw new Error("Your cart is empty.");
  }

  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const taxRate = 0.08;
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  const order = {
    id: `AV-${Date.now().toString(36).toUpperCase()}`,
    createdAt: new Date().toISOString(),
    user: {
      uid: user.uid || null,
      email: user.email || "",
      firstName: user.firstName || "",
      lastName: user.lastName || "",
    },
    items: cart,
    itemCount: cart.reduce((sum, item) => sum + item.quantity, 0),
    subtotal,
    tax,
    total,
    shipping: {
      fullName: details.fullName || "",
      email: details.email || user.email || "",
      phone: details.phone || "",
      address1: details.address1 || "",
      address2: details.address2 || "",
      city: details.city || "",
      country: details.country || "",
      zip: details.zip || "",
    },
    payment: {
      method: details.paymentMethod || "cash",
      cardholder: details.cardholder || "",
      cardLast4: details.cardLast4 || "",
    },
  };

  const ordersMap = getAllOrdersMap();
  const currentOrders = ordersMap[userKey] || [];
  ordersMap[userKey] = [order, ...currentOrders];
  saveAllOrdersMap(ordersMap);

  clearCart();
  window.dispatchEvent(new CustomEvent("orderPlaced", { detail: { order } }));

  return order;
}

/* ---- UI Updates ---- */

/**
 * Updates the cart badge count in the navigation.
 */
function updateCartBadge() {
  const badge = document.getElementById("cart-badge");
  if (!badge) return;

  const count = getCartCount();
  badge.textContent = count;

  if (count > 0) {
    badge.classList.add("nav__cart-badge--visible");
  } else {
    badge.classList.remove("nav__cart-badge--visible");
  }
}

/**
 * Updates the auth-related UI in navigation.
 * Shows user name when logged in, sign-in link when not.
 */
function updateAuthUI() {
  const authLink = document.getElementById("auth-link");
  const userName = document.getElementById("user-name");
  const logoutBtn = document.getElementById("logout-btn");
  const navActions = document.querySelector(".nav__actions");
  const mobileMenu = document.getElementById("mobile-menu");
  const mobileAuthLink = mobileMenu?.querySelector('a[href="login.html"]');

  const user = getCurrentUser();

  let accountLink = document.getElementById("account-link");
  if (!accountLink && navActions) {
    accountLink = document.createElement("a");
    accountLink.href = "account.html";
    accountLink.id = "account-link";
    accountLink.className = "nav__auth-link";
    navActions.insertBefore(accountLink, logoutBtn || null);
  }

  let mobileAccountLink = document.getElementById("mobile-account-link");
  if (!mobileAccountLink && mobileMenu) {
    mobileAccountLink = document.createElement("a");
    mobileAccountLink.href = "account.html";
    mobileAccountLink.id = "mobile-account-link";
    mobileMenu.appendChild(mobileAccountLink);
    mobileAccountLink.addEventListener("click", () => {
      mobileMenu.classList.remove("nav__mobile-menu--open");
    });
  }

  let mobileLogoutLink = document.getElementById("mobile-logout-link");
  if (!mobileLogoutLink && mobileMenu) {
    mobileLogoutLink = document.createElement("a");
    mobileLogoutLink.href = "#";
    mobileLogoutLink.id = "mobile-logout-link";
    mobileMenu.appendChild(mobileLogoutLink);
    mobileLogoutLink.addEventListener("click", async (e) => {
      e.preventDefault();
      mobileMenu.classList.remove("nav__mobile-menu--open");
      await logoutUser();
      window.location.href = "index.html";
    });
  }

  if (authLink) {
    authLink.style.display = user ? "none" : "inline";
  }
  if (userName) {
    userName.style.display = user ? "inline" : "none";
    userName.textContent = user?.email?.split("@")[0] || "";
  }
  if (logoutBtn) {
    logoutBtn.style.display = user ? "inline" : "none";
  }
  if (accountLink) {
    accountLink.style.display = user ? "inline" : "none";
    accountLink.textContent = t("nav.account");
  }
  if (mobileAccountLink) {
    mobileAccountLink.style.display = user ? "block" : "none";
    mobileAccountLink.textContent = t("nav.account");
  }
  if (mobileAuthLink) {
    mobileAuthLink.style.display = user ? "none" : "block";
  }
  if (mobileLogoutLink) {
    mobileLogoutLink.style.display = user ? "block" : "none";
    mobileLogoutLink.textContent = t("nav.logout");
  }
}

/* ---- Toast Notifications ---- */

/**
 * Shows a toast notification.
 * @param {string} message - Toast message
 * @param {string} type - 'success' | 'error' | 'warning'
 * @param {number} duration - Duration in ms before auto-dismiss
 */
function showToast(message, type = "success", duration = 3000) {
  let container = document.querySelector(".toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast ${type !== "success" ? `toast--${type}` : ""}`;
  toast.innerHTML = `
    <span class="toast__message">${message}</span>
    <button class="toast__close" aria-label="Close">×</button>
  `;

  container.appendChild(toast);

  // Close button handler
  const closeBtn = toast.querySelector(".toast__close");
  closeBtn.addEventListener("click", () => dismissToast(toast));

  // Auto dismiss
  setTimeout(() => dismissToast(toast), duration);
}

/**
 * Dismisses a toast with animation.
 * @param {HTMLElement} toast - Toast element
 */
function dismissToast(toast) {
  if (!toast || toast.classList.contains("toast--removing")) return;
  toast.classList.add("toast--removing");
  setTimeout(() => toast.remove(), 300);
}

/* ---- Navigation ---- */

/**
 * Initializes the navigation functionality.
 * Mobile menu toggle, scroll effects, active link highlighting.
 */
function initNavigation() {
  const toggle = document.getElementById("nav-toggle");
  const mobileMenu = document.getElementById("mobile-menu");
  initLanguageSelector();

  // Mobile menu toggle
  if (toggle && mobileMenu) {
    toggle.addEventListener("click", () => {
      mobileMenu.classList.toggle("nav__mobile-menu--open");
      toggle.setAttribute(
        "aria-expanded",
        mobileMenu.classList.contains("nav__mobile-menu--open"),
      );
    });

    // Close mobile menu when a link is clicked
    mobileMenu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        mobileMenu.classList.remove("nav__mobile-menu--open");
      });
    });
  }

  // Highlight current page in nav
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav__link").forEach((link) => {
    const href = link.getAttribute("href");
    if (href === currentPage) {
      link.classList.add("nav__link--active");
    }
  });

  // Logout button
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      await logoutUser();
      window.location.href = "index.html";
    });
  }
}

/**
 * Renders and binds the global language selector in the nav.
 */
function initLanguageSelector() {
  const navActions = document.querySelector(".nav__actions");
  const mobileMenu = document.getElementById("mobile-menu");
  if (!navActions || document.getElementById("language-select")) return;

  const wrapper = document.createElement("div");
  wrapper.className = "nav__language";

  const select = document.createElement("select");
  select.id = "language-select";
  select.className = "nav__language-select";
  select.setAttribute("aria-label", t("nav.language"));
  select.innerHTML = `
    <option value="en">EN</option>
    <option value="ro">RO</option>
    <option value="ru">RU</option>
  `;
  select.value = getCurrentLanguage();

  bindLanguageChange(select);

  wrapper.appendChild(select);
  navActions.insertBefore(wrapper, navActions.firstChild);

  if (mobileMenu && !document.getElementById("mobile-language-select")) {
    const mobileWrapper = document.createElement("div");
    mobileWrapper.className = "nav__mobile-language";

    const mobileLabel = document.createElement("label");
    mobileLabel.className = "nav__mobile-language-label";
    mobileLabel.setAttribute("for", "mobile-language-select");
    mobileLabel.textContent = t("nav.language");

    const mobileSelect = document.createElement("select");
    mobileSelect.id = "mobile-language-select";
    mobileSelect.className = "nav__mobile-language-select";
    mobileSelect.setAttribute("aria-label", t("nav.language"));
    mobileSelect.innerHTML = select.innerHTML;
    mobileSelect.value = getCurrentLanguage();
    bindLanguageChange(mobileSelect);

    mobileWrapper.appendChild(mobileLabel);
    mobileWrapper.appendChild(mobileSelect);
    mobileMenu.appendChild(mobileWrapper);
  }
}

function bindLanguageChange(selectElement) {
  selectElement.addEventListener("change", async (e) => {
    const selectedLanguage = e.target.value;
    await setLanguage(selectedLanguage);
    window.location.reload();
  });
}

/* ---- Scroll Reveal Animations ---- */

/**
 * Initializes intersection observer for scroll-reveal animations.
 * Demonstrates: IntersectionObserver API, async DOM effects
 */
function initScrollReveal() {
  const revealElements = document.querySelectorAll(".reveal");

  if (!revealElements.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("reveal--visible");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.1,
      rootMargin: "0px 0px -50px 0px",
    },
  );

  revealElements.forEach((el) => observer.observe(el));
}

/* ---- Format Helpers ---- */

/**
 * Formats a price with currency symbol.
 * @param {number} price - Price value
 * @param {string} currency - Currency code
 * @returns {string} Formatted price string
 */
function formatPrice(price, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

/* ---- URL Helpers ---- */

/**
 * Gets a URL query parameter value.
 * @param {string} name - Parameter name
 * @returns {string|null} Parameter value
 */
function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

/* ---- Main Initialization ---- */

/**
 * Main app initialization.
 * Demonstrates: async IIFE, Promise-based init chain
 */
async function initApp() {
  try {
    // Initialize i18n (loads translations asynchronously)
    await initI18n();

    // Initialize navigation
    initNavigation();

    // Update cart badge
    updateCartBadge();

    // Update auth UI
    updateAuthUI();

    // Initialize scroll reveal animations
    initScrollReveal();

    console.log("AppleVault initialized successfully");
  } catch (error) {
    console.error("App initialization error:", error);
  }
}

// Auto-initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}

export {
  getCart,
  saveCart,
  getCartCount,
  addToCart,
  removeFromCart,
  updateCartQuantity,
  clearCart,
  getCurrentUser,
  getOrdersForCurrentUser,
  placeOrder,
  saveUserSession,
  logoutUser,
  isLoggedIn,
  updateCartBadge,
  updateAuthUI,
  showToast,
  formatPrice,
  getQueryParam,
  initScrollReveal,
};
