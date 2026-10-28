// verify_email.js
const VERIFY_API_URL = "http://127.0.0.1:8000/api/users/auth/verify-otp/";
const RESEND_API_URL = "http://127.0.0.1:8000/api/users/auth/resend-otp/";

document.addEventListener("DOMContentLoaded", () => {
  const verifyForm = document.getElementById("verify-form");
  const boxes = document.querySelectorAll(".code-box");
  const targetEmailEl = document.getElementById("target-email");
  const statusAlert = document.getElementById("status-alert");
  
  const submitBtn = document.getElementById("submit-btn");
  const submitText = document.getElementById("submit-text");
  const submitSpinner = document.getElementById("submit-spinner");
  const resendBtn = document.getElementById("resend-btn");

  // Retrieve email stored during sign up (or check URL parameter fallback)
  const urlParams = new URLSearchParams(window.location.search);
  const userEmail = localStorage.getItem("unverified_email") || urlParams.get("email");

  if (userEmail) {
    targetEmailEl.textContent = userEmail;
  } else {
    showAlert("No target email found. Please sign up first.", "error");
  }

  // --- OTP Box Auto-Advance and Paste Handling ---
  boxes.forEach((box, i) => {
    box.addEventListener("input", () => {
      const digits = box.value.replace(/\D/g, "");

      if (digits.length > 1) {
        digits.slice(0, boxes.length - i).split("").forEach((d, k) => {
          boxes[i + k].value = d;
        });
        boxes[Math.min(i + digits.length, boxes.length - 1)].focus();
        return;
      }

      box.value = digits;
      if (digits && i < boxes.length - 1) {
        boxes[i + 1].focus();
      }
    });

    box.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !box.value && i > 0) {
        boxes[i - 1].focus();
      }
    });

    box.addEventListener("paste", (e) => {
      e.preventDefault();
      const digits = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, boxes.length);
      digits.split("").forEach((d, k) => {
        boxes[k].value = d;
      });
      boxes[Math.min(digits.length, boxes.length - 1)].focus();
    });
  });

  // --- Alert Messenger ---
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

  // --- Loading Spinner Control ---
  function setLoading(isLoading) {
    if (isLoading) {
      submitBtn.disabled = true;
      submitText.textContent = "Verifying...";
      submitSpinner.classList.remove("hidden");
    } else {
      submitBtn.disabled = false;
      submitText.textContent = "Confirm";
      submitSpinner.classList.add("hidden");
    }
  }

  // --- Form Submission (Verify OTP) ---
  verifyForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlert();

    const otpCode = Array.from(boxes).map((b) => b.value.trim()).join("");

    if (!userEmail) {
      showAlert("Missing user email. Please return to sign up page.", "error");
      return;
    }

    if (otpCode.length < 6) {
      showAlert("Please enter the complete 6-digit verification code.", "error");
      return;
    }

    setLoading(true);

    const payload = {
      email: userEmail,
      otp_code: otpCode
    };

    try {
      const response = await fetch(VERIFY_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        // If JWT tokens are returned upon successful verification, store them
        if (data.access) localStorage.setItem("access_token", data.access);
        if (data.refresh) localStorage.setItem("refresh_token", data.refresh);

        // Clear stored unverified email
        localStorage.removeItem("unverified_email");

        showAlert("Email verified successfully! Redirecting to home...", "success");

        setTimeout(() => {
          window.location.href = "back2owner home page.html";
        }, 1500);
      } else {
        let errorMsg = "Verification failed. Invalid or expired OTP.";
        if (data.detail) {
          errorMsg = data.detail;
        } else if (data.otp_code) {
          errorMsg = Array.isArray(data.otp_code) ? data.otp_code.join(" ") : data.otp_code;
        } else if (data.message) {
          errorMsg = data.message;
        }
        showAlert(errorMsg, "error");
      }
    } catch (error) {
      console.error("Verification Error:", error);
      showAlert("Unable to connect to server. Please check your network.", "error");
    } finally {
      setLoading(false);
    }
  });

  // --- Resend OTP Request ---
  if (resendBtn) {
    resendBtn.addEventListener("click", async () => {
      if (!userEmail) {
        showAlert("No target email available to resend code.", "error");
        return;
      }

      resendBtn.disabled = true;
      resendBtn.textContent = "Sending...";
      hideAlert();

      try {
        const response = await fetch(RESEND_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({ email: userEmail })
        });

        const data = await response.json();

        if (response.ok) {
          showAlert("A new 6-digit confirmation code has been sent to your email.", "success");
        } else {
          showAlert(data.detail || data.message || "Failed to resend code. Try again later.", "error");
        }
      } catch (err) {
        console.error("Resend Error:", err);
        showAlert("Server connection error during resend request.", "error");
      } finally {
        resendBtn.disabled = false;
        resendBtn.textContent = "Request New Code";
      }
    });
  }
});