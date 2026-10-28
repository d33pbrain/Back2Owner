// forgot_password.js
const FORGOT_PASSWORD_API = "http://127.0.0.1:8000/api/users/auth/forgot-password/";
const RESET_PASSWORD_API = "http://127.0.0.1:8000/api/users/auth/reset-password/";

document.addEventListener("DOMContentLoaded", () => {
  const requestForm = document.getElementById("request-otp-form");
  const resetForm = document.getElementById("reset-password-form");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const confirmPasswordInput = document.getElementById("confirm-password");
  const boxes = document.querySelectorAll(".code-box");
  
  const pageTitle = document.getElementById("page-title");
  const pageSubtitle = document.getElementById("page-subtitle");
  const statusAlert = document.getElementById("status-alert");

  const requestBtn = document.getElementById("request-btn");
  const requestText = document.getElementById("request-text");
  const requestSpinner = document.getElementById("request-spinner");

  const resetBtn = document.getElementById("reset-btn");
  const resetText = document.getElementById("reset-text");
  const resetSpinner = document.getElementById("reset-spinner");

  let targetEmail = "";

  // Password Toggles
  const toggleVis = (inputEl, btnEl) => {
    const isText = inputEl.type === "text";
    inputEl.type = isText ? "password" : "text";
  };
  document.getElementById("toggle-password")?.addEventListener("click", (e) => toggleVis(passwordInput, e.currentTarget));
  document.getElementById("toggle-confirm-password")?.addEventListener("click", (e) => toggleVis(confirmPasswordInput, e.currentTarget));

  // OTP Box Auto-Advance
  boxes.forEach((box, i) => {
    box.addEventListener("input", () => {
      const digits = box.value.replace(/\D/g, "");
      if (digits.length > 1) {
        digits.slice(0, boxes.length - i).split("").forEach((d, k) => { boxes[i + k].value = d; });
        boxes[Math.min(i + digits.length, boxes.length - 1)].focus();
        return;
      }
      box.value = digits;
      if (digits && i < boxes.length - 1) boxes[i + 1].focus();
    });
    box.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !box.value && i > 0) boxes[i - 1].focus();
    });
    box.addEventListener("paste", (e) => {
      e.preventDefault();
      const digits = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, boxes.length);
      digits.split("").forEach((d, k) => { boxes[k].value = d; });
      boxes[Math.min(digits.length, boxes.length - 1)].focus();
    });
  });

  // Alert Box Helper
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

  // --- STEP 1: REQUEST OTP CODE ---
  requestForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlert();

    targetEmail = emailInput.value.trim();
    if (!targetEmail) {
      showAlert("Please enter your email address.", "error");
      return;
    }

    requestBtn.disabled = true;
    requestText.textContent = "Sending Code...";
    requestSpinner.classList.remove("hidden");

    try {
      const response = await fetch(FORGOT_PASSWORD_API, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ email: targetEmail })
      });

      const data = await response.json();

      if (response.ok) {
        showAlert("A 6-digit confirmation code has been sent to your email.", "success");
        
        // Switch to Step 2 Form
        requestForm.classList.add("hidden");
        resetForm.classList.remove("hidden");

        pageTitle.textContent = "Set New Password";
        pageSubtitle.textContent = `Enter the 6-digit code sent to ${targetEmail} and your new password.`;
        boxes[0].focus();
      } else {
        showAlert(data.email || data.detail || "No user registered with this email address.", "error");
      }
    } catch (err) {
      console.error(err);
      showAlert("Unable to connect to backend server. Ensure Django is running.", "error");
    } finally {
      requestBtn.disabled = false;
      requestText.textContent = "Send Reset Code";
      requestSpinner.classList.add("hidden");
    }
  });

  // --- STEP 2: RESET PASSWORD ---
  resetForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlert();

    const otpCode = Array.from(boxes).map((b) => b.value.trim()).join("");
    const newPassword = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (otpCode.length < 6) {
      showAlert("Please enter the complete 6-digit confirmation code.", "error");
      return;
    }

    if (newPassword.length < 8) {
      showAlert("Password must be at least 8 characters long.", "error");
      return;
    }

    if (newPassword !== confirmPassword) {
      showAlert("Passwords do not match.", "error");
      return;
    }

    resetBtn.disabled = true;
    resetText.textContent = "Updating Password...";
    resetSpinner.classList.remove("hidden");

    try {
      const response = await fetch(RESET_PASSWORD_API, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          email: targetEmail,
          otp_code: otpCode,
          new_password: newPassword,
          confirm_password: confirmPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        showAlert("Password reset successfully! Redirecting to sign in page...", "success");
        setTimeout(() => {
          window.location.href = "back2owner sign in page.html";
        }, 1500);
      } else {
        showAlert(data.detail || data.error || "Failed to reset password. Code may be invalid or expired.", "error");
      }
    } catch (err) {
      console.error(err);
      showAlert("Server communication error. Please try again.", "error");
    } finally {
      resetBtn.disabled = false;
      resetText.textContent = "Update Password";
      resetSpinner.classList.add("hidden");
    }
  });
});