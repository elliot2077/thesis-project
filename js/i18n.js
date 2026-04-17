/* ============================================
   AppleVault - Internationalization (i18n) Module
   Async translation loading & DOM text replacement
   Demonstrates: async/await, fetch, DOM manipulation,
   dynamic content updates
   ============================================ */

import { fetchJSON, DATA_BASE_URL } from "./api.js";

/**
 * In-memory cache for loaded translations.
 * Prevents re-fetching the same language file.
 */
const translationsCache = {};

const SUPPORTED_LANGUAGES = ["en", "ro", "ru"];

/**
 * Current active language code.
 */
let currentLanguage = "en";

/**
 * Gets the saved language preference or falls back to browser default.
 * @returns {string} Language code (e.g., 'en', 'ro')
 */
function getPreferredLanguage() {
  // Check localStorage first
  const saved = localStorage.getItem("applevault_language");
  if (saved && SUPPORTED_LANGUAGES.includes(saved)) return saved;

  // Check browser language
  const browserLang = navigator.language?.split("-")[0] || "en";
  return SUPPORTED_LANGUAGES.includes(browserLang) ? browserLang : "en";
}

function getTranslatedValue(key, primaryTranslations) {
  const primaryValue = getNestedValue(primaryTranslations, key);
  if (primaryValue !== undefined) return primaryValue;

  const fallbackValue = getNestedValue(translationsCache.en, key);
  return fallbackValue !== undefined ? fallbackValue : key;
}

/**
 * Asynchronously loads a translation file for the given language.
 * Uses cache to avoid repeated network requests.
 * Demonstrates: async/await, caching pattern, fetch
 * @param {string} lang - Language code
 * @returns {Promise<object>} Translation key-value object
 */
async function loadTranslations(lang = "en") {
  // Return from cache if already loaded
  if (translationsCache[lang]) {
    return translationsCache[lang];
  }

  try {
    const translations = await fetchJSON(`${DATA_BASE_URL}/i18n/${lang}.json`);

    // Cache for future use
    translationsCache[lang] = translations;
    return translations;
  } catch (error) {
    console.warn(
      `Translation file for '${lang}' not found, falling back to 'en'.`,
    );

    // Fallback to English if requested language not available
    if (lang !== "en") {
      return loadTranslations("en");
    }

    throw error;
  }
}

/**
 * Retrieves a nested translation value using dot notation key.
 * Example: getNestedValue(translations, 'nav.home') => 'Home'
 * @param {object} obj - Translations object
 * @param {string} key - Dot-notation key path
 * @returns {string|undefined} Translation value or undefined
 */
function getNestedValue(obj, key) {
  return key.split(".").reduce((current, part) => {
    return current && current[part] !== undefined ? current[part] : undefined;
  }, obj);
}

/**
 * Translates a single key to the current language.
 * Demonstrates: async/await, cache lookup
 * @param {string} key - Translation key (dot notation)
 * @returns {Promise<string>} Translated text or the key itself as fallback
 */
async function translate(key) {
  const translations = await loadTranslations(currentLanguage);
  return getTranslatedValue(key, translations);
}

/**
 * Synchronous translate using cached translations.
 * Falls back to key if translations not yet loaded.
 * @param {string} key - Translation key
 * @returns {string} Translated text
 */
function t(key) {
  const translations = translationsCache[currentLanguage] || {};
  return getTranslatedValue(key, translations);
}

/**
 * Applies translations to all DOM elements with data-i18n attributes.
 * Supports text content, placeholders, aria-labels, and titles.
 * Demonstrates: async/await, DOM query + iteration, attribute manipulation
 * @param {HTMLElement} [root=document] - Root element to search within
 */
async function applyTranslations(root = document) {
  const translations = await loadTranslations(currentLanguage);

  // Translate text content
  const textElements = root.querySelectorAll("[data-i18n]");
  textElements.forEach((el) => {
    const key = el.getAttribute("data-i18n");
    const value = getTranslatedValue(key, translations);
    if (value !== undefined) {
      el.textContent = value;
    }
  });

  // Translate placeholders
  const placeholderElements = root.querySelectorAll("[data-i18n-placeholder]");
  placeholderElements.forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    const value = getTranslatedValue(key, translations);
    if (value !== undefined) {
      el.setAttribute("placeholder", value);
    }
  });

  // Translate aria-labels
  const ariaElements = root.querySelectorAll("[data-i18n-aria]");
  ariaElements.forEach((el) => {
    const key = el.getAttribute("data-i18n-aria");
    const value = getTranslatedValue(key, translations);
    if (value !== undefined) {
      el.setAttribute("aria-label", value);
    }
  });

  // Translate titles
  const titleElements = root.querySelectorAll("[data-i18n-title]");
  titleElements.forEach((el) => {
    const key = el.getAttribute("data-i18n-title");
    const value = getTranslatedValue(key, translations);
    if (value !== undefined) {
      el.setAttribute("title", value);
    }
  });

  // Update the html lang attribute
  document.documentElement.setAttribute("lang", currentLanguage);
}

/**
 * Switches the application language.
 * Loads new translations and re-applies them to the DOM.
 * Demonstrates: async/await, state management, DOM updates
 * @param {string} lang - New language code
 */
async function setLanguage(lang) {
  if (!SUPPORTED_LANGUAGES.includes(lang)) {
    currentLanguage = "en";
  } else {
    currentLanguage = lang;
  }
  localStorage.setItem("applevault_language", currentLanguage);

  await applyTranslations();

  // Dispatch a custom event so other modules can react
  window.dispatchEvent(
    new CustomEvent("languageChanged", {
      detail: { language: currentLanguage },
    }),
  );
}

/**
 * Gets the current language code.
 * @returns {string} Current language code
 */
function getCurrentLanguage() {
  return currentLanguage;
}

/**
 * Initializes the i18n system.
 * Loads the preferred language and applies translations.
 * Demonstrates: async initialization pattern
 */
async function initI18n() {
  currentLanguage = getPreferredLanguage();

  // Pre-load English as fallback (always available)
  // Then load the preferred language in parallel if different
  const languagesToLoad = ["en"];
  if (currentLanguage !== "en") {
    languagesToLoad.push(currentLanguage);
  }

  await Promise.all(languagesToLoad.map((lang) => loadTranslations(lang)));
  await applyTranslations();
}

export {
  initI18n,
  loadTranslations,
  translate,
  t,
  applyTranslations,
  setLanguage,
  getCurrentLanguage,
  SUPPORTED_LANGUAGES,
  getNestedValue,
};
