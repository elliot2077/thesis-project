/* ============================================
   AppleVault - Authentication Module
  Login and Register form handling with
  Firebase Authentication
  Demonstrates: async/await, Firebase auth,
  form validation,
   error handling, loading states
   ============================================ */

import { simulateDelay } from "./api.js";
import { t } from "./i18n.js";
import { saveUserSession, showToast, isLoggedIn } from "./app.js";
import {
  getFirebaseAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  updateProfile,
} from "./firebase.js";

/* ---- DOM References ---- */
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const authError = document.getElementById("auth-error");
const forgotPasswordLink = document.querySelector(".auth-form__forgot");

/* ---- Initialization ---- */

/**
 * Initializes the auth page.
 * Checks if user is already logged in and redirects if so.
 * Demonstrates: async guard pattern
 */
async function initAuth() {
  const redirectTarget = getSafeRedirectTarget();

  // Redirect if already logged in
  if (isLoggedIn()) {
    window.location.href = redirectTarget;
    return;
  }

  if (loginForm) {
    bindLoginForm();
    bindForgotPassword();
  }

  if (registerForm) {
    bindRegisterForm();
  }
}

/* ---- Login ---- */

/**
 * Binds the login form submission handler.
 * Demonstrates: async form handling, fetch POST, error handling
 */
function bindLoginForm() {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = loginForm.querySelector('[name="email"]').value.trim();
    const password = loginForm.querySelector('[name="password"]').value;
    const rememberMe = loginForm.querySelector('[name="remember"]')?.checked;
    const submitBtn = loginForm.querySelector(".auth-btn");

    // Basic validation
    if (!email || !password) {
      showAuthError(t("auth.login_error"));
      return;
    }

    // Show loading state
    setButtonLoading(submitBtn, true);
    hideAuthError();

    try {
      const auth = getFirebaseAuth();

      // Respect "Remember me" by selecting Firebase persistence mode.
      await setPersistence(
        auth,
        rememberMe ? browserLocalPersistence : browserSessionPersistence,
      );

      const credential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const token = await credential.user.getIdToken();

      // Keep existing app-level session shape for UI compatibility.
      saveUserSession({
        email: email,
        token,
        uid: credential.user.uid,
        firstName: credential.user.displayName || "",
        loginTime: new Date().toISOString(),
      });

      showToast(t("auth.login_success"));

      // Small delay for UX, then redirect
      await simulateDelay(500);
      window.location.href = getSafeRedirectTarget();
    } catch (error) {
      console.error("Login failed:", error);
      showAuthError(error.message || t("auth.login_error"));
    } finally {
      setButtonLoading(submitBtn, false);
    }
  });
}

/* ---- Register ---- */

/**
 * Binds the register form submission handler.
 * Demonstrates: async form handling, data validation,
 *               fetch POST, sequential async operations
 */
function bindRegisterForm() {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = registerForm.querySelector('[name="email"]').value.trim();
    const password = registerForm.querySelector('[name="password"]').value;
    const confirmPassword = registerForm.querySelector(
      '[name="confirm_password"]',
    )?.value;
    const firstName = registerForm
      .querySelector('[name="first_name"]')
      ?.value.trim();
    const lastName = registerForm
      .querySelector('[name="last_name"]')
      ?.value.trim();
    const submitBtn = registerForm.querySelector(".auth-btn");

    // Validation
    if (!email || !password) {
      showAuthError(t("auth.register_error"));
      return;
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      showAuthError(t("auth.passwords_mismatch"));
      return;
    }

    // Show loading state
    setButtonLoading(submitBtn, true);
    hideAuthError();

    try {
      const auth = getFirebaseAuth();
      const credential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );

      if (firstName || lastName) {
        const displayName = `${firstName || ""} ${lastName || ""}`.trim();
        if (displayName) {
          await updateProfile(credential.user, { displayName });
        }
      }

      // Step 2: Save session data (sequential async operation)
      await simulateDelay(300);
      const token = await credential.user.getIdToken();

      saveUserSession({
        email: email,
        firstName: firstName || "",
        lastName: lastName || "",
        token,
        uid: credential.user.uid,
        registeredAt: new Date().toISOString(),
      });

      showToast(t("auth.register_success"));

      // Step 3: Redirect after brief delay
      await simulateDelay(500);
      window.location.href = getSafeRedirectTarget();
    } catch (error) {
      console.error("Registration failed:", error);
      showAuthError(error.message || t("auth.register_error"));
    } finally {
      setButtonLoading(submitBtn, false);
    }
  });
}

/* ---- Forgot Password ---- */

/**
 * Binds forgot-password link to Firebase reset email API.
 */
function bindForgotPassword() {
  if (!forgotPasswordLink || !loginForm) return;

  forgotPasswordLink.addEventListener("click", async (e) => {
    e.preventDefault();

    const email = loginForm.querySelector('[name="email"]')?.value.trim();
    if (!email) {
      showAuthError(t("auth.forgot_password_email_required"));
      return;
    }

    hideAuthError();
    try {
      const auth = getFirebaseAuth();
      await sendPasswordResetEmail(auth, email);
      showToast(t("auth.forgot_password_sent"));
    } catch (error) {
      console.error("Password reset failed:", error);
      showAuthError(error.message || t("auth.register_error"));
    }
  });
}

/* ---- UI Helpers ---- */

/**
 * Shows the auth error message.
 * @param {string} message - Error message to display
 */
function showAuthError(message) {
  if (!authError) return;
  authError.textContent = message;
  authError.classList.add("auth-error--visible");
}

/**
 * Hides the auth error message.
 */
function hideAuthError() {
  if (!authError) return;
  authError.classList.remove("auth-error--visible");
}

/**
 * Sets a button to loading or normal state.
 * @param {HTMLButtonElement} btn - The button element
 * @param {boolean} isLoading - Whether to show loading state
 */
function setButtonLoading(btn, isLoading) {
  if (!btn) return;

  if (isLoading) {
    btn.dataset.originalText = btn.textContent;
    btn.innerHTML = '<span class="auth-btn__spinner"></span> Loading...';
    btn.classList.add("auth-btn--loading");
    btn.disabled = true;
  } else {
    btn.textContent = btn.dataset.originalText || btn.textContent;
    btn.classList.remove("auth-btn--loading");
    btn.disabled = false;
  }
}

function getSafeRedirectTarget() {
  const redirect = new URLSearchParams(window.location.search).get("redirect");
  if (!redirect) return "index.html";

  const isSafeRelativePage =
    /^[a-z0-9-]+\.html$/i.test(redirect) && !redirect.includes("://");

  return isSafeRelativePage ? redirect : "index.html";
}

/* ---- Start ---- */
initAuth();
