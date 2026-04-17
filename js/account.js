import { t, applyTranslations } from "./i18n.js";
import { getCurrentUser, getOrdersForCurrentUser, formatPrice } from "./app.js";
import { simulateDelay } from "./api.js";

const accountContainer = document.getElementById("account-container");

function renderEmptyOrders(user) {
  if (!accountContainer) return;

  accountContainer.innerHTML = `
    <section class="account-header">
      <h1 data-i18n="account.title">${t("account.title")}</h1>
      <p>${user.email}</p>
    </section>

    <section class="account-empty card">
      <h2 data-i18n="account.no_orders_title">No orders yet</h2>
      <p data-i18n="account.no_orders_desc">Once you place an order, it will appear here.</p>
      <a class="btn btn--primary" href="catalog.html" data-i18n="cart.continue_shopping">${t("cart.continue_shopping")}</a>
    </section>
  `;
}

function renderOrders(user, orders) {
  if (!accountContainer) return;

  accountContainer.innerHTML = `
    <section class="account-header">
      <h1 data-i18n="account.title">${t("account.title")}</h1>
      <p>${user.email}</p>
    </section>

    <section class="orders-list">
      ${orders
        .map(
          (order) => `
            <article class="order-card">
              <header class="order-card__header">
                <div>
                  <span class="order-card__label" data-i18n="account.order">${t("account.order")}</span>
                  <h2>${order.id}</h2>
                </div>
                <div class="order-card__meta">
                  <span>${new Date(order.createdAt).toLocaleString()}</span>
                  <strong>${formatPrice(order.total)}</strong>
                </div>
              </header>

              <div class="order-card__items">
                ${order.items
                  .map(
                    (item) => `
                      <div class="order-item">
                        <span>${item.name} x${item.quantity}</span>
                        <strong>${formatPrice(item.price * item.quantity)}</strong>
                      </div>
                    `,
                  )
                  .join("")}
              </div>

              <footer class="order-card__footer">
                <span>${order.shipping.fullName}</span>
                <span>${order.shipping.city}, ${order.shipping.country}</span>
              </footer>
            </article>
          `,
        )
        .join("")}
    </section>
  `;
}

async function initAccountPage() {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = "login.html?redirect=account.html";
    return;
  }

  await simulateDelay(200);

  const orders = getOrdersForCurrentUser();
  if (!orders.length) {
    renderEmptyOrders(user);
    await applyTranslations();
    return;
  }

  renderOrders(user, orders);
  await applyTranslations();
}

initAccountPage();
