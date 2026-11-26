/**
 * EngiLab — Interactive MCQ Practice & Concept Clarity Engine (languages.html)
 */

import { addXP, highlightCode } from "./app.js";

const LANG_STORAGE_KEY = "selectedLanguage";
const SUPPORTED_LANGUAGES = ["Python", "C++", "C", "Java", "Go", "Rust", "SQL"];

// In-memory questions indexed by language
let questionsByLang = {
  Python: [],
  C: [],
  "C++": [],
  Java: [],
  Go: [],
  Rust: [],
  SQL: []
};

let activeLanguage = "Python";
let currentTool = "topics"; // "topics" or "mcq"

// Active session state
let sessionQuestions = [];
let currentIndex = 0;
let correctCount = 0;
let sessionXP = 0;
let answeredCurrent = false;
let topicStats = {};

function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

async function loadQuestions() {
  try {
    const response = await fetch("data/questions.json");
    if (!response.ok) {
      throw new Error(`Failed to load questions.json (${response.status})`);
    }
    const data = await response.json();

    if (Array.isArray(data)) {
      // Array format: group by question.language
      SUPPORTED_LANGUAGES.forEach((lang) => {
        questionsByLang[lang] = data.filter((q) => q.language === lang);
      });
    } else if (typeof data === "object" && data !== null) {
      // Language-keyed dictionary format
      SUPPORTED_LANGUAGES.forEach((lang) => {
        questionsByLang[lang] = Array.isArray(data[lang]) ? data[lang] : [];
      });
    }
  } catch (err) {
    console.warn("Could not load data/questions.json, using empty bank:", err);
    SUPPORTED_LANGUAGES.forEach((lang) => {
      questionsByLang[lang] = [];
    });
  }
}

/**
 * Clean 2-Way View Switching between Topics & Notes and MCQ Practice
 */
export function switchTool(tool) {
  currentTool = tool === "mcq" ? "mcq" : "topics";

  // 1. Update active highlight class on sidebar buttons
  const buttons = document.querySelectorAll("#language-tools-list [data-tool]");
  buttons.forEach((btn) => {
    const isTarget = btn.dataset.tool === currentTool;
    btn.classList.toggle("sidebar-item--active", isTarget);
    btn.classList.toggle("active", isTarget);
    if (isTarget) {
      btn.setAttribute("aria-current", "page");
    } else {
      btn.removeAttribute("aria-current");
    }
  });

  const topicsView = document.getElementById("topics-view") || document.getElementById("topics-reader");
  const topicsFallback = document.getElementById("topics-fallback");
  const mcqView = document.getElementById("mcq-view") || document.getElementById("mcq-workspace");

  if (currentTool === "mcq") {
    // Explicitly hide #topics-view
    if (topicsView) {
      topicsView.style.display = "none";
      topicsView.classList.add("hidden");
    }
    if (topicsFallback) {
      topicsFallback.style.display = "none";
      topicsFallback.classList.add("hidden");
    }
    // Explicitly show #mcq-view
    if (mcqView) {
      mcqView.style.display = "flex";
      mcqView.classList.remove("hidden");
    }
    renderMCQWorkspace(activeLanguage);
  } else {
    // Explicitly hide #mcq-view
    if (mcqView) {
      mcqView.style.display = "none";
      mcqView.classList.add("hidden");
    }
    // Explicitly restore #topics-view
    if (topicsView) {
      topicsView.style.display = "flex";
      topicsView.classList.remove("hidden");
    }
    // Sync topics rendering
    if (typeof window.renderWorkspaceForLanguage === "function") {
      window.renderWorkspaceForLanguage(activeLanguage);
    }
  }
}

export function setActiveLanguage(lang, shouldMinimize = true) {
  activeLanguage = SUPPORTED_LANGUAGES.includes(lang) ? lang : "Python";
  localStorage.setItem(LANG_STORAGE_KEY, activeLanguage);

  // Sync active state across selector cards
  document.querySelectorAll(".lang-card[data-lang]").forEach((card) => {
    const isMatch = card.dataset.lang === activeLanguage;
    card.classList.toggle("lang-card--active", isMatch);
    card.setAttribute("aria-pressed", String(isMatch));
  });

  // Update workspace labels & headings
  const workspaceBadge = document.getElementById("active-workspace-badge");
  const pillName = document.getElementById("sidebar-lang-pill-name");
  const sidebarHeading = document.getElementById("sidebar-tools-heading");

  if (workspaceBadge) workspaceBadge.textContent = `Active Workspace: ${activeLanguage}`;
  if (pillName) pillName.textContent = activeLanguage;
  if (sidebarHeading) sidebarHeading.textContent = `${activeLanguage.toUpperCase()} TOOLS`;

  if (shouldMinimize) {
    document.getElementById("top-lang-header")?.classList.add("is-minimized");
    document.getElementById("sidebar-lang-switcher")?.classList.remove("hidden");
    document.getElementById("lab-layout")?.classList.add("lab-layout--full");
  }

  // Refresh whichever tool is currently active
  if (currentTool === "mcq") {
    renderMCQWorkspace(activeLanguage);
  } else {
    if (typeof window.renderWorkspaceForLanguage === "function") {
      window.renderWorkspaceForLanguage(activeLanguage);
    }
  }

  window.dispatchEvent(
    new CustomEvent("engilab:language-changed", { detail: { language: activeLanguage } })
  );
}

export function renderMCQWorkspace(lang) {
  const currentLang = lang || activeLanguage || "Python";
  let questions = [];

  try {
    if (questionsByLang && Array.isArray(questionsByLang[currentLang])) {
      questions = questionsByLang[currentLang];
    } else {
      questions = [];
    }
  } catch (err) {
    console.warn("Could not retrieve questions for", currentLang, err);
    questions = [];
  }

  const emptyState = document.getElementById("mcq-empty-state");
  const setupScreen = document.getElementById("mcq-setup-screen");
  const arena = document.getElementById("mcq-arena");
  const scorecard = document.getElementById("mcq-scorecard");

  if (arena) {
    arena.classList.add("hidden");
    arena.style.display = "none";
  }
  if (scorecard) {
    scorecard.classList.add("hidden");
    scorecard.style.display = "none";
  }

  // Graceful Empty State: when selected language has 0 questions
  if (questions.length === 0) {
    if (setupScreen) {
      setupScreen.classList.add("hidden");
      setupScreen.style.display = "none";
    }
    if (emptyState) {
      emptyState.classList.remove("hidden");
      emptyState.style.display = "flex";
    }

    const emptyTitle = document.getElementById("mcq-empty-title");
    const emptyDesc = document.getElementById("mcq-empty-desc");
    if (emptyTitle) emptyTitle.textContent = `${currentLang} MCQ Practice`;
    if (emptyDesc) {
      emptyDesc.innerHTML = `No practice questions added for ${currentLang} yet. Add MCQs to <code>data/questions.json</code> to unlock concept clarity quizzes.`;
    }
  } else {
    // Stage 1: Setup Screen
    if (emptyState) {
      emptyState.classList.add("hidden");
      emptyState.style.display = "none";
    }
    if (setupScreen) {
      setupScreen.classList.remove("hidden");
      setupScreen.style.display = "flex";
    }

    const langBadge = document.getElementById("mcq-setup-lang-badge");
    const title = document.getElementById("mcq-setup-title");
    const counter = document.getElementById("mcq-bank-counter");

    if (langBadge) langBadge.textContent = currentLang;
    if (title) title.textContent = `${currentLang} Concept Clarity Practice`;
    if (counter) counter.textContent = `${questions.length} Curated MCQs Available`;

    renderMCQTopicCheckboxes(questions);
  }
}

function renderMCQTopicCheckboxes(questions) {
  const container = document.getElementById("mcq-topic-checkboxes");
  if (!container) return;
  container.innerHTML = "";

  const uniqueTopics = [...new Set(questions.map((q) => q.topic || "Core"))];

  uniqueTopics.forEach((topic) => {
    const label = document.createElement("label");
    label.className = "mcq-radio-pill";
    label.style.cursor = "pointer";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.name = "mcq-filter-topic";
    input.value = topic;
    input.checked = true;

    const span = document.createElement("span");
    span.textContent = topic;

    label.appendChild(input);
    label.appendChild(span);
    container.appendChild(label);
  });
}

function startQuizSession() {
  const setupError = document.getElementById("mcq-setup-error");
  const setupScreen = document.getElementById("mcq-setup-screen");
  const arena = document.getElementById("mcq-arena");

  const questions = questionsByLang[activeLanguage] || [];
  const checkedTopics = Array.from(
    document.querySelectorAll('input[name="mcq-filter-topic"]:checked')
  ).map((el) => el.value);

  if (checkedTopics.length === 0) {
    if (setupError) {
      setupError.textContent = "Please select at least one topic to practice.";
      setupError.classList.remove("hidden");
      setupError.style.display = "block";
    }
    return;
  }

  const matching = questions.filter((q) => checkedTopics.includes(q.topic || "Core"));
  if (matching.length === 0) {
    if (setupError) {
      setupError.textContent = "No questions match the selected topics.";
      setupError.classList.remove("hidden");
      setupError.style.display = "block";
    }
    return;
  }

  if (setupError) {
    setupError.classList.add("hidden");
    setupError.style.display = "none";
  }

  const countChoice =
    document.querySelector('input[name="mcq-count"]:checked')?.value || "5";
  const limit = countChoice === "all" ? matching.length : parseInt(countChoice, 10);

  sessionQuestions = shuffleArray(matching).slice(0, limit);
  currentIndex = 0;
  correctCount = 0;
  sessionXP = 0;
  topicStats = {};

  if (setupScreen) {
    setupScreen.classList.add("hidden");
    setupScreen.style.display = "none";
  }
  if (arena) {
    arena.classList.remove("hidden");
    arena.style.display = "flex";
  }

  renderCurrentQuestion();
}

function renderCurrentQuestion() {
  answeredCurrent = false;
  const q = sessionQuestions[currentIndex];
  const total = sessionQuestions.length;

  const progressText = document.getElementById("mcq-progress-text");
  const progressFill = document.getElementById("mcq-progress-fill");
  const topicBadge = document.getElementById("mcq-topic-badge");
  const xpDisplay = document.getElementById("mcq-session-xp");
  const promptEl = document.getElementById("mcq-question-prompt");
  const codeWrapper = document.getElementById("mcq-code-wrapper");
  const codeBlock = document.getElementById("mcq-code-block");
  const codeFilename = document.getElementById("mcq-code-filename");
  const optionsContainer = document.getElementById("mcq-options");
  const explBox = document.getElementById("mcq-explanation-box");
  const nextBtn = document.getElementById("mcq-next-btn");

  if (progressText) progressText.textContent = `Question ${currentIndex + 1} of ${total}`;
  if (progressFill) progressFill.style.width = `${((currentIndex + 1) / total) * 100}%`;
  if (topicBadge) topicBadge.textContent = q.topic || "Core";
  if (xpDisplay) xpDisplay.textContent = `+${sessionXP} XP`;
  if (promptEl) promptEl.textContent = q.question;

  if (q.code && q.code.trim().length > 0) {
    if (codeWrapper) {
      codeWrapper.classList.remove("hidden");
      codeWrapper.style.display = "block";
    }
    if (codeFilename) codeFilename.textContent = `${activeLanguage.toLowerCase()}_snippet`;
    if (codeBlock) codeBlock.innerHTML = highlightCode(q.code);
  } else {
    if (codeWrapper) {
      codeWrapper.classList.add("hidden");
      codeWrapper.style.display = "none";
    }
  }

  if (explBox) {
    explBox.classList.add("hidden");
    explBox.style.display = "none";
  }
  if (nextBtn) {
    nextBtn.classList.add("hidden");
    nextBtn.style.display = "none";
    nextBtn.textContent =
      currentIndex === total - 1 ? "View Concept Clarity Scorecard →" : "Next Question →";
  }

  if (!optionsContainer) return;
  optionsContainer.innerHTML = "";

  const optKeys = ["A", "B", "C", "D"];
  q.options.forEach((optText, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "option-btn";
    btn.innerHTML = `<span class="option-key">${optKeys[idx] || idx + 1}</span><span></span>`;
    btn.querySelector("span:last-child").textContent = optText;

    btn.addEventListener("click", () => handleOptionSelection(idx, btn));
    optionsContainer.appendChild(btn);
  });
}

function handleOptionSelection(selectedIdx, selectedBtn) {
  if (answeredCurrent) return;
  answeredCurrent = true;

  const q = sessionQuestions[currentIndex];
  const optionsContainer = document.getElementById("mcq-options");
  const explBox = document.getElementById("mcq-explanation-box");
  const statusEl = document.getElementById("mcq-feedback-status");
  const textEl = document.getElementById("mcq-feedback-explanation");
  const nextBtn = document.getElementById("mcq-next-btn");
  const xpDisplay = document.getElementById("mcq-session-xp");

  const buttons = Array.from(optionsContainer.querySelectorAll(".option-btn"));
  buttons.forEach((btn) => (btn.disabled = true));

  // Support both schema property names: answerIndex or correctIndex
  const targetIndex =
    q.answerIndex !== undefined
      ? q.answerIndex
      : q.correctIndex !== undefined
      ? q.correctIndex
      : 0;

  const isCorrect = selectedIdx === targetIndex;

  // Track topic performance for scorecard
  const topicKey = q.topic || "General";
  if (!topicStats[topicKey]) topicStats[topicKey] = { total: 0, correct: 0 };
  topicStats[topicKey].total += 1;

  if (isCorrect) {
    selectedBtn.classList.add("option-btn--correct");
    correctCount += 1;
    sessionXP += 10;
    addXP(10);
    topicStats[topicKey].correct += 1;

    if (explBox) {
      explBox.className = "feedback-box feedback-box--success";
      explBox.classList.remove("hidden");
      explBox.style.display = "block";
    }
    if (statusEl) statusEl.innerHTML = `✓ Correct! (+10 XP)`;
    if (textEl) textEl.textContent = q.explanation || "Great job! Concept mastered.";
  } else {
    selectedBtn.classList.add("option-btn--incorrect");
    if (buttons[targetIndex]) {
      buttons[targetIndex].classList.add("option-btn--correct");
    }

    if (explBox) {
      explBox.className = "feedback-box feedback-box--error";
      explBox.classList.remove("hidden");
      explBox.style.display = "block";
    }
    if (statusEl) statusEl.innerHTML = `✗ Incorrect`;
    if (textEl) textEl.textContent = q.explanation || "Review the concept mechanics.";
  }

  if (xpDisplay) xpDisplay.textContent = `+${sessionXP} XP`;
  if (nextBtn) {
    nextBtn.classList.remove("hidden");
    nextBtn.style.display = "inline-flex";
  }
}

function showScorecard() {
  const arena = document.getElementById("mcq-arena");
  const scorecard = document.getElementById("mcq-scorecard");
  const scoreDisplay = document.getElementById("mcq-score-display");
  const scoreSub = document.getElementById("mcq-score-sub");
  const accuracyList = document.getElementById("mcq-topic-accuracy-list");

  if (arena) {
    arena.classList.add("hidden");
    arena.style.display = "none";
  }
  if (scorecard) {
    scorecard.classList.remove("hidden");
    scorecard.style.display = "block";
  }

  const total = sessionQuestions.length;
  const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  if (scoreDisplay) scoreDisplay.textContent = `${correctCount} / ${total}`;
  if (scoreSub) {
    scoreSub.textContent = `${activeLanguage} Accuracy: ${pct}% · Earned +${sessionXP} XP this session`;
  }

  if (accuracyList) {
    accuracyList.innerHTML = "";
    Object.entries(topicStats).forEach(([topic, stat]) => {
      const tPct = stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0;
      const item = document.createElement("div");
      const tierClass =
        tPct >= 80
          ? "topic-accuracy-item--high"
          : tPct >= 50
          ? "topic-accuracy-item--mid"
          : "topic-accuracy-item--low";

      item.className = `topic-accuracy-item ${tierClass}`;
      item.innerHTML = `
        <span style="font-weight: 500;">${topic}</span>
        <span style="font-family: var(--font-mono); font-size: 0.82rem;">${stat.correct}/${stat.total} (${tPct}%)</span>
      `;
      accuracyList.appendChild(item);
    });
  }
}

/**
 * Initialize event delegation and UI listeners
 */
function initQuizEngine() {
  // 1. Single delegated click listener on parent sidebar list (#language-tools-list)
  const toolsList = document.getElementById("language-tools-list");
  toolsList?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-tool]");
    if (!btn) return;
    const tool = btn.dataset.tool;
    if (tool) {
      switchTool(tool);
    }
  });

  // Direct button fallbacks
  document.getElementById("tool-topics-btn")?.addEventListener("click", () => switchTool("topics"));
  document.getElementById("tool-mcq-btn")?.addEventListener("click", () => switchTool("mcq"));

  // 2. Empty State & Back Buttons
  document.getElementById("mcq-empty-back-btn")?.addEventListener("click", () => switchTool("topics"));
  document.getElementById("mcq-back-to-topics-btn")?.addEventListener("click", () => switchTool("topics"));
  document.getElementById("mcq-scorecard-topics-btn")?.addEventListener("click", () => switchTool("topics"));

  // 3. MCQ Arena Actions
  document.getElementById("mcq-start-btn")?.addEventListener("click", startQuizSession);

  document.getElementById("mcq-next-btn")?.addEventListener("click", () => {
    if (currentIndex < sessionQuestions.length - 1) {
      currentIndex += 1;
      renderCurrentQuestion();
    } else {
      showScorecard();
    }
  });

  document.getElementById("mcq-practice-again-btn")?.addEventListener("click", () => {
    renderMCQWorkspace(activeLanguage);
  });

  // 4. Language Cards in popover & top selector
  document.querySelectorAll(".lang-card[data-lang]").forEach((card) => {
    card.addEventListener("click", () => {
      setActiveLanguage(card.dataset.lang, true);
    });
  });

  // 5. Restore saved language preference
  const savedLang = localStorage.getItem(LANG_STORAGE_KEY);
  if (SUPPORTED_LANGUAGES.includes(savedLang)) {
    setActiveLanguage(savedLang, true);
  } else {
    setActiveLanguage("Python", false);
  }

  // 6. Asynchronously load questions in background without blocking clicks
  loadQuestions().then(() => {
    if (currentTool === "mcq") {
      renderMCQWorkspace(activeLanguage);
    }
  });
}

// Ensure execution runs as soon as DOM is ready or immediately if already loaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initQuizEngine);
} else {
  initQuizEngine();
}

window.switchTool = switchTool;
window.renderMCQWorkspace = renderMCQWorkspace;
