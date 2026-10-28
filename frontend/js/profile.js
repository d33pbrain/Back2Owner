// js/profile.js
(function () {
  const PROFILE_API_URL = `${CONFIG.API_BASE_URL}/api/users/profile/`;
  const FORGOT_PASSWORD_API_URL = `${CONFIG.API_BASE_URL}/api/users/auth/forgot-password/`;
  const RESET_PASSWORD_API_URL = `${CONFIG.API_BASE_URL}/api/users/auth/reset-password/`;

  let profileData = {
    full_name: "",
    email: "",
    department_or_faculty: "",
    avatar: null,
    is_verified: false
  };

  let pendingAvatarFile = null;

  const PHOTO_MAX_MB = 2;
  const PHOTO_TYPES = ["image/png", "image/jpeg"];
  const DOC_MAX_MB = 10;
  const DOC_MAX_FILES = 3;
  const DOC_TYPES = ["image/png", "image/jpeg", "image/webp"];

  const $ = (id) => document.getElementById(id);

  function setError(element, message) {
    if (!element) return;
    element.textContent = message || "";
    element.hidden = !message;
  }

  function getInitials(name) {
    if (!name) return "UO";
    return name
      .trim()
      .split(/\s+/)
      .map((word) => word[0].toUpperCase())
      .slice(0, 2)
      .join("");
  }

  function formatSize(bytes) {
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function escapeHTML(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  // --- TOAST NOTIFICATIONS ---
  const toast = $("toast");
  let toastTimer;
  function showToast(message, isError = false) {
    if (!toast) return;
    toast.textContent = message;
    toast.style.backgroundColor = isError ? "#ef4444" : "#0f172a";
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 3500);
  }

  function markActiveLink() {
    const currentFile = decodeURIComponent(window.location.pathname.split("/").pop());
    document.querySelectorAll(".side-link[data-nav]").forEach((link) => {
      const label = link.querySelector("span")?.textContent.trim();
      const isThisPage = label === "Profile";
      link.classList.toggle("is-active", isThisPage);
      if (isThisPage && currentFile) link.setAttribute("href", currentFile);
    });
  }

  // --- FETCH USER PROFILE DATA ---
  async function fetchUserProfile() {
    const token = localStorage.getItem("access_token");
    if (!token) {
      showToast("Authentication required. Please log in.", true);
      return;
    }

    try {
      const response = await fetch(PROFILE_API_URL, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json"
        }
      });

      if (response.ok) {
        const data = await response.json();
        profileData = { ...data };
        updateProfileUI();
        syncUserInfoLocalStorage(profileData);
      } else {
        showToast("Unable to fetch profile details.", true);
      }
    } catch (err) {
      console.error("Profile Fetch Error:", err);
      showToast("Network error. Could not connect to backend server.", true);
    }
  }

  // Helper to safely update `user_info` in localStorage without modifying authentication tokens
  function syncUserInfoLocalStorage(data) {
    try {
      const existingUser = JSON.parse(localStorage.getItem("user_info") || "{}");
      const updatedUser = {
        ...existingUser,
        full_name: data.full_name,
        email: data.email,
        department_or_faculty: data.department_or_faculty,
        avatar: data.avatar,
        is_verified: data.is_verified
      };
      localStorage.setItem("user_info", JSON.stringify(updatedUser));
    } catch (e) {
      console.warn("Failed to update user_info in localStorage", e);
    }
  }

  function updateProfileUI() {
    $("fullName").value = profileData.full_name || "";
    $("gmail").value = profileData.email || "";
    $("faculty").value = profileData.department_or_faculty || "";
    $("resetEmail").value = profileData.email || "";
    $("photoInitials").textContent = getInitials(profileData.full_name);

    const verifiedBadge = $("verifiedBadge");
    if (verifiedBadge) {
      verifiedBadge.classList.toggle("hidden", !profileData.is_verified);
    }

    const photoPreview = $("photoPreview");
    const photoName = $("photoName");

    if (profileData.avatar) {
      photoPreview.src = profileData.avatar;
      photoPreview.style.display = "block";
      photoName.textContent = "CUSTOM_AVATAR.JPG";
    } else {
      photoPreview.style.display = "none";
      photoName.textContent = "NONE";
    }
  }

  // --- PROFILE PHOTO HANDLING ---
  const photoInput = $("photoInput");
  const photoPreview = $("photoPreview");
  const photoName = $("photoName");
  const photoError = $("photoError");
  const sidebarAvatar = document.querySelector(".user-chip .avatar-img");
  let photoObjectURL = null;

  $("changePhoto").addEventListener("click", () => photoInput.click());

  photoInput.addEventListener("change", () => {
    const file = photoInput.files[0];
    if (!file) return;

    if (!PHOTO_TYPES.includes(file.type)) {
      setError(photoError, `“${file.name}” isn't a PNG or JPG. Choose a PNG or JPG photo.`);
      return;
    }
    if (file.size > PHOTO_MAX_MB * 1024 * 1024) {
      setError(photoError, `This photo is ${formatSize(file.size)}. Choose one under ${PHOTO_MAX_MB}MB.`);
      return;
    }
    setError(photoError, "");

    pendingAvatarFile = file;

    if (photoObjectURL) URL.revokeObjectURL(photoObjectURL);
    photoObjectURL = URL.createObjectURL(file);
    [photoPreview, sidebarAvatar].forEach((img) => {
      if (!img) return;
      img.src = photoObjectURL;
      img.style.display = "block";
    });

    photoName.textContent = file.name.toUpperCase();
    saveBtn.disabled = false;
    showToast("New photo selected. Press 'Save Changes' to update.");
  });

  $("removePhoto").addEventListener("click", async () => {
    if (!confirm("Remove your profile photo?")) return;

    const token = localStorage.getItem("access_token");
    if (!token) return;

    const formData = new FormData();
    formData.append("avatar", "");

    try {
      const res = await fetch(PROFILE_API_URL, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData
      });

      if (res.ok) {
        const updatedUser = await res.json();
        profileData.avatar = null;
        pendingAvatarFile = null;
        if (photoObjectURL) URL.revokeObjectURL(photoObjectURL);
        [photoPreview, sidebarAvatar].forEach((img) => {
          if (img) img.style.display = "none";
        });
        photoName.textContent = "NONE";
        syncUserInfoLocalStorage(updatedUser);
        showToast("Profile photo removed successfully");
      }
    } catch (err) {
      showToast("Failed to remove profile photo", true);
    }
  });

  // --- EDIT & SAVE PROFILE FORM ---
  const profileForm = $("profileForm");
  const editableInputs = profileForm.querySelectorAll("[data-editable]");
  const editBtn = $("editProfile");
  const saveBtn = $("saveProfile");
  let isEditing = false;

  function setEditing(on) {
    isEditing = on;
    editableInputs.forEach((input) => {
      input.readOnly = !on;
      input.closest(".field-box")?.classList.toggle("is-editing", on);
    });
    saveBtn.disabled = !on;
  }

  editBtn.addEventListener("click", () => {
    setEditing(true);
    $("fullName").focus();
  });

  profileForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!isEditing && !pendingAvatarFile) return;

    const token = localStorage.getItem("access_token");
    if (!token) {
      showToast("Authentication required.", true);
      return;
    }

    const formData = new FormData();
    formData.append("full_name", $("fullName").value.trim());
    formData.append("department_or_faculty", $("faculty").value.trim());

    if (pendingAvatarFile) {
      formData.append("avatar", pendingAvatarFile);
    }

    saveBtn.disabled = true;
    saveBtn.querySelector("span").textContent = "Saving...";

    try {
      const response = await fetch(PROFILE_API_URL, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const updatedUser = await response.json();
        profileData = { ...updatedUser };
        pendingAvatarFile = null;
        setEditing(false);
        updateProfileUI();
        syncUserInfoLocalStorage(updatedUser);
        showToast("Profile updated successfully!");
      } else {
        const errorData = await response.json();
        showToast(errorData.detail || "Error updating profile details.", true);
      }
    } catch (err) {
      console.error("Profile Save Error:", err);
      showToast("Failed to update profile.", true);
    } finally {
      saveBtn.disabled = false;
      saveBtn.querySelector("span").textContent = "Save Changes";
    }
  });

  // --- OTP PASSWORD RESET FLOW ---
  const requestOtpBtn = $("requestOtpBtn");
  const passwordForm = $("passwordForm");
  const resetEmail = $("resetEmail");
  const otpCode = $("otpCode");
  const newPw = $("newPassword");
  const confirmPw = $("confirmPassword");
  const passwordError = $("passwordError");
  const updatePwBtn = $("updatePassword");

  // 1. Send OTP Request
  requestOtpBtn.addEventListener("click", async () => {
    const email = resetEmail.value.trim();
    if (!email) {
      showToast("Email address is missing.", true);
      return;
    }

    requestOtpBtn.disabled = true;
    requestOtpBtn.querySelector("span").textContent = "Sending...";

    try {
      const response = await fetch(FORGOT_PASSWORD_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email })
      });

      if (response.ok) {
        showToast(`Verification OTP sent to ${email}`);
        setError(passwordError, "");
        otpCode.focus();
      } else {
        const errData = await response.json();
        showToast(errData.detail || errData.error || "Failed to send OTP.", true);
      }
    } catch (err) {
      console.error("Forgot Password API Error:", err);
      showToast("Network error. Unable to request OTP.", true);
    } finally {
      requestOtpBtn.disabled = false;
      requestOtpBtn.querySelector("span").textContent = "Resend OTP Code";
    }
  });

  function getPasswordProblem() {
    if (newPw.value && newPw.value.length < 8) {
      return "New password needs at least 8 characters.";
    }
    if (confirmPw.value && confirmPw.value !== newPw.value) {
      return "The two new passwords don't match.";
    }
    return "";
  }

  passwordForm.addEventListener("input", () => {
    const problem = getPasswordProblem();
    setError(passwordError, problem);
    updatePwBtn.disabled = Boolean(problem) || !otpCode.value.trim() || !newPw.value || !confirmPw.value;
  });

  // 2. Submit Reset Password with OTP
  passwordForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (updatePwBtn.disabled) return;

    const payload = {
      email: resetEmail.value.trim(),
      otp_code: otpCode.value.trim(),
      new_password: newPw.value,
      confirm_password: confirmPw.value
    };

    updatePwBtn.disabled = true;
    updatePwBtn.querySelector("span").textContent = "Resetting...";

    try {
      const response = await fetch(RESET_PASSWORD_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        passwordForm.reset();
        resetEmail.value = profileData.email;
        setError(passwordError, "");
        showToast("Password reset successfully! Use your new password on next login.");
      } else {
        const errData = await response.json();
        const errorMsg = errData.detail || errData.error || errData.non_field_errors?.[0] || "Failed to reset password.";
        setError(passwordError, errorMsg);
        showToast(errorMsg, true);
      }
    } catch (err) {
      console.error("Reset Password API Error:", err);
      showToast("Server error during password reset.", true);
    } finally {
      updatePwBtn.disabled = false;
      updatePwBtn.querySelector("span").textContent = "Reset Password";
    }
  });

  // --- DOCUMENT VERIFICATION SUBMISSION ---
  const verifyForm = $("verifyForm");
  const docInput = $("docInput");
  const docList = $("docList");
  const docError = $("docError");
  const verifyStatus = $("verifyStatus");
  const submitVerifyBtn = $("submitVerify");
  let docFiles = [];

  function updateVerifyButton() {
    const hasType = verifyForm.querySelectorAll('input[name="docType"]:checked').length > 0;
    submitVerifyBtn.disabled = !(hasType && docFiles.length > 0);
  }

  function renderDocList() {
    docList.innerHTML = docFiles.map((file, index) => `
      <li class="file-row">
        <span class="file-name">${escapeHTML(file.name)}</span>
        <span class="file-size">${formatSize(file.size)}</span>
        <button type="button" class="file-remove" data-index="${index}">Remove</button>
      </li>
    `).join("");
    updateVerifyButton();
  }

  function addDocFiles(fileList) {
    const problems = [];
    Array.from(fileList).forEach((file) => {
      if (!DOC_TYPES.includes(file.type)) {
        problems.push(`“${file.name}” isn't PNG, JPG or WEBP.`);
      } else if (file.size > DOC_MAX_MB * 1024 * 1024) {
        problems.push(`“${file.name}” exceeds ${DOC_MAX_MB}MB.`);
      } else if (docFiles.length >= DOC_MAX_FILES) {
        problems.push(`Maximum ${DOC_MAX_FILES} images allowed.`);
      } else {
        docFiles.push(file);
      }
    });

    setError(docError, problems.join(" "));
    renderDocList();
  }

  docInput.addEventListener("change", () => {
    addDocFiles(docInput.files);
    docInput.value = "";
  });

  docList.addEventListener("click", (event) => {
    const button = event.target.closest(".file-remove");
    if (!button) return;
    docFiles.splice(Number(button.dataset.index), 1);
    renderDocList();
  });

  verifyForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (submitVerifyBtn.disabled) return;

    docFiles = [];
    renderDocList();
    verifyStatus.textContent = "Documents sent for administrative review.";
    verifyStatus.hidden = false;
    showToast("Identity documents submitted for verification");
  });

  // INITIALIZE PAGE DATA
  markActiveLink();
  fetchUserProfile();
})();