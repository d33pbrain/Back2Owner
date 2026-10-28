(function () {
      
  const profileData = {
    fullName: "Abuka Kingsley",
    gmail: "abukakingsley@gmail.com",
    contact: "+234 812 345 6789",
    faculty: "Faculty Of Technology",
    photoName: "OA_PORTAL_2021.JPG"
  };

  const DEFAULT_PREFS = {
    concealMatric: true,
    restrictMessages: true,
    notifyPorters: false,
    notifyWebmail: true,
    notifyInApp: true
  };
  let savedPrefs = { ...DEFAULT_PREFS };

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
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  const toast = $("toast");
  let toastTimer;
  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 3000);
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

  const photoInput = $("photoInput");
  const photoPreview = $("photoPreview");
  const photoName = $("photoName");
  const photoError = $("photoError");
  const sidebarAvatar = document.querySelector(".user-chip .avatar-img");
  let photoObjectURL = null;

  $("photoInitials").textContent = getInitials(profileData.fullName);
  if (photoPreview.complete && photoPreview.naturalWidth === 0) {
    photoPreview.style.display = "none";
  }

  $("changePhoto").addEventListener("click", () => photoInput.click());

  photoInput.addEventListener("change", () => {
    const file = photoInput.files[0];
    photoInput.value = "";  
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

    if (photoObjectURL) URL.revokeObjectURL(photoObjectURL);
    photoObjectURL = URL.createObjectURL(file);
    [photoPreview, sidebarAvatar].forEach((img) => {
      if (!img) return;
      img.src = photoObjectURL;
      img.style.display = "";  
    });

    profileData.photoName = file.name.toUpperCase();
    photoName.textContent = profileData.photoName;
    showToast("Profile photo updated");
  });

  $("removePhoto").addEventListener("click", () => {
    if (photoPreview.style.display === "none") return;  
    if (!confirm("Remove your profile photo? Porters will see your initials instead.")) return;

    if (photoObjectURL) URL.revokeObjectURL(photoObjectURL);
    photoObjectURL = null;
    [photoPreview, sidebarAvatar].forEach((img) => {
      if (img) img.style.display = "none";  
    });

    profileData.photoName = "None";
    photoName.textContent = profileData.photoName;
    setError(photoError, "");
    showToast("Profile photo removed");
  });

  const profileForm = $("profileForm");
  const editableInputs = profileForm.querySelectorAll("[data-editable]");
  const editBtn = $("editProfile");
  const saveBtn = $("saveProfile");
  let isEditing = false;

  function setEditing(on) {
    isEditing = on;
    editableInputs.forEach((input) => {
      input.readOnly = !on;
      input.closest(".field-box").classList.toggle("is-editing", on);
    });
    saveBtn.disabled = true;  
  }

  function hasProfileChanges() {
    return Array.from(editableInputs).some(
      (input) => input.value.trim() !== (profileData[input.name] || "")
    );
  }

  function fillProfileInputs() {
    editableInputs.forEach((input) => {
      input.value = profileData[input.name] || "";
    });
    profileForm.querySelectorAll("[data-error-for]").forEach((el) => setError(el, ""));
  }

  function validateProfile() {
    const errors = {};
    const gmail = $("gmail").value.trim();
    const contact = $("contact").value.replace(/[\s-]/g, "");

    if (!gmail) {
      errors.gmail = "Enter the email address for your claim receipts and locker codes.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(gmail)) {
      errors.gmail = "Enter a full email address, like name@gmail.com.";
    }

    if (contact && !/^(\+234|0)[789][01]\d{8}$/.test(contact)) {
      errors.contact = "Enter a Nigerian mobile number, like +234 812 345 6789 or 0812 345 6789.";
    }
    return errors;
  }

  editBtn.addEventListener("click", () => {
    setEditing(true);
    $("gmail").focus();
  });

  editableInputs.forEach((input) => {
    input.addEventListener("input", () => {
      if (isEditing) saveBtn.disabled = !hasProfileChanges();
    });
  });

  profileForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!isEditing || saveBtn.disabled) return;

    const errors = validateProfile();
    profileForm.querySelectorAll("[data-error-for]").forEach((el) => {
      setError(el, errors[el.dataset.errorFor]);
    });
    const firstProblem = Object.keys(errors)[0];
    if (firstProblem) {
      $(firstProblem).focus();
      return;
    }

    editableInputs.forEach((input) => {
      profileData[input.name] = input.value.trim();
    });

    fillProfileInputs();
    setEditing(false);
    updateMaskedName();
    showToast("Profile changes saved");
  });

  const passwordForm = $("passwordForm");
  const currentPw = $("currentPassword");
  const newPw = $("newPassword");
  const confirmPw = $("confirmPassword");
  const passwordError = $("passwordError");
  const updatePwBtn = $("updatePassword");

  function getPasswordProblem() {
    if (newPw.value && (newPw.value.length < 8 || !/\d/.test(newPw.value))) {
      return "New password needs at least 8 characters and one number.";
    }
    if (confirmPw.value && confirmPw.value !== newPw.value) {
      return "The two new passwords don't match.";
    }
    if (currentPw.value && newPw.value && currentPw.value === newPw.value) {
      return "Choose a new password that's different from your current one.";
    }
    return "";
  }

  passwordForm.addEventListener("input", () => {
    const problem = getPasswordProblem();
    setError(passwordError, problem);
    updatePwBtn.disabled = Boolean(problem) || !currentPw.value || !newPw.value || !confirmPw.value;
  });

  passwordForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (updatePwBtn.disabled) return;

    passwordForm.reset();
    updatePwBtn.disabled = true;
    $("passwordUpdated").textContent = "LAST UPDATED: JUST NOW";
    showToast("Password updated");
  });
      
  const verifyForm = $("verifyForm");
  const docInput = $("docInput");
  const dropzone = $("dropzone");
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
        <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>
        </svg>
        <span class="file-name">${escapeHTML(file.name)}</span>
        <span class="file-size">${formatSize(file.size)}</span>
        <button type="button" class="file-remove" data-index="${index}" aria-label="Remove ${escapeHTML(file.name)}">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </li>
    `).join("");
    updateVerifyButton();
  }

  function addDocFiles(fileList) {
    const problems = [];

    Array.from(fileList).forEach((file) => {
      if (!DOC_TYPES.includes(file.type)) {
        problems.push(`“${file.name}” isn't a PNG, JPG or WEBP image.`);
      } else if (file.size > DOC_MAX_MB * 1024 * 1024) {
        problems.push(`“${file.name}” is ${formatSize(file.size)}. The limit is ${DOC_MAX_MB}MB.`);
      } else if (docFiles.length >= DOC_MAX_FILES) {
        problems.push(`“${file.name}” wasn't added. You can upload up to ${DOC_MAX_FILES} images.`);
      } else {
        docFiles.push(file);
      }
    });

    setError(docError, problems.join(" "));
    verifyStatus.hidden = true;
    renderDocList();
  }

  docInput.addEventListener("change", () => {
    addDocFiles(docInput.files);
    docInput.value = "";
  });

  ["dragenter", "dragover"].forEach((type) => {
    dropzone.addEventListener(type, (event) => {
      event.preventDefault();
      dropzone.classList.add("is-dragging");
    });
  });
  ["dragleave", "drop"].forEach((type) => {
    dropzone.addEventListener(type, (event) => {
      event.preventDefault();
      dropzone.classList.remove("is-dragging");
    });
  });
  dropzone.addEventListener("drop", (event) => addDocFiles(event.dataTransfer.files));

  docList.addEventListener("click", (event) => {
    const button = event.target.closest(".file-remove");
    if (!button) return;
    docFiles.splice(Number(button.dataset.index), 1);
    renderDocList();
  });

  verifyForm.addEventListener("change", (event) => {
    if (event.target.name === "docType") updateVerifyButton();
  });

  verifyForm.addEventListener("reset", () => {
    docFiles = [];
    setError(docError, "");
    verifyStatus.hidden = true;
    setTimeout(renderDocList); 
  });

  verifyForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (submitVerifyBtn.disabled) return;

    const types = Array.from(verifyForm.querySelectorAll('input[name="docType"]:checked'))
      .map((box) => box.value);

    const count = docFiles.length;
    docFiles = [];
    renderDocList();
    verifyStatus.textContent =
      `${count} ${count === 1 ? "document" : "documents"} sent for review. You'll get a notification when verification is complete.`;
    verifyStatus.hidden = false;
    showToast("Sent for verification");
  });
      
  const prefsForm = $("prefsForm");
  const savePrefsBtn = $("savePrefs");
  const prefBoxes = prefsForm.querySelectorAll('input[type="checkbox"][name]');

  function readPrefs() {
    const prefs = {};
    prefBoxes.forEach((box) => { prefs[box.name] = box.checked; });
    return prefs;
  }

  function applyPrefs(prefs) {
    prefBoxes.forEach((box) => { box.checked = Boolean(prefs[box.name]); });
  }

  function hasUnsavedPrefs() {
    const current = readPrefs();
    return Object.keys(current).some((key) => current[key] !== savedPrefs[key]);
  }

  function updateSavePrefsButton() {
    savePrefsBtn.disabled = !hasUnsavedPrefs();
  }

  function updateMaskedName() {
    const dotted = getInitials(profileData.fullName).split("").join(".") + ".";
    $("maskedName").textContent = profileData.faculty
      ? `${dotted} (${profileData.faculty})`
      : dotted;
  }

  prefsForm.addEventListener("change", updateSavePrefsButton);

  $("restoreDefaults").addEventListener("click", () => {
    applyPrefs(DEFAULT_PREFS);
    updateSavePrefsButton();
    if (!savePrefsBtn.disabled) showToast("Defaults restored. Press Save to keep them.");
  });

  prefsForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (savePrefsBtn.disabled) return;

    savedPrefs = readPrefs();
    updateSavePrefsButton();
    showToast("Preferences saved");
  });
      
  const deleteDialog = $("deleteDialog");

  $("deleteAccount").addEventListener("click", () => {
    deleteDialog.showModal();
  });

  deleteDialog.addEventListener("close", () => {
    if (deleteDialog.returnValue !== "delete") return;
     window.location.href = "back2owner%20landing%20page.html";
    showToast("Account deleted");
  });
      
  window.addEventListener("beforeunload", (event) => {
    if (isEditing || hasUnsavedPrefs() || docFiles.length > 0) {
      event.preventDefault();
      event.returnValue = "";
    }
  });
      
  markActiveLink();
  fillProfileInputs();
  applyPrefs(savedPrefs);
  updateSavePrefsButton();
  updateMaskedName();
  updateVerifyButton();

})();
