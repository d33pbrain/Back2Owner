// signin.js
const LOGIN_API_URL = `${CONFIG.API_BASE_URL}/api/users/auth/login/`;
console.log("LOGIN_API_URL:", LOGIN_API_URL); // Debugging line to check the API URL

document.addEventListener("DOMContentLoaded", () => {
  const signinForm = document.getElementById("signin-form");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const togglePasswordBtn = document.getElementById("toggle-password");
  
  const submitBtn = document.getElementById("submit-btn");
  const submitText = document.getElementById("submit-text");
  const submitSpinner = document.getElementById("submit-spinner");
  const statusAlert = document.getElementById("status-alert");

  // Toggle Password Visibility
  if (togglePasswordBtn) {
    togglePasswordBtn.addEventListener("click", () => {
      const isShowing = passwordInput.type === "text";
      passwordInput.type = isShowing ? "password" : "text";
      togglePasswordBtn.setAttribute("aria-label", isShowing ? "Show password" : "Hide password");
    });
  }

  // Display Alerts
  function showAlert(message, type = "error") {
    statusAlert.innerHTML = message;
    statusAlert.className = type === "error"
      ? "rounded-xl border border-red-200 bg-red-50 p-3 text-[13px] font-medium text-red-700 block"
      : "rounded-xl border border-green-200 bg-green-50 p-3 text-[13px] font-medium text-green-700 block";
  }

  function hideAlert() {
    statusAlert.className = "hidden";
    statusAlert.innerHTML = "";
  }

  // Loading State Controls
  function setLoading(isLoading) {
    if (isLoading) {
      submitBtn.disabled = true;
      submitText.textContent = "Signing In...";
      submitSpinner.classList.remove("hidden");
    } else {
      submitBtn.disabled = false;
      submitText.textContent = "Login";
      submitSpinner.classList.add("hidden");
    }
  }

  // Form Submission
  signinForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlert();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      showAlert("Please fill in all required fields.", "error");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(LOGIN_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        // Handle both root-level tokens (data.access) and nested tokens (data.tokens.access)
        const accessToken = data.access || (data.tokens && data.tokens.access);
        const refreshToken = data.refresh || (data.tokens && data.tokens.refresh);

        if (accessToken) {
          localStorage.setItem("access_token", accessToken);
        }
        if (refreshToken) {
          localStorage.setItem("refresh_token", refreshToken);
        }
        if (data.user) {
          localStorage.setItem("user_info", JSON.stringify(data.user));
        }

        showAlert("Login successful! Redirecting...", "success");

        setTimeout(() => {
          // Check if user was redirected from a protected route
          const redirectUrl = sessionStorage.getItem("redirect_after_login");
          if (redirectUrl) {
            sessionStorage.removeItem("redirect_after_login");
            window.location.href = redirectUrl;
          } else {
            window.location.href = "back2owner home page.html";
          }
        }, 1000);
      } else {
        // Extract Django REST framework / SimpleJWT authentication errors
        let errorMsg = "Invalid email or password. Please try again.";
        
        if (data.detail) {
          errorMsg = data.detail;
        } else if (data.non_field_errors) {
          errorMsg = Array.isArray(data.non_field_errors) ? data.non_field_errors.join(" ") : data.non_field_errors;
        } else if (typeof data === "object") {
          const errs = [];
          for (const key in data) {
            if (Array.isArray(data[key])) {
              errs.push(`${key.replace('_', ' ')}: ${data[key].join(" ")}`);
            }
          }
          if (errs.length > 0) errorMsg = errs.join("<br/>");
        }

        // Handle case where email is not verified yet
        if (errorMsg.toLowerCase().includes("verify") || errorMsg.toLowerCase().includes("active")) {
          localStorage.setItem("unverified_email", email);
          errorMsg += ` <a href="back2owner verify email.html" class="underline font-bold">Verify Email now</a>`;
        }

        showAlert(errorMsg, "error");
      }
    } catch (error) {
      console.error("Sign In Error:", error);
      showAlert("Unable to connect to server. Please check your network connection.", "error");
    } finally {
      setLoading(false);
    }
  });
});