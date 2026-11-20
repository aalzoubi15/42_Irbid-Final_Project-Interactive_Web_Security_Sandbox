'use strict';

// Shared, small page enhancements. The labs themselves stay in their own files.
document.querySelectorAll('[data-year]').forEach((node) => {
  node.textContent = String(new Date().getFullYear());
});
