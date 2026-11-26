/**
 * EngiLab — Core State Management & Dashboard Interactions
 */

const STORAGE_KEY = "engilab_state_v1";

const DEFAULT_STATE = {
  xp: 0,
  streak: 0,
  lastDailySolvedDate: null,
  dailySelectedOption: null,
  pollVotes: {
    icpc: 142,
    gsoc: 158
  },
  userPollChoice: null
};

const DAILY_PUZZLE = {
  language: "Python",
  title: "Daily Logic Puzzle — Loop & Reference Trap",
  code: `funcs = []\nfor i in range(3):\n    funcs.append(lambda: i * 2)\n\nresults = [f() for f in funcs]\nprint(results)`,
  options: [
    "[0, 2, 4]",
    "[4, 4, 4]",
    "[6, 6, 6]",
    "[0, 0, 0]"
  ],
  correctIndex: 1,
  explanation:
    "Python closures bind variables by name (late binding), not by value at loop iteration—so all three lambdas look up `i` after the loop finishes at `i = 2`, returning `[4, 4, 4]`."
};

/**
 * Returns local YYYY-MM-DD string.
 */
function getTodayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    const parsed = JSON.parse(raw);
    return {
      ...structuredClone(DEFAULT_STATE),
      ...parsed,
      pollVotes: {
        ...DEFAULT_STATE.pollVotes,
        ...(parsed.pollVotes || {})
      }
    };
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent("engilab:state-updated", { detail: state }));
}

export function isDailySolvedToday() {
  const state = getState();
  return state.lastDailySolvedDate === getTodayKey();
}

export function addXP(amount) {
  const state = getState();
  state.xp += amount;
  saveState(state);
  syncNavbarStats();
  syncDashboardMetrics();
  return state;
}

export function syncNavbarStats() {
  const state = getState();
  const navStreak = document.getElementById("nav-streak");
  const navXp = document.getElementById("nav-xp");

  if (navStreak) {
    navStreak.textContent = `🔥 ${state.streak}d`;
  }
  if (navXp) {
    navXp.textContent = `${state.xp} XP`;
  }
}

function syncDashboardMetrics() {
  const state = getState();
  const statusStreak = document.getElementById("status-streak");
  const statusXp = document.getElementById("status-xp");
  const statusDaily = document.getElementById("status-daily");

  if (statusStreak) statusStreak.textContent = `${state.streak} days`;
  if (statusXp) statusXp.textContent = `${state.xp} XP`;
  if (statusDaily) {
    statusDaily.textContent = isDailySolvedToday() ? "Completed" : "Pending";
    statusDaily.style.color = isDailySolvedToday()
      ? "var(--accent-emerald)"
      : "var(--accent-amber)";
  }
}

/**
 * Lightweight, XSS-safe single-pass syntax highlighter for code snippets.
 */
export function highlightCode(code) {
  if (!code) return "";
  const escaped = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const tokenRegex =
    /(\/\*[\s\S]*?\*\/|\/\/.*$|#.*$|--.*$)|("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|\b(def|return|for|in|if|elif|else|match|case|try|except|finally|with|as|yield|async|await|pass|True|False|None|from|import|lambda|print|auto|int|char|void|const|sizeof|malloc|calloc|printf|strlen|strncpy|qsort|string|size_t|vector|unordered_map|map|cout|new|public|class|boolean|Integer|String|List|ArrayList|PriorityQueue|Collections|Arrays|func|var|defer|fmt|sort|let|mut|vec|println|Option|Some|HashMap|SELECT|FROM|WHERE|LEFT|RIGHT|FULL|OUTER|INNER|CROSS|JOIN|ON|GROUP|BY|HAVING|ORDER|DESC|ASC|AS|OVER|RANK|DENSE_RANK|ROW_NUMBER|LAG|LEAD|COUNT|SUM|AVG|MIN|MAX|CREATE|TABLE|ALTER|DROP|TRUNCATE|DATABASE|SCHEMA|VIEW|INDEX|SEQUENCE|INSERT|INTO|VALUES|UPDATE|SET|DELETE|MERGE|RETURNING|BEGIN|COMMIT|ROLLBACK|SAVEPOINT|GRANT|REVOKE|UNION|EXCEPT|INTERSECT|CASE|WHEN|THEN|ELSE|END|COALESCE|NULLIF|AND|OR|NOT|IN|BETWEEN|LIKE|IS|NULL|EXISTS|PARTITION)\b|\b(\d+)\b/gm;

  return escaped.replace(tokenRegex, (match, cmt, str, kw, num) => {
    if (cmt) return `<span class="tok-cmt">${cmt}</span>`;
    if (str) return `<span class="tok-str">${str}</span>`;
    if (kw) return `<span class="tok-kw">${kw}</span>`;
    if (num) return `<span class="tok-num">${num}</span>`;
    return match;
  });
}

/* ==========================================================================
   Daily Logic Puzzle Initialization (index.html)
   ========================================================================== */

function initDailyPuzzle() {
  const codeEl = document.getElementById("daily-code");
  const optionsEl = document.getElementById("daily-options");
  const formEl = document.getElementById("daily-puzzle-form");
  const submitBtn = document.getElementById("daily-submit-btn");
  const badgeEl = document.getElementById("daily-status-badge");
  const feedbackEl = document.getElementById("daily-feedback");

  if (!codeEl || !optionsEl || !formEl) return;

  codeEl.innerHTML = highlightCode(DAILY_PUZZLE.code);

  const renderOptions = (disabled, selectedIdx = null) => {
    optionsEl.innerHTML = "";
    DAILY_PUZZLE.options.forEach((opt, idx) => {
      const label = document.createElement("label");
      label.className = "radio-card";

      if (disabled) {
        if (idx === DAILY_PUZZLE.correctIndex) {
          label.classList.add("radio-card--correct");
        } else if (idx === selectedIdx && selectedIdx !== DAILY_PUZZLE.correctIndex) {
          label.classList.add("radio-card--incorrect");
        }
      }

      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "daily-answer";
      radio.value = String(idx);
      radio.disabled = disabled;
      if (selectedIdx === idx) radio.checked = true;

      const text = document.createElement("span");
      text.textContent = opt;

      label.appendChild(radio);
      label.appendChild(text);
      optionsEl.appendChild(label);
    });
  };

  const showSolvedState = (selectedIdx, justSolved = false) => {
    renderOptions(true, selectedIdx);
    submitBtn.disabled = true;
    submitBtn.textContent = "Completed Today";
    badgeEl.textContent = "Completed Today (+50 XP)";
    badgeEl.className = "tag tag--emerald";

    feedbackEl.classList.remove("hidden", "feedback-box--error", "feedback-box--info");
    feedbackEl.classList.add("feedback-box--success");
    feedbackEl.innerHTML = `<strong>${justSolved ? "+50 XP Awarded! " : "Solved Today: "}</strong>${DAILY_PUZZLE.explanation}`;
  };

  if (isDailySolvedToday()) {
    const state = getState();
    showSolvedState(state.dailySelectedOption ?? DAILY_PUZZLE.correctIndex, false);
    return;
  }

  renderOptions(false);

  formEl.addEventListener("submit", (e) => {
    e.preventDefault();
    const checked = formEl.querySelector('input[name="daily-answer"]:checked');
    if (!checked) {
      feedbackEl.classList.remove("hidden", "feedback-box--success", "feedback-box--error");
      feedbackEl.classList.add("feedback-box--info");
      feedbackEl.textContent = "Select an output option before submitting.";
      return;
    }

    const selectedIdx = Number(checked.value);
    if (selectedIdx === DAILY_PUZZLE.correctIndex) {
      const state = getState();
      state.lastDailySolvedDate = getTodayKey();
      state.dailySelectedOption = selectedIdx;
      state.streak += 1;
      state.xp += 50;
      saveState(state);
      syncNavbarStats();
      syncDashboardMetrics();
      showSolvedState(selectedIdx, true);
    } else {
      feedbackEl.classList.remove("hidden", "feedback-box--success", "feedback-box--info");
      feedbackEl.classList.add("feedback-box--error");
      feedbackEl.textContent =
        "Not quite — trace how Python resolves variables inside a closure when the function is called. Try again!";
    }
  });
}

/* ==========================================================================
   Phase 1.5 Competition Goal Tracker Poll (index.html)
   ========================================================================== */

function initCompetitionPoll() {
  const icpcBtn = document.getElementById("vote-icpc-btn");
  const gsocBtn = document.getElementById("vote-gsoc-btn");
  const icpcBar = document.getElementById("poll-bar-icpc");
  const gsocBar = document.getElementById("poll-bar-gsoc");
  const icpcMeta = document.getElementById("poll-meta-icpc");
  const gsocMeta = document.getElementById("poll-meta-gsoc");
  const voteStatus = document.getElementById("poll-user-status");

  if (!icpcBtn || !gsocBtn) return;

  const renderPoll = () => {
    const state = getState();
    const { icpc, gsoc } = state.pollVotes;
    const total = icpc + gsoc || 1;
    const icpcPct = Math.round((icpc / total) * 100);
    const gsocPct = 100 - icpcPct;

    icpcBar.style.width = `${icpcPct}%`;
    gsocBar.style.width = `${gsocPct}%`;
    icpcMeta.textContent = `${icpcPct}% (${icpc} votes)`;
    gsocMeta.textContent = `${gsocPct}% (${gsoc} votes)`;

    if (state.userPollChoice === "icpc") {
      icpcBtn.textContent = "Voted ICPC ✓";
      gsocBtn.textContent = "Vote GSoC";
      voteStatus.textContent = "Your vote is saved for Track A: ICPC Competitive Coding.";
    } else if (state.userPollChoice === "gsoc") {
      icpcBtn.textContent = "Vote ICPC";
      gsocBtn.textContent = "Voted GSoC ✓";
      voteStatus.textContent = "Your vote is saved for Track B: GSoC Open Source.";
    } else {
      voteStatus.textContent = "Cast your vote to help prioritize the Phase 1.5 roadmap.";
    }
  };

  const handleVote = (track) => {
    const state = getState();
    if (state.userPollChoice === track) return;

    if (state.userPollChoice) {
      state.pollVotes[state.userPollChoice] = Math.max(
        0,
        state.pollVotes[state.userPollChoice] - 1
      );
    }
    state.pollVotes[track] += 1;
    state.userPollChoice = track;
    saveState(state);
    renderPoll();
  };

  icpcBtn.addEventListener("click", () => handleVote("icpc"));
  gsocBtn.addEventListener("click", () => handleVote("gsoc"));

  renderPoll();
}

/* ==========================================================================
   Bootstrap
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  syncNavbarStats();
  syncDashboardMetrics();
  initDailyPuzzle();
  initCompetitionPoll();
});
