// js/auth-guard.js
(function enforceAuthGuard() {
  const token = localStorage.getItem("access_token");

  // List ALL public pages that DO NOT require logging in
  const publicPages = [
    "back2owner landing page.html",
    "back2owner sign in page.html",
    "back2owner sign up page.html",
    "back2owner register page.html",
    "back2owner verify email.html",
    "back2owner forgot password.html"
  ];

  // Get current file name from the URL path
  const currentPath = window.location.pathname;
  const currentPage = decodeURIComponent(currentPath.split("/").pop().toLowerCase());

  // Check if current page is public
  const isPublicPage = publicPages.some(page => currentPage === page.toLowerCase() || currentPage === "");

  // If user is NOT authenticated and trying to visit a protected page
  if (!token && !isPublicPage) {
    // Save current URL to redirect back after logging in
    sessionStorage.setItem("redirect_after_login", window.location.href);
    window.location.href = "back2owner sign in page.html"; // Adjust to your login file name if different (e.g. signin.html)
  }
})();