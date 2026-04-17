/* ============================================
   AppleVault - API Module
   Centralized async data fetching & API calls
   Demonstrates: fetch, async/await, Promises,
   error handling, loading simulation
   ============================================ */

/**
 * Base path for local data files.
 * Adjust if hosting from a subdirectory.
 */
const DATA_BASE_URL = "./data";

/**
 * External auth API endpoint (reqres.in).
 * Provides real HTTP responses for login/register.
 */
const AUTH_API_URL = "https://reqres.in/api";

/**
 * Simulates network latency for local data fetching.
 * Useful for demonstrating loading states and async behavior.
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise<void>}
 */
async function simulateDelay(ms = 400) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generic async fetch wrapper with error handling.
 * Demonstrates: async/await, try/catch, fetch API
 * @param {string} url - The URL to fetch
 * @param {object} options - Fetch options
 * @returns {Promise<object>} Parsed JSON response
 * @throws {Error} If the network request or parsing fails
 */
async function fetchJSON(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `HTTP ${response.status}: ${response.statusText}`,
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error.name === "TypeError" && error.message.includes("fetch")) {
      throw new Error("Network error. Please check your connection.");
    }
    throw error;
  }
}

/**
 * Loads all products from the local JSON data file.
 * Demonstrates: async/await, fetch from local file, simulated delay
 * @returns {Promise<object>} Product data with categories and products arrays
 */
async function loadAllProducts() {
  // Simulate real API latency for demo purposes
  await simulateDelay(300);

  const data = await fetchJSON(`${DATA_BASE_URL}/products.json`);
  return data;
}

/**
 * Loads products filtered by category.
 * Demonstrates: async data processing, array filtering
 * @param {string} category - Category ID to filter by
 * @returns {Promise<object[]>} Filtered array of products
 */
async function loadProductsByCategory(category) {
  const data = await loadAllProducts();

  if (category === "all") {
    return data.products;
  }

  const filtered = data.products.filter(
    (product) => product.category === category,
  );

  return filtered;
}

/**
 * Loads a single product by its ID.
 * Demonstrates: async/await, Promise-based lookup, error handling
 * @param {string} productId - The product ID to look up
 * @returns {Promise<object>} The product object
 * @throws {Error} If product not found
 */
async function loadProductById(productId) {
  const data = await loadAllProducts();

  const product = data.products.find((p) => p.id === productId);

  if (!product) {
    throw new Error(`Product not found: ${productId}`);
  }

  return product;
}

/**
 * Loads product categories.
 * Demonstrates: async/await, destructuring
 * @returns {Promise<object[]>} Array of category objects
 */
async function loadCategories() {
  const data = await loadAllProducts();
  return data.categories;
}

/**
 * Searches products by query string.
 * Demonstrates: async search, string matching, Promise
 * @param {string} query - Search query
 * @returns {Promise<object[]>} Matching products
 */
async function searchProducts(query) {
  const data = await loadAllProducts();
  const lowerQuery = query.toLowerCase().trim();

  if (!lowerQuery) {
    return data.products;
  }

  const results = data.products.filter((product) => {
    const searchableText = [
      product.name,
      product.category,
      product.specs?.chip,
      product.specs?.ram,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchableText.includes(lowerQuery);
  });

  return results;
}

/**
 * Loads featured products.
 * Demonstrates: async/await, array filter
 * @returns {Promise<object[]>} Featured products
 */
async function loadFeaturedProducts() {
  const data = await loadAllProducts();
  return data.products.filter((product) => product.featured);
}

/**
 * Loads related products (same category, excluding current).
 * Demonstrates: async/await, chaining data operations
 * @param {string} productId - Current product ID
 * @param {number} limit - Max number of related products
 * @returns {Promise<object[]>} Related products
 */
async function loadRelatedProducts(productId, limit = 4) {
  const [product, data] = await Promise.all([
    loadProductById(productId),
    loadAllProducts(),
  ]);

  const related = data.products
    .filter((p) => p.category === product.category && p.id !== productId)
    .slice(0, limit);

  // If not enough from same category, fill with other featured items
  if (related.length < limit) {
    const additional = data.products
      .filter(
        (p) =>
          p.id !== productId &&
          !related.some((r) => r.id === p.id) &&
          p.featured,
      )
      .slice(0, limit - related.length);
    related.push(...additional);
  }

  return related;
}

/**
 * Authenticates a user via the reqres.in API.
 * Demonstrates: async/await, POST fetch, real API call
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<object>} Auth response with token
 */
async function loginUser(email, password) {
  const response = await fetchJSON(`${AUTH_API_URL}/login`, {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  return response;
}

/**
 * Registers a new user via the reqres.in API.
 * Demonstrates: async/await, POST fetch, real API call
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<object>} Registration response with token and id
 */
async function registerUser(email, password) {
  const response = await fetchJSON(`${AUTH_API_URL}/register`, {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  return response;
}

/**
 * Fetches multiple data sets in parallel.
 * Demonstrates: Promise.all for concurrent async operations
 * @param  {...Function} fetchFunctions - Async functions to call
 * @returns {Promise<any[]>} Array of results from all fetches
 */
async function fetchParallel(...fetchFunctions) {
  const results = await Promise.all(fetchFunctions.map((fn) => fn()));
  return results;
}

/* Export all API functions for use as ES modules */
export {
  simulateDelay,
  fetchJSON,
  loadAllProducts,
  loadProductsByCategory,
  loadProductById,
  loadCategories,
  searchProducts,
  loadFeaturedProducts,
  loadRelatedProducts,
  loginUser,
  registerUser,
  fetchParallel,
  DATA_BASE_URL,
  AUTH_API_URL,
};
