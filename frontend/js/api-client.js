// js/api-client.js
async function authFetch(url, options = {}) {
  const token = localStorage.getItem("access_token");
  
  options.headers = {
    "Content-Type": "application/json",
    ...options.headers,
    ...(token ? { "Authorization": `Bearer ${token}` } : {})
  };

  const response = await fetch(url, options);

  // If token is expired or invalid
  if (response.status === 401) {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user_info");
    
    sessionStorage.setItem("redirect_after_login", window.location.href);
    window.location.href = "login.html";
    return;
  }

  return response;
}