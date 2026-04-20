import { t, applyTranslations } from "./i18n.js";
import {
  getCart,
  getCurrentUser,
  formatPrice,
  placeOrder,
  showToast,
} from "./app.js";
import { simulateDelay } from "./api.js";

const checkoutContainer = document.getElementById("checkout-container");
const TAX_RATE = 0.08;
const emailjsConfig = window.APPLEVAULT_EMAILJS_CONFIG || null;
let emailjsInitialized = false;

function isPlaceholder(value) {
  return String(value || "").includes("YOUR_");
}

function calculateTotals(cart) {
  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;
  return { subtotal, tax, total };
}

function renderEmptyState() {
  if (!checkoutContainer) return;

  checkoutContainer.innerHTML = `
    <div class="checkout-empty">
      <h2 data-i18n="checkout.empty_title">Your cart is empty</h2>
      <p data-i18n="checkout.empty_desc">Add products to your cart before checking out.</p>
      <a href="catalog.html" class="btn btn--primary" data-i18n="cart.continue_shopping">${t("cart.continue_shopping")}</a>
    </div>
  `;
}

function renderCheckout(cart, user) {
  if (!checkoutContainer) return;

  const { subtotal, tax, total } = calculateTotals(cart);

  checkoutContainer.innerHTML = `
    <div class="checkout-layout">
      <section class="checkout-panel">
        <h2 data-i18n="checkout.shipping_title">Shipping information</h2>
        <form id="checkout-form" class="checkout-form" novalidate>
          <div class="form-group">
            <label class="form-label" for="full-name" data-i18n="checkout.full_name">Full name</label>
            <input class="form-input" id="full-name" name="fullName" required />
          </div>
          <div class="form-group">
            <label class="form-label" for="email" data-i18n="auth.email">Email Address</label>
            <input class="form-input" id="email" name="email" type="email" required value="${user?.email || ""}" />
          </div>
          <div class="form-group">
            <label class="form-label" for="phone" data-i18n="checkout.phone">Phone</label>
            <input class="form-input" id="phone" name="phone" required />
          </div>
          <div class="form-group">
            <label class="form-label" for="address1" data-i18n="checkout.address1">Address line 1</label>
            <input class="form-input" id="address1" name="address1" required />
          </div>
          <div class="form-group">
            <label class="form-label" for="address2" data-i18n="checkout.address2">Address line 2 (optional)</label>
            <input class="form-input" id="address2" name="address2" />
          </div>
          <div class="checkout-form__row">
            <div class="form-group">
              <label class="form-label" for="city" data-i18n="checkout.city">City</label>
              <input class="form-input" id="city" name="city" required />
            </div>
            <div class="form-group">
              <label class="form-label" for="country" data-i18n="checkout.country">Country</label>
              <input class="form-input" id="country" name="country" required />
            </div>
            <div class="form-group">
              <label class="form-label" for="zip" data-i18n="checkout.zip">ZIP</label>
              <input class="form-input" id="zip" name="zip" required />
            </div>
          </div>

          <fieldset class="checkout-payment">
            <legend class="checkout-payment__legend" data-i18n="checkout.payment_title">Payment method</legend>

            <label class="checkout-payment__option">
              <input type="radio" name="paymentMethod" value="cash" checked />
              <span data-i18n="checkout.payment_cash">Cash on delivery</span>
            </label>

            <label class="checkout-payment__option">
              <input type="radio" name="paymentMethod" value="card" />
              <span data-i18n="checkout.payment_card">Card</span>
            </label>

            <div class="checkout-card-fields" id="checkout-card-fields" hidden>
              <div class="form-group">
                <label class="form-label" for="cardholder" data-i18n="checkout.cardholder">Cardholder name</label>
                <input class="form-input" id="cardholder" name="cardholder" autocomplete="cc-name" />
              </div>

              <div class="form-group">
                <label class="form-label" for="cardNumber" data-i18n="checkout.card_number">Card number</label>
                <input class="form-input" id="cardNumber" name="cardNumber" inputmode="numeric" autocomplete="cc-number" placeholder="4242 4242 4242 4242" />
              </div>

              <div class="checkout-form__row">
                <div class="form-group">
                  <label class="form-label" for="cardExpiry" data-i18n="checkout.card_expiry">Expiry</label>
                  <input class="form-input" id="cardExpiry" name="cardExpiry" inputmode="numeric" autocomplete="cc-exp" placeholder="12/29" />
                </div>
                <div class="form-group">
                  <label class="form-label" for="cardCvc" data-i18n="checkout.card_cvc">CVC</label>
                  <input class="form-input" id="cardCvc" name="cardCvc" inputmode="numeric" autocomplete="cc-csc" placeholder="123" />
                </div>
              </div>
            </div>
          </fieldset>

          <button class="btn btn--primary btn--block" type="submit" id="place-order-btn" data-i18n="checkout.place_order">
            ${t("checkout.place_order")}
          </button>
        </form>
      </section>

      <aside class="checkout-summary">
        <h2 data-i18n="cart.order_summary">${t("cart.order_summary")}</h2>
        <div class="checkout-items">
          ${cart
            .map(
              (item) => `
              <div class="checkout-item">
                <span>${item.name} x${item.quantity}</span>
                <strong>${formatPrice(item.price * item.quantity)}</strong>
              </div>
            `,
            )
            .join("")}
        </div>

        <div class="checkout-summary__row">
          <span data-i18n="cart.subtotal">${t("cart.subtotal")}</span>
          <strong>${formatPrice(subtotal)}</strong>
        </div>
        <div class="checkout-summary__row">
          <span data-i18n="cart.tax">${t("cart.tax")}</span>
          <strong>${formatPrice(tax)}</strong>
        </div>
        <div class="checkout-summary__row checkout-summary__row--total">
          <span data-i18n="cart.total">${t("cart.total")}</span>
          <strong>${formatPrice(total)}</strong>
        </div>
      </aside>
    </div>
  `;

  bindCheckoutForm();
  bindPaymentMethodToggle();
}

function bindPaymentMethodToggle() {
  const form = document.getElementById("checkout-form");
  const cardFields = document.getElementById("checkout-card-fields");
  if (!form || !cardFields) return;

  const radios = form.querySelectorAll('input[name="paymentMethod"]');
  const syncState = () => {
    const paymentMethod = form.querySelector(
      'input[name="paymentMethod"]:checked',
    )?.value;
    const isCard = paymentMethod === "card";

    cardFields.hidden = !isCard;

    cardFields
      .querySelectorAll("input")
      .forEach((input) => input.toggleAttribute("required", isCard));
  };

  radios.forEach((radio) => {
    radio.addEventListener("change", syncState);
  });

  syncState();
}

function getCardLast4(cardNumber) {
  const digitsOnly = cardNumber.replace(/\D/g, "");
  return digitsOnly.slice(-4);
}

function canSendEmailNotifications() {
  return Boolean(
    window.emailjs &&
    emailjsConfig?.publicKey &&
    emailjsConfig?.serviceId &&
    emailjsConfig?.templateId &&
    !isPlaceholder(emailjsConfig.publicKey) &&
    !isPlaceholder(emailjsConfig.serviceId) &&
    !isPlaceholder(emailjsConfig.templateId),
  );
}

function initEmailjsIfNeeded() {
  if (emailjsInitialized || !canSendEmailNotifications()) return;
  window.emailjs.init({ publicKey: emailjsConfig.publicKey });
  emailjsInitialized = true;
}

async function sendOrderEmail(order) {
  if (!canSendEmailNotifications()) return;

  initEmailjsIfNeeded();

  const templateParams = {
    order_id: order.id,
    order_total: formatPrice(order.total),
    customer_email: order.shipping.email,
    customer_name: order.shipping.fullName,
    payment_method: order.payment?.method || "cash",
    items_summary: order.items
      .map((item) => `${item.name} x${item.quantity}`)
      .join(", "),
  };

  await window.emailjs.send(
    emailjsConfig.serviceId,
    emailjsConfig.templateId,
    templateParams,
  );
}

function bindCheckoutForm() {
  const form = document.getElementById("checkout-form");
  const placeOrderBtn = document.getElementById("place-order-btn");
  if (!form || !placeOrderBtn) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const payload = {
      fullName: String(formData.get("fullName") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      address1: String(formData.get("address1") || "").trim(),
      address2: String(formData.get("address2") || "").trim(),
      city: String(formData.get("city") || "").trim(),
      country: String(formData.get("country") || "").trim(),
      zip: String(formData.get("zip") || "").trim(),
      paymentMethod: String(formData.get("paymentMethod") || "cash"),
      cardholder: String(formData.get("cardholder") || "").trim(),
      cardNumber: String(formData.get("cardNumber") || "").trim(),
      cardExpiry: String(formData.get("cardExpiry") || "").trim(),
      cardCvc: String(formData.get("cardCvc") || "").trim(),
    };

    const requiredFields = [
      payload.fullName,
      payload.email,
      payload.phone,
      payload.address1,
      payload.city,
      payload.country,
      payload.zip,
    ];

    if (requiredFields.some((value) => !value)) {
      showToast(t("checkout.required_error"), "error");
      return;
    }

    if (payload.paymentMethod === "card") {
      if (
        !payload.cardholder ||
        !payload.cardNumber ||
        !payload.cardExpiry ||
        !payload.cardCvc
      ) {
        showToast(t("checkout.card_required_error"), "error");
        return;
      }
    }

    placeOrderBtn.disabled = true;
    placeOrderBtn.innerHTML = `<span class="spinner" style="width:18px;height:18px;border-width:2px;"></span> ${t("checkout.processing")}`;

    try {
      await simulateDelay(500);
      const order = placeOrder({
        ...payload,
        cardLast4:
          payload.paymentMethod === "card"
            ? getCardLast4(payload.cardNumber)
            : "",
      });

      try {
        await sendOrderEmail(order);
      } catch (emailError) {
        console.warn("Order email notification failed:", emailError);
      }

      if (!canSendEmailNotifications()) {
        showToast(
          "Order placed. Add EmailJS keys in checkout.html to enable order emails.",
          "warning",
          4500,
        );
      }

      showToast(`${t("checkout.success")} #${order.id}`, "success", 3500);
      window.location.href = "account.html";
    } catch (error) {
      showToast(error.message || t("common.error"), "error");
      placeOrderBtn.disabled = false;
      placeOrderBtn.textContent = t("checkout.place_order");
    }
  });
}

async function initCheckoutPage() {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = "login.html?redirect=checkout.html";
    return;
  }

  await simulateDelay(200);

  const cart = getCart();
  if (!cart.length) {
    renderEmptyState();
    await applyTranslations();
    return;
  }

  renderCheckout(cart, user);
  await applyTranslations();
}

initCheckoutPage();
