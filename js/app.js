(function () {
  var STORAGE = "sb_study_materials";
  var CHAT_STORAGE = "sb_chat_messages";
  var API_COUNT = "sb_api_calls";
  var materials = SBLoad(STORAGE, []);
  var chatMessages = SBLoad(CHAT_STORAGE, {});
  var activeMaterialId = null;
  var activeUploadTab = "pdf";
  var selectedPdfText = "";
  var selectedPdfName = "";
  var flashcardIndex = 0;
  var showingAnswer = false;
  var activeNoteTab = "smartNotes";
  var focusMinutes = Number(SBLoad("sb_minutes", 25));
  if (!Number.isInteger(focusMinutes) || focusMinutes < 1 || focusMinutes > 180) focusMinutes = 25;
  var timerModes = ["focus", "short", "long"];
  var savedTimer = SBLoad("sb_focus_timer", {}) || {};
  var initialMode = timerModes.indexOf(savedTimer.mode) >= 0 ? savedTimer.mode : "focus";
  var initialDuration = Number(savedTimer.duration);
  if (!Number.isInteger(initialDuration) || initialDuration < 1 || initialDuration > 180) {
    initialDuration = initialMode === "short" ? 5 : initialMode === "long" ? 15 : focusMinutes;
  }
  var timerState = {
    mode: initialMode,
    duration: initialDuration,
    remaining: Number.isInteger(Number(savedTimer.remaining)) && Number(savedTimer.remaining) >= 0
      ? Math.min(Number(savedTimer.remaining), initialDuration * 60) : initialDuration * 60,
    running: savedTimer.running === true && Number.isFinite(Number(savedTimer.endAt)) && Number(savedTimer.endAt) > 0,
    endAt: Number(savedTimer.endAt) || 0
  };
  if (timerState.running) timerState.remaining = Math.max(0, Math.ceil((timerState.endAt - Date.now()) / 1000));
  var timerInterval = null;
  var focusModeActive = false;

  function SBLoad(key, fallback) {
    try {
      var value = JSON.parse(localStorage.getItem(key));
      return value === null ? fallback : value;
    } catch (error) { return fallback; }
  }

  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch (error) { showToast("Browser storage is full or unavailable."); }
  }

  function id() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function escapeHtml(value) {
    var element = document.createElement("div");
    element.textContent = value == null ? "" : String(value);
    return element.innerHTML;
  }

  function showToast(message) {
    var toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(function () { toast.classList.remove("show"); }, 2600);
  }

  function getActiveMaterial() {
    if (activeMaterialId) {
      var found = materials.find(function (item) { return item.id === activeMaterialId; });
      if (found) return found;
    }
    return materials[0] || null;
  }

  function countCards() {
    return materials.reduce(function (total, material) {
      return total + (material.resources && Array.isArray(material.resources.flashcards)
        ? material.resources.flashcards.length : 0);
    }, 0);
  }

  function countChatMessages() {
    return Object.keys(chatMessages).reduce(function (total, key) {
      return total + (Array.isArray(chatMessages[key]) ? chatMessages[key].length : 0);
    }, 0);
  }

  function updateStats() {
    document.getElementById("materialCount").textContent = materials.length;
    document.getElementById("cardCount").textContent = countCards();
    document.getElementById("chatCount").textContent = countChatMessages();
    document.getElementById("settingsMaterialCount").textContent = materials.length;
    document.getElementById("apiCallCount").textContent = Number(localStorage.getItem(API_COUNT) || 0);
  }

  function setView(viewName) {
    document.querySelectorAll(".view").forEach(function (view) { view.classList.remove("active"); });
    document.querySelectorAll(".nav-item").forEach(function (item) { item.classList.remove("active"); });

    var view = document.getElementById(viewName + "View");
    if (view) view.classList.add("active");
    var nav = document.querySelector('.nav-item[data-view="' + viewName + '"]');
    if (nav) nav.classList.add("active");

    var titles = {
      dashboard: ["Workspace", "Good " + greeting()],
      focus: ["Focus", "Focus Timer"],
      materials: ["Library", "My Study Materials"],
      flashcards: ["Practice", "Flashcards"],
      notes: ["Resources", "Smart Notes"],
      importantNotes: ["Revision", "Important Questions"],
      chat: ["Assistant", "AI Chat"],
      settings: ["Preferences", "Settings"]
    };
    document.getElementById("pageEyebrow").textContent = titles[viewName][0];
    document.getElementById("pageTitle").textContent = titles[viewName][1];
    window.history.replaceState(null, "", viewName === "dashboard"
      ? window.location.pathname + window.location.search : "#" + viewName);
    if (viewName !== "focus" && focusModeActive) {
      focusModeActive = false;
      document.body.classList.remove("focus-active");
      document.getElementById("focusModeButton").setAttribute("aria-pressed", "false");
      document.getElementById("focusModeButton").textContent = "Enter focus mode";
    }
    document.getElementById("sidebar").classList.remove("open");

    if (viewName === "flashcards") renderFlashcards();
    if (viewName === "notes") renderNotes();
    if (viewName === "importantNotes") renderImportantQuestions();
    if (viewName === "chat") renderChat();
    if (viewName === "focus") renderTimer();
  }

  function greeting() {
    var hour = new Date().getHours();
    if (hour < 12) return "morning!";
    if (hour < 18) return "afternoon!";
    return "evening!";
  }

  function durationForMode(mode) {
    if (mode === "short") return 5;
    if (mode === "long") return 15;
    return focusMinutes;
  }

  function saveTimerState() {
    save("sb_focus_timer", timerState);
  }

  function renderTimer() {
    var display = document.getElementById("timerDisplay");
    var minutes = Math.floor(timerState.remaining / 60);
    var seconds = timerState.remaining % 60;
    display.textContent = String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
    var circumference = 2 * Math.PI * 88;
    var progress = timerState.duration > 0
      ? (timerState.duration * 60 - timerState.remaining) / (timerState.duration * 60) : 0;
    document.getElementById("timerProgress").style.strokeDasharray = String(circumference);
    document.getElementById("timerProgress").style.strokeDashoffset = String(circumference * progress);
    document.getElementById("timerModeLabel").textContent =
      timerState.mode === "short" ? "SHORT BREAK" : timerState.mode === "long" ? "LONG BREAK" : "FOCUS SESSION";
    var durationInput = document.getElementById("focusDuration");
    if (document.activeElement !== durationInput) durationInput.value = focusMinutes;
    document.getElementById("startTimer").disabled = timerState.running || timerState.remaining === 0;
    document.getElementById("pauseTimer").disabled = !timerState.running;
    document.getElementById("startTimer").textContent = timerState.mode === "focus" ? "Start focus" : "Start break";
    document.querySelectorAll("[data-timer-mode]").forEach(function (button) {
      var selected = button.dataset.timerMode === timerState.mode;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-pressed", selected ? "true" : "false");
    });
    updateFocusStats();
  }

  function updateFocusStats() {
    document.getElementById("focusSessionCount").textContent = Number(SBLoad("sb_sessions", 0)) || 0;
    document.getElementById("focusMinutesCount").textContent = Number(SBLoad("sb_focus_minutes_total", 0)) || 0;
  }

  function setTimerMode(mode) {
    if (timerModes.indexOf(mode) < 0) return;
    window.clearInterval(timerInterval);
    timerInterval = null;
    timerState.mode = mode;
    timerState.duration = durationForMode(mode);
    timerState.remaining = timerState.duration * 60;
    timerState.running = false;
    timerState.endAt = 0;
    document.getElementById("timerStatus").textContent =
      mode === "focus" ? "Ready when you are." : "Take a moment to recharge.";
    saveTimerState();
    renderTimer();
  }

  function finishTimer() {
    window.clearInterval(timerInterval);
    timerInterval = null;
    timerState.running = false;
    timerState.remaining = 0;
    timerState.endAt = 0;
    if (timerState.mode === "focus") {
      var sessions = (Number(SBLoad("sb_sessions", 0)) || 0) + 1;
      var totalMinutes = (Number(SBLoad("sb_focus_minutes_total", 0)) || 0) + timerState.duration;
      save("sb_sessions", sessions);
      save("sb_focus_minutes_total", totalMinutes);
      document.getElementById("timerStatus").textContent = "Focus session complete. Take a short break.";
      showToast("Focus session complete. Nice work!");
    } else {
      document.getElementById("timerStatus").textContent = "Break complete. Ready to focus again?";
      showToast("Break complete. You're ready for another session.");
    }
    saveTimerState();
    renderTimer();
  }

  function tickTimer() {
    timerState.remaining = Math.max(0, Math.ceil((timerState.endAt - Date.now()) / 1000));
    if (timerState.remaining === 0) {
      finishTimer();
      return;
    }
    renderTimer();
  }

  function startTimer() {
    if (timerState.running || timerState.remaining === 0) return;
    timerState.running = true;
    timerState.endAt = Date.now() + timerState.remaining * 1000;
    document.getElementById("timerStatus").textContent =
      timerState.mode === "focus" ? "You're doing great. Stay with it." : "Enjoy your well-earned pause.";
    saveTimerState();
    renderTimer();
    timerInterval = window.setInterval(tickTimer, 1000);
  }

  function pauseTimer() {
    if (!timerState.running) return;
    timerState.remaining = Math.max(0, Math.ceil((timerState.endAt - Date.now()) / 1000));
    if (timerState.remaining === 0) {
      finishTimer();
      return;
    }
    window.clearInterval(timerInterval);
    timerInterval = null;
    timerState.running = false;
    timerState.endAt = 0;
    document.getElementById("timerStatus").textContent = "Paused. Pick it up when you're ready.";
    saveTimerState();
    renderTimer();
  }

  function resetTimer() {
    window.clearInterval(timerInterval);
    timerInterval = null;
    timerState.duration = durationForMode(timerState.mode);
    timerState.remaining = timerState.duration * 60;
    timerState.running = false;
    timerState.endAt = 0;
    document.getElementById("timerStatus").textContent = "Timer reset. Ready when you are.";
    saveTimerState();
    renderTimer();
  }

  function relativeDate(timestamp) {
    var difference = Date.now() - timestamp;
    var days = Math.floor(difference / 86400000);
    if (days <= 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return days + " days ago";
    return new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  function renderMaterials() {
    var recent = document.getElementById("recentMaterials");
    var all = document.getElementById("allMaterials");
    var sorted = materials.slice().sort(function (a, b) { return b.createdAt - a.createdAt; });

    function card(material) {
      var ready = Boolean(material.resources);
      var name = escapeHtml(material.name);
      return '<article class="material-card" data-material-id="' + material.id + '">' +
        '<div class="material-card-head"><span class="file-icon ' + (material.type === "text" ? "text" : "") + '">' +
        '<img src="icons/materials.png" alt=""></span></div>' +
        '<h3>' + name + '</h3><p>' + (material.type === "pdf" ? "PDF" : "Pasted text") + ' · ' + relativeDate(material.createdAt) + '</p>' +
        '<div class="material-card-footer"><span class="ready-pill ' + (ready ? "" : "pending") + '">' + (ready ? "Ready" : "Processing") + '</span><span aria-hidden="true">→</span></div></article>';
    }

    if (!sorted.length) {
      var empty = '<div class="material-empty">No study materials yet. Add a PDF or paste text to begin.</div>';
      recent.innerHTML = empty;
      all.innerHTML = empty;
    } else {
      recent.innerHTML = sorted.slice(0, 3).map(card).join("");
      all.innerHTML = sorted.map(card).join("");
    }
  }

  function fillMaterialSelect(selectId) {
    var select = document.getElementById(selectId);
    if (!materials.length) {
      select.innerHTML = '<option value="">No materials</option>';
      select.disabled = true;
      return;
    }
    select.disabled = false;
    select.innerHTML = materials.map(function (material) {
      return '<option value="' + material.id + '">' + escapeHtml(material.name) + '</option>';
    }).join("");
    var active = getActiveMaterial();
    select.value = active ? active.id : materials[0].id;
  }

  function refreshAll() {
    save(STORAGE, materials);
    updateStats();
    renderMaterials();
    ["flashcardMaterial", "notesMaterial", "importantQuestionsMaterial", "chatMaterial"].forEach(fillMaterialSelect);
  }

  function openUpload() {
    var modal = document.getElementById("uploadModal");
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
  }

  function closeUpload() {
    var modal = document.getElementById("uploadModal");
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
  }

  function setUploadTab(tabName) {
    activeUploadTab = tabName;
    document.querySelectorAll(".upload-tab").forEach(function (tab) {
      tab.classList.toggle("active", tab.dataset.uploadTab === tabName);
    });
    document.querySelectorAll(".upload-pane").forEach(function (pane) { pane.classList.remove("active"); });
    document.getElementById(tabName === "pdf" ? "pdfPane" : "textPane").classList.add("active");
    document.getElementById("processMaterial").disabled = true;
  }

  async function extractPdf(file) {
    if (file.size > 10 * 1024 * 1024) throw new Error("Please choose a PDF smaller than 10 MB.");
    var pdfModule = await import("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs");
    pdfModule.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";
    var buffer = await file.arrayBuffer();
    var pdf = await pdfModule.getDocument({ data: buffer }).promise;
    var allText = [];
    var pageLimit = Math.min(pdf.numPages, 60);
    for (var pageNumber = 1; pageNumber <= pageLimit; pageNumber++) {
      var page = await pdf.getPage(pageNumber);
      var content = await page.getTextContent();
      allText.push(content.items.map(function (item) { return item.str; }).join(" "));
    }
    return allText.join("\n").replace(/\s+/g, " ").trim();
  }

  function incrementApiCount() {
    var count = Number(localStorage.getItem(API_COUNT) || 0) + 1;
    localStorage.setItem(API_COUNT, String(count));
    document.getElementById("apiCallCount").textContent = count;
  }

  async function generateResources(material) {
    material.resources = null;
    refreshAll();
    var response = await fetch("/api/generate-learning-resources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ materialId: material.id, title: material.name, text: material.text })
    });
    incrementApiCount();
    var data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not generate learning resources.");
    material.resources = data.resources;
    refreshAll();
  }

  async function processUpload() {
    var title;
    var text;
    if (activeUploadTab === "pdf") {
      title = selectedPdfName.replace(/\.pdf$/i, "") || "Untitled PDF";
      text = selectedPdfText;
    } else {
      title = document.getElementById("textTitle").value.trim();
      text = document.getElementById("pastedText").value.trim();
      if (!title) title = "Pasted study material";
    }
    if (!text) {
      document.getElementById("modalStatus").textContent = "Please add study material first.";
      return;
    }

    var button = document.getElementById("processMaterial");
    var status = document.getElementById("modalStatus");
    button.disabled = true;
    button.textContent = "Processing...";
    status.textContent = "Organising your material...";

    var material = { id: id(), name: title, type: activeUploadTab, text: text.slice(0, 16000), createdAt: Date.now(), resources: null };
    materials.unshift(material);
    activeMaterialId = material.id;
    refreshAll();

    try {
      await generateResources(material);
      closeUpload();
      showToast("Learning resources are ready.");
      setView("notes");
    } catch (error) {
      status.textContent = error.message;
      material.resources = null;
      refreshAll();
    } finally {
      button.disabled = false;
      button.textContent = "Process material";
    }
  }

  function renderFlashcards() {
    fillMaterialSelect("flashcardMaterial");
    var material = getActiveMaterial();
    var cards = material && material.resources && Array.isArray(material.resources.flashcards)
      ? material.resources.flashcards : [];
    if (!cards.length) {
      document.getElementById("flashcardText").textContent = "Add study material to generate flashcards.";
      document.getElementById("flashcardTag").textContent = "Flashcard";
      document.getElementById("flashcardCounter").textContent = "0 / 0";
      document.getElementById("progressPercent").textContent = "0%";
      document.querySelector(".progress-ring").style.setProperty("--progress", "0%");
      return;
    }
    if (flashcardIndex >= cards.length) flashcardIndex = 0;
    var card = cards[flashcardIndex];
    var flashcard = document.getElementById("flashcard");
    flashcard.classList.toggle("answer", showingAnswer);
    document.getElementById("flashcardTag").textContent = showingAnswer ? "Answer" : "Question";
    document.getElementById("flashcardText").textContent = showingAnswer ? card.answer : card.question;
    document.getElementById("flashcardCounter").textContent = (flashcardIndex + 1) + " / " + cards.length;
    var percent = Math.round(((flashcardIndex + 1) / cards.length) * 100);
    document.getElementById("progressPercent").textContent = percent + "%";
    document.querySelector(".progress-ring").style.setProperty("--progress", percent + "%");
  }

  function moveCard(step) {
    var material = getActiveMaterial();
    var cards = material && material.resources ? material.resources.flashcards || [] : [];
    if (!cards.length) return;
    flashcardIndex = (flashcardIndex + step + cards.length) % cards.length;
    showingAnswer = false;
    renderFlashcards();
  }

  function renderNotes() {
    fillMaterialSelect("notesMaterial");
    var material = getActiveMaterial();
    var content = document.getElementById("notesContent");
    if (!material || !material.resources) {
      content.innerHTML = "<h3>No generated notes yet</h3><p>Upload or paste study material first.</p>";
      return;
    }
    var resources = material.resources;
    var html = "";
    if (activeNoteTab === "smartNotes") {
      html = "<h3>Smart notes</h3><p>" + escapeHtml(resources.smartNotes || "No smart notes available.") + "</p>";
    } else if (activeNoteTab === "summary") {
      html = "<h3>Topic summary</h3><p>" + escapeHtml(resources.summary || "No summary available.") + "</p>";
    } else if (activeNoteTab === "keyPoints") {
      html = "<h3>Key points</h3><ul>" + (resources.keyPoints || []).map(function (point) {
        return "<li>" + escapeHtml(point) + "</li>";
      }).join("") + "</ul>";
    } else {
      html = "<h3>Important questions</h3><ol>" + (resources.importantQuestions || []).map(function (question) {
        return "<li>" + escapeHtml(question) + "</li>";
      }).join("") + "</ol>";
    }
    content.innerHTML = html;
  }

  function renderImportantQuestions() {
    fillMaterialSelect("importantQuestionsMaterial");
    var material = getActiveMaterial();
    var content = document.getElementById("importantQuestionsContent");
    var questions = material && material.resources && Array.isArray(material.resources.importantQuestions)
      ? material.resources.importantQuestions : [];
    if (!questions.length) {
      content.innerHTML = "<h3>No questions yet</h3><p>Add study material to generate important questions.</p>";
      return;
    }
    content.innerHTML = "<h3>Important questions</h3><ol>" + questions.map(function (question) {
      return "<li>" + escapeHtml(question) + "</li>";
    }).join("") + "</ol>";
  }

  function renderChat() {
    fillMaterialSelect("chatMaterial");
    var material = getActiveMaterial();
    var messages = material ? (chatMessages[material.id] || []) : [];
    var box = document.getElementById("chatMessages");
    if (!messages.length) {
      box.innerHTML = '<div class="chat-empty"><span class="ai-orb"><img src="icons/ai_chat.png" alt=""></span><h3>Ask about your study material</h3><p>Get a clear answer in plain language.</p><div class="suggestion-grid"><button data-question="Explain the main idea in simple words">Explain the main idea</button><button data-question="What are the most important points?">Important points</button><button data-question="Create a short revision summary">Create a summary</button></div></div>';
      return;
    }
    box.innerHTML = messages.map(function (message) {
      return '<div class="message-row ' + message.role + '"><div class="message">' +
        escapeHtml(message.content).replace(/\n/g, "<br>") + "</div></div>";
    }).join("");
    box.scrollTop = box.scrollHeight;
  }

  async function sendChat(question) {
    var material = getActiveMaterial();
    if (!material) {
      showToast("Add study material before starting a chat.");
      return;
    }
    var input = document.getElementById("chatInput");
    if (!question) question = input.value.trim();
    if (!question) return;

    var messages = chatMessages[material.id] || [];
    messages.push({ role: "user", content: question });
    chatMessages[material.id] = messages;
    save(CHAT_STORAGE, chatMessages);
    input.value = "";
    renderChat();

    var button = document.querySelector(".send-button");
    button.disabled = true;
    try {
      var response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materialId: material.id,
          text: material.text,
          question: question,
          history: messages.slice(-5)
        })
      });
      incrementApiCount();
      var data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not answer the question.");
      messages.push({ role: "assistant", content: data.answer });
      chatMessages[material.id] = messages;
      save(CHAT_STORAGE, chatMessages);
      renderChat();
      updateStats();
    } catch (error) {
      showToast(error.message);
      messages.pop();
      chatMessages[material.id] = messages;
      save(CHAT_STORAGE, chatMessages);
      renderChat();
    } finally {
      button.disabled = false;
    }
  }

  document.querySelectorAll(".nav-item[data-view]").forEach(function (item) {
    item.addEventListener("click", function () { setView(item.dataset.view); });
  });
  document.querySelectorAll("[data-go]").forEach(function (button) {
    button.addEventListener("click", function () { setView(button.dataset.go); });
  });
  document.getElementById("profileButton").addEventListener("click", function () { setView("settings"); });
  document.getElementById("themeButton").addEventListener("click", function () {
    var theme = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    SBTheme.set(theme);
  });
  document.getElementById("menuButton").addEventListener("click", function () {
    document.getElementById("sidebar").classList.toggle("open");
  });
  ["openUpload", "openUpload2"].forEach(function (id) {
    document.getElementById(id).addEventListener("click", openUpload);
  });
  document.getElementById("closeUpload").addEventListener("click", closeUpload);
  document.getElementById("cancelUpload").addEventListener("click", closeUpload);
  document.getElementById("uploadModal").addEventListener("click", function (event) {
    if (event.target === event.currentTarget) closeUpload();
  });
  document.querySelectorAll(".upload-tab").forEach(function (tab) {
    tab.addEventListener("click", function () { setUploadTab(tab.dataset.uploadTab); });
  });

  var pdfInput = document.getElementById("pdfInput");
  var dropZone = document.getElementById("dropZone");
  async function handlePdf(file) {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      document.getElementById("modalStatus").textContent = "Please choose a PDF file.";
      return;
    }
    var button = document.getElementById("processMaterial");
    var status = document.getElementById("modalStatus");
    status.textContent = "Reading PDF...";
    button.disabled = true;
    try {
      selectedPdfName = file.name;
      selectedPdfText = await extractPdf(file);
      if (!selectedPdfText) throw new Error("No readable text was found in this PDF.");
      document.getElementById("fileName").textContent = file.name;
      status.textContent = "PDF ready: " + selectedPdfText.length + " characters extracted.";
      button.disabled = false;
    } catch (error) {
      status.textContent = error.message;
      selectedPdfText = "";
      selectedPdfName = "";
    }
  }
  pdfInput.addEventListener("change", function () { handlePdf(pdfInput.files[0]); });
  ["dragenter", "dragover"].forEach(function (eventName) {
    dropZone.addEventListener(eventName, function (event) {
      event.preventDefault();
      dropZone.classList.add("drag");
    });
  });
  ["dragleave", "drop"].forEach(function (eventName) {
    dropZone.addEventListener(eventName, function (event) {
      event.preventDefault();
      dropZone.classList.remove("drag");
    });
  });
  dropZone.addEventListener("drop", function (event) {
    handlePdf(event.dataTransfer.files[0]);
  });
  document.getElementById("textTitle").addEventListener("input", updateTextProcessButton);
  document.getElementById("pastedText").addEventListener("input", updateTextProcessButton);
  function updateTextProcessButton() {
    document.getElementById("processMaterial").disabled =
      !document.getElementById("pastedText").value.trim();
  }
  document.getElementById("processMaterial").addEventListener("click", processUpload);

  document.getElementById("flashcard").addEventListener("click", function () {
    var material = getActiveMaterial();
    if (!material || !material.resources || !material.resources.flashcards) return;
    showingAnswer = !showingAnswer;
    renderFlashcards();
  });
  document.getElementById("previousCard").addEventListener("click", function () { moveCard(-1); });
  document.getElementById("nextCard").addEventListener("click", function () { moveCard(1); });
  document.getElementById("knownCard").addEventListener("click", function () { moveCard(1); showToast("Marked for progress"); });
  document.getElementById("reviewCard").addEventListener("click", function () { moveCard(1); showToast("Added to review"); });
  ["flashcardMaterial", "notesMaterial", "importantQuestionsMaterial", "chatMaterial"].forEach(function (selectId) {
    document.getElementById(selectId).addEventListener("change", function (event) {
      activeMaterialId = event.target.value;
      flashcardIndex = 0;
      showingAnswer = false;
      if (selectId === "flashcardMaterial") renderFlashcards();
      if (selectId === "notesMaterial") renderNotes();
      if (selectId === "importantQuestionsMaterial") renderImportantQuestions();
      if (selectId === "chatMaterial") renderChat();
    });
  });
  document.querySelectorAll(".tab").forEach(function (tab) {
    tab.addEventListener("click", function () {
      activeNoteTab = tab.dataset.noteTab;
      document.querySelectorAll(".tab").forEach(function (item) { item.classList.remove("active"); });
      tab.classList.add("active");
      renderNotes();
    });
  });
  document.getElementById("chatForm").addEventListener("submit", function (event) {
    event.preventDefault();
    sendChat();
  });
  document.getElementById("chatMessages").addEventListener("click", function (event) {
    var button = event.target.closest("[data-question]");
    if (button) sendChat(button.dataset.question);
  });
  document.getElementById("newChat").addEventListener("click", function () {
    var material = getActiveMaterial();
    if (!material) return;
    chatMessages[material.id] = [];
    save(CHAT_STORAGE, chatMessages);
    renderChat();
    updateStats();
  });

  document.querySelectorAll("[data-timer-mode]").forEach(function (button) {
    button.addEventListener("click", function () { setTimerMode(button.dataset.timerMode); });
  });
  document.getElementById("startTimer").addEventListener("click", startTimer);
  document.getElementById("pauseTimer").addEventListener("click", pauseTimer);
  document.getElementById("resetTimer").addEventListener("click", resetTimer);
  document.getElementById("timerDurationForm").addEventListener("submit", function (event) {
    event.preventDefault();
    var input = document.getElementById("focusDuration");
    var error = document.getElementById("durationError");
    var raw = input.value.trim();
    var minutes = Number(raw);
    error.textContent = "";
    input.classList.remove("invalid");
    if (!raw) error.textContent = "Enter a focus length.";
    else if (!Number.isInteger(minutes)) error.textContent = "Use a whole number of minutes.";
    else if (minutes < 1 || minutes > 180) error.textContent = "Choose between 1 and 180 minutes.";
    if (error.textContent) {
      input.classList.add("invalid");
      return;
    }
    focusMinutes = minutes;
    save("sb_minutes", focusMinutes);
    setTimerMode("focus");
    document.getElementById("timerStatus").textContent = "Focus length set to " + minutes + " minutes.";
  });
  document.getElementById("focusDuration").addEventListener("input", function () {
    document.getElementById("durationError").textContent = "";
    this.classList.remove("invalid");
  });
  document.getElementById("focusModeButton").addEventListener("click", function () {
    focusModeActive = !focusModeActive;
    document.body.classList.toggle("focus-active", focusModeActive);
    this.setAttribute("aria-pressed", focusModeActive ? "true" : "false");
    this.textContent = focusModeActive ? "Exit focus mode" : "Enter focus mode";
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && focusModeActive) {
      focusModeActive = false;
      document.body.classList.remove("focus-active");
      var focusModeButton = document.getElementById("focusModeButton");
      focusModeButton.setAttribute("aria-pressed", "false");
      focusModeButton.textContent = "Enter focus mode";
    }
  });

  document.querySelectorAll(".theme-option").forEach(function (button) {
    var active = document.documentElement.getAttribute("data-theme") === button.dataset.themeChoice;
    button.classList.toggle("active", active);
    button.addEventListener("click", function () {
      SBTheme.set(button.dataset.themeChoice);
      document.querySelectorAll(".theme-option").forEach(function (item) { item.classList.remove("active"); });
      button.classList.add("active");
    });
  });
  document.getElementById("clearData").addEventListener("click", function () {
    if (!window.confirm("Delete all materials and chats? This cannot be undone.")) return;
    materials = [];
    chatMessages = {};
    activeMaterialId = null;
    localStorage.removeItem(STORAGE);
    localStorage.removeItem(CHAT_STORAGE);
    localStorage.removeItem(API_COUNT);
    refreshAll();
    renderChat();
    showToast("All study data deleted.");
  });
  document.addEventListener("click", function (event) {
    var card = event.target.closest(".material-card");
    if (!card) return;
    activeMaterialId = card.dataset.materialId;
    setView("notes");
  });

  fetch("/api/status").then(function (response) { return response.json(); }).then(function (status) {
    var dot = document.getElementById("apiStatusDot");
    var text = document.getElementById("apiStatusText");
    if (status.configured) {
      dot.className = "ok";
      text.textContent = "Gemini connected · " + status.model;
    } else {
      dot.className = "error";
      text.textContent = "Gemini not configured";
    }
  }).catch(function () {
    document.getElementById("apiStatusDot").className = "error";
    document.getElementById("apiStatusText").textContent = "Server unavailable";
  });

  refreshAll();
  var requestedView = window.location.hash.slice(1);
  var availableViews = ["dashboard", "focus", "materials", "flashcards", "notes", "importantNotes", "chat", "settings"];
  setView(availableViews.indexOf(requestedView) >= 0 ? requestedView : "dashboard");
  if (timerState.running) {
    if (timerState.remaining === 0) {
      finishTimer();
    } else {
      document.getElementById("timerStatus").textContent =
        timerState.mode === "focus" ? "You're doing great. Stay with it." : "Enjoy your well-earned pause.";
      timerInterval = window.setInterval(tickTimer, 1000);
    }
  } else {
    renderTimer();
  }
})();
