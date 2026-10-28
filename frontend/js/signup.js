// signup.js
const API_URL = "http://127.0.0.1:8000/api/users/auth/register/";

document.addEventListener("DOMContentLoaded", () => {
  const signupForm = document.getElementById("signup-form");
  const passwordInput = document.getElementById("password");
  const confirmPasswordInput = document.getElementById("confirm-password");
  const togglePasswordBtn = document.getElementById("toggle-password");
  const toggleConfirmPasswordBtn = document.getElementById("toggle-confirm-password");
  
  const submitBtn = document.getElementById("submit-btn");
  const submitText = document.getElementById("submit-text");
  const submitSpinner = document.getElementById("submit-spinner");
  const errorAlert = document.getElementById("error-alert");

  // Toggle Password Visibility
  const toggleVisibility = (inputEl, buttonEl) => {
    const isShowing = inputEl.type === "text";
    inputEl.type = isShowing ? "password" : "text";
    buttonEl.setAttribute("aria-label", isShowing ? "Show password" : "Hide password");
  };

  if (togglePasswordBtn) {
    togglePasswordBtn.addEventListener("click", () => toggleVisibility(passwordInput, togglePasswordBtn));
  }

  if (toggleConfirmPasswordBtn) {
    toggleConfirmPasswordBtn.addEventListener("click", () => toggleVisibility(confirmPasswordInput, toggleConfirmPasswordBtn));
  }

  // Hide Error Box
  const hideError = () => {
    errorAlert.classList.add("hidden");
    errorAlert.innerHTML = "";
  };

  // Show Error Box
  const showError = (message) => {
    errorAlert.innerHTML = message;
    errorAlert.classList.remove("hidden");
    errorAlert.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  // Toggle Loading State
  const setLoading = (isLoading) => {
    if (isLoading) {
      submitBtn.disabled = true;
      submitText.textContent = "Creating Account...";
      submitSpinner.classList.remove("hidden");
    } else {
      submitBtn.disabled = false;
      submitText.textContent = "Create Account";
      submitSpinner.classList.add("hidden");
    }
  };

  // Handle Form Submission
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideError();

    const fullName = document.getElementById("full-name").value.trim();
    const email = document.getElementById("email").value.trim();
    const department = document.getElementById("department").value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    // Client-side validations
    if (password.length < 8) {
      showError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      showError("Passwords do not match. Please verify your entries.");
      return;
    }

    setLoading(true);

    const payload = {
      full_name: fullName,
      email: email,
      department_or_faculty: department,
      password: password
    };

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok || response.status === 201) {
        // Save user email to localStorage so the verify email screen can display it
        localStorage.setItem("unverified_email", email);
        
        // Redirect to email verification screen
        window.location.href = "back2owner verify email.html";
      } else {
        // Parse Django REST Framework error responses
        let errorMessage = "Registration failed. Please try again.";
        
        if (typeof data === "object" && data !== null) {
          const errors = [];
          for (const key in data) {
            if (Array.isArray(data[key])) {
              errors.push(`${key.replace('_', ' ')}: ${data[key].join(" ")}`);
            } else if (typeof data[key] === "string") {
              errors.push(data[key]);
            }
          }
          if (errors.length > 0) {
            errorMessage = errors.join("<br/>");
          }
        }
        
        showError(errorMessage);
      }
    } catch (error) {
      console.error("Sign up error:", error);
      showError("Unable to connect to server. Please check your internet connection.");
    } finally {
      setLoading(false);
    }
  });
});