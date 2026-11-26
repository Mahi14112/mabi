/**
 * EngiLab — Topics & Notes Reader (languages.html)
 */

import { highlightCode } from "./app.js";

const LEVEL_BADGE_CLASS = {
  Beginner: "tag tag--emerald",
  Intermediate: "tag tag--amber",
  Advanced: "tag tag--indigo"
};

const LANG_FILENAMES = {
  Python: "example.py",
  "C++": "example.cpp",
  C: "example.c",
  Java: "Example.java",
  Go: "main.go",
  Rust: "main.rs",
  SQL: "query.sql"
};

let topicsByLanguage = {};
let currentLang = localStorage.getItem("selectedLanguage") || "Python";
let activeTopicIndex = 0;
let searchQuery = "";

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatNoteHtml(text) {
  return escapeHtml(text)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

async function loadTopics() {
  const res = await fetch("data/topics.json");
  if (!res.ok) {
    throw new Error(`Failed to load topics.json (${res.status})`);
  }
  topicsByLanguage = await res.json();
}

function getLanguageTopics() {
  return topicsByLanguage[currentLang] || [];
}

function collapseTopics() {
  const panel = document.getElementById("topics-index-panel");
  const expandBtn = document.getElementById("expand-topics-btn");
  const searchInput = document.getElementById("topic-search-input");

  if (!panel) return;
  panel.classList.add("is-collapsed");
  panel.classList.remove("is-expanded");
  searchInput?.blur();
  if (expandBtn) expandBtn.classList.remove("hidden");
}

function expandTopics() {
  const panel = document.getElementById("topics-index-panel");
  const expandBtn = document.getElementById("expand-topics-btn");
  const searchInput = document.getElementById("topic-search-input");

  if (!panel) return;
  panel.classList.remove("is-collapsed");
  panel.classList.add("is-expanded");
  if (expandBtn) expandBtn.classList.add("hidden");
  setTimeout(() => searchInput?.focus(), 150);
}

function renderTopicList() {
  const listContainer = document.getElementById("topics-grouped-list");
  if (!listContainer) return;

  const topics = getLanguageTopics();
  const query = searchQuery.trim().toLowerCase();

  listContainer.innerHTML = "";

  // Preserve section order as defined in data/topics.json
  const sections = [];
  topics.forEach((topic) => {
    const sec = topic.section || topic.level || "Topics";
    if (!sections.includes(sec)) sections.push(sec);
  });

  let totalVisible = 0;

  sections.forEach((sectionName) => {
    const groupTopics = topics
      .map((topic, idx) => ({ topic, idx }))
      .filter(({ topic }) => {
        const sec = topic.section || topic.level || "Topics";
        if (sec !== sectionName) return false;
        if (!query) return true;
        const notesMatch = Array.isArray(topic.notes) && topic.notes.some((n) => n.toLowerCase().includes(query));
        const defMatch = typeof topic.definition === "string" && topic.definition.toLowerCase().includes(query);
        const explMatch = topic.explanation && (Array.isArray(topic.explanation) ? topic.explanation.join(" ") : topic.explanation).toLowerCase().includes(query);
        return (
          topic.title.toLowerCase().includes(query) ||
          sec.toLowerCase().includes(query) ||
          notesMatch ||
          defMatch ||
          explMatch
        );
      });

    if (groupTopics.length === 0) return;
    totalVisible += groupTopics.length;

    const groupEl = document.createElement("div");
    groupEl.className = "topic-group";

    const labelEl = document.createElement("div");
    labelEl.className = "topic-group-label";
    labelEl.textContent = sectionName;
    groupEl.appendChild(labelEl);

    groupTopics.forEach(({ topic, idx }) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "topic-nav-btn";
      if (idx === activeTopicIndex) {
        btn.classList.add("topic-nav-btn--active");
      }
      btn.textContent = `${idx + 1}. ${topic.title}`;
      btn.addEventListener("click", () => {
        activeTopicIndex = idx;
        renderTopicList();
        renderTopicViewer();
        collapseTopics();
      });
      groupEl.appendChild(btn);
    });

    listContainer.appendChild(groupEl);
  });

  if (totalVisible === 0) {
    const empty = document.createElement("p");
    empty.style.cssText =
      "font-size: 0.84rem; color: var(--text-muted); padding: 0.5rem 0.25rem;";
    empty.textContent = "No matching topics found.";
    listContainer.appendChild(empty);
  }
}

function renderTopicViewer() {
  const topics = getLanguageTopics();
  const topic = topics[activeTopicIndex];
  if (!topic) return;

  const titleEl = document.getElementById("topic-viewer-title");
  const langEl = document.getElementById("topic-viewer-lang");
  const secEl = document.getElementById("topic-viewer-section");
  const badgeEl = document.getElementById("topic-viewer-badge");
  const bodyEl = document.getElementById("topic-viewer-body");
  const counterEl = document.getElementById("topic-step-counter");
  const prevBtn = document.getElementById("prev-topic-btn");
  const nextBtn = document.getElementById("next-topic-btn");

  // 1. Header Metadata
  if (titleEl) titleEl.textContent = topic.title;
  if (langEl) langEl.textContent = currentLang;
  if (secEl) {
    const secName = topic.section || topic.phase || topic.category || "Module";
    secEl.textContent = secName.replace(/^Section\s*\d+:\s*|^Phase\s*\d+:\s*|^\d+\.\s*/i, "");
    secEl.title = secName;
  }
  if (badgeEl) {
    badgeEl.textContent = topic.level || "Core";
    badgeEl.className = LEVEL_BADGE_CLASS[topic.level] || "tag";
  }

  if (!bodyEl) return;
  bodyEl.innerHTML = "";

  // 2. Definition Card: crisp 1–2 sentence formal definition
  if (topic.definition) {
    const defCard = document.createElement("div");
    defCard.className = "topic-definition-card";
    defCard.innerHTML = `
      <div class="topic-def-header">
        <span class="topic-def-icon">💡</span>
        <span class="topic-def-label">Formal Definition & Core Concept</span>
      </div>
      <p class="topic-def-text">${formatNoteHtml(topic.definition)}</p>
    `;
    bodyEl.appendChild(defCard);
  }

  // 3. In-Depth Explanation: architecture, mechanics, time/space complexity, pitfalls
  if (topic.explanation) {
    const explSection = document.createElement("div");
    explSection.className = "topic-section";
    explSection.innerHTML = `
      <h3 class="topic-section-title">
        <span class="section-icon">📘</span> In-Depth Architecture & Mechanics
      </h3>
    `;
    const explItems = Array.isArray(topic.explanation) ? topic.explanation : [topic.explanation];
    const hasBullets = explItems.some(
      (item) => item.trim().startsWith("- ") || item.trim().startsWith("* ") || item.trim().startsWith("• ")
    );

    if (hasBullets) {
      const ul = document.createElement("ul");
      ul.className = "topic-notes-list";
      explItems.forEach((item) => {
        const clean = item.replace(/^[-*•]\s*/, "");
        const li = document.createElement("li");
        li.innerHTML = formatNoteHtml(clean);
        ul.appendChild(li);
      });
      explSection.appendChild(ul);
    } else {
      explItems.forEach((item) => {
        const p = document.createElement("p");
        p.className = "topic-explanation-text";
        p.innerHTML = formatNoteHtml(item);
        explSection.appendChild(p);
      });
    }
    bodyEl.appendChild(explSection);
  } else if (Array.isArray(topic.notes) && topic.notes.length > 0) {
    // Backward compatibility: render legacy notes list
    const notesSection = document.createElement("div");
    notesSection.className = "topic-section";
    notesSection.innerHTML = `
      <h3 class="topic-section-title">
        <span class="section-icon">📘</span> Core Concepts & Architecture Notes
      </h3>
    `;
    const ul = document.createElement("ul");
    ul.className = "topic-notes-list";
    ul.id = "topic-viewer-notes";
    topic.notes.forEach((note) => {
      const li = document.createElement("li");
      li.innerHTML = formatNoteHtml(note);
      ul.appendChild(li);
    });
    notesSection.appendChild(ul);
    bodyEl.appendChild(notesSection);
  }

  // 4. Syntax Reference Block: dedicated monospace template box
  if (topic.syntax) {
    const syntaxSection = document.createElement("div");
    syntaxSection.className = "topic-section";
    const filename = LANG_FILENAMES[currentLang] || "syntax";
    syntaxSection.innerHTML = `
      <h3 class="topic-section-title">
        <span class="section-icon">⚙️</span> Syntax & Signature Reference
      </h3>
      <div class="topic-syntax-block">
        <div class="topic-syntax-header">
          <span>General Grammar / Signature</span>
          <span>${escapeHtml(filename)}</span>
        </div>
        <pre class="topic-syntax-code"><code>${escapeHtml(topic.syntax)}</code></pre>
      </div>
    `;
    bodyEl.appendChild(syntaxSection);
  }

  // 5. Examples Section (2 to 3 Runnable Examples with backward compatibility)
  let examplesList = [];
  if (Array.isArray(topic.examples) && topic.examples.length > 0) {
    examplesList = topic.examples;
  } else if (topic.code) {
    examplesList = [
      {
        title: "Runnable Code Walkthrough",
        code: topic.code,
        output: topic.output || "",
      },
    ];
  }

  if (examplesList.length > 0) {
    const examplesSection = document.createElement("div");
    examplesSection.className = "topic-section";
    examplesSection.innerHTML = `
      <h3 class="topic-section-title">
        <span class="section-icon">💻</span> Code Walkthroughs & Runnable Examples
      </h3>
    `;
    const container = document.createElement("div");
    container.className = "topic-examples-container";
    const filename = LANG_FILENAMES[currentLang] || "example";

    examplesList.forEach((ex, idx) => {
      const card = document.createElement("div");
      card.className = "topic-example-card";

      const exTitle = ex.title || `Example ${idx + 1}`;
      const exCode = ex.code || "";
      const exOutput = ex.output || "";

      const exHeader = document.createElement("div");
      exHeader.className = "topic-example-header";
      exHeader.innerHTML = `
        <h4 class="topic-example-title">
          <span style="opacity: 0.7;">#${idx + 1}</span> ${escapeHtml(exTitle)}
        </h4>
      `;
      card.appendChild(exHeader);

      const wrapper = document.createElement("div");
      wrapper.className = "code-wrapper";
      wrapper.style.margin = "0";

      const codeHeader = document.createElement("div");
      codeHeader.className = "code-header";
      codeHeader.innerHTML = `
        <div class="code-dots"><span></span><span></span><span></span></div>
        <span class="topic-code-filename">${escapeHtml(filename)}</span>
        <button type="button" class="copy-code-btn" data-code="${escapeHtml(exCode)}">Copy Code</button>
      `;
      wrapper.appendChild(codeHeader);

      const pre = document.createElement("pre");
      pre.className = "code-block";
      const codeTag = document.createElement("code");
      if (idx === 0) codeTag.id = "topic-viewer-code";
      codeTag.innerHTML = highlightCode(exCode);
      pre.appendChild(codeTag);
      wrapper.appendChild(pre);
      card.appendChild(wrapper);

      if (exOutput) {
        const outBox = document.createElement("div");
        outBox.className = "output-box";
        outBox.innerHTML = `<div class="output-box-label">Expected Output</div>`;
        const outPre = document.createElement("pre");
        if (idx === 0) outPre.id = "topic-viewer-output";
        outPre.textContent = exOutput;
        outBox.appendChild(outPre);
        card.appendChild(outBox);
      }

      container.appendChild(card);
    });

    examplesSection.appendChild(container);
    bodyEl.appendChild(examplesSection);
  }

  // Pager & Counter
  if (counterEl) {
    counterEl.textContent = `${activeTopicIndex + 1} / ${topics.length}`;
  }
  if (prevBtn) prevBtn.disabled = activeTopicIndex === 0;
  if (nextBtn) nextBtn.disabled = activeTopicIndex === topics.length - 1;
}

export function renderWorkspaceForLanguage(lang) {
  currentLang = lang || "Python";
  const readerEl = document.getElementById("topics-view") || document.getElementById("topics-reader");
  const fallbackEl = document.getElementById("topics-fallback");
  const fallbackTitle = document.getElementById("topics-fallback-title");
  const fallbackText = document.getElementById("topics-fallback-text");

  const topics = getLanguageTopics();

  if (topics.length === 0) {
    if (readerEl) {
      readerEl.classList.add("hidden");
      readerEl.style.display = "none";
    }
    if (fallbackEl) {
      fallbackEl.classList.remove("hidden");
      fallbackEl.style.display = "flex";
    }
    if (fallbackTitle) fallbackTitle.textContent = `${currentLang} Topics & Notes`;
    if (fallbackText) {
      fallbackText.textContent = `Topics for ${currentLang} coming soon—switch to Python to explore all 32 modules.`;
    }
    return;
  }

  const isMcqActive =
    document.getElementById("tool-mcq-btn")?.classList.contains("sidebar-item--active") ||
    document.getElementById("tool-mcq-btn")?.classList.contains("active");

  if (!isMcqActive) {
    if (fallbackEl) {
      fallbackEl.classList.add("hidden");
      fallbackEl.style.display = "none";
    }
    if (readerEl) {
      readerEl.classList.remove("hidden");
      readerEl.style.display = "flex";
    }
  }

  activeTopicIndex = 0;
  searchQuery = "";
  const searchInput = document.getElementById("topic-search-input");
  if (searchInput) searchInput.value = "";

  renderTopicList();
  renderTopicViewer();
  collapseTopics();
}

window.renderWorkspaceForLanguage = renderWorkspaceForLanguage;

document.addEventListener("DOMContentLoaded", async () => {
  const readerEl = document.getElementById("topics-view") || document.getElementById("topics-reader");
  if (!readerEl) return;

  try {
    await loadTopics();
  } catch (err) {
    console.error(err);
    return;
  }

  const panel = document.getElementById("topics-index-panel");
  const railBtn = document.getElementById("topics-rail-btn");
  const collapseBtn = document.getElementById("collapse-topics-btn");
  const expandBtn = document.getElementById("expand-topics-btn");
  const searchInput = document.getElementById("topic-search-input");
  const prevBtn = document.getElementById("prev-topic-btn");
  const nextBtn = document.getElementById("next-topic-btn");
  const copyBtn = document.getElementById("copy-topic-code-btn");
  const switchPyBtn = document.getElementById("switch-to-python-btn");

  // Re-enable hover expanding after mouse leaves
  panel?.addEventListener("mouseenter", () => {
    panel.classList.remove("is-collapsed");
  });

  panel?.addEventListener("mouseleave", () => {
    if (!panel.classList.contains("is-expanded")) {
      panel.classList.add("is-collapsed");
    }
  });

  railBtn?.addEventListener("click", () => {
    expandTopics();
  });

  expandBtn?.addEventListener("click", () => {
    expandTopics();
  });

  collapseBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    collapseTopics();
  });

  searchInput?.addEventListener("input", (e) => {
    searchQuery = e.target.value;
    renderTopicList();
  });

  prevBtn?.addEventListener("click", () => {
    if (activeTopicIndex > 0) {
      activeTopicIndex -= 1;
      renderTopicList();
      renderTopicViewer();
    }
  });

  nextBtn?.addEventListener("click", () => {
    const topics = getLanguageTopics();
    if (activeTopicIndex < topics.length - 1) {
      activeTopicIndex += 1;
      renderTopicList();
      renderTopicViewer();
    }
  });

  // Delegated Copy Code handling for all dynamic example cards
  readerEl?.addEventListener("click", async (e) => {
    const btn = e.target.closest(".copy-code-btn");
    if (!btn) return;
    const textToCopy = btn.dataset.code || (getLanguageTopics()[activeTopicIndex]?.code) || "";
    if (!textToCopy) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      const originalText = btn.textContent;
      btn.textContent = "Copied ✓";
      btn.style.color = "var(--accent-emerald)";
      btn.style.borderColor = "var(--accent-emerald)";
      setTimeout(() => {
        btn.textContent = originalText;
        btn.style.color = "";
        btn.style.borderColor = "";
      }, 1500);
    } catch {
      btn.textContent = "Copy failed";
    }
  });

  switchPyBtn?.addEventListener("click", () => {
    const pyCard = document.querySelector('#language-selector .lang-card[data-lang="Python"]');
    pyCard?.click();
  });

  renderWorkspaceForLanguage(localStorage.getItem("selectedLanguage") || "Python");
});

window.addEventListener("engilab:language-changed", (e) => {
  renderWorkspaceForLanguage(e.detail.language);
});
