const STORAGE_KEY = "toeic_personal_vocab_app_v1";
const TODAY_KEY = "toeic_personal_vocab_today_stats_v1";

let words = loadWords();
let currentQuizWord = null;
let currentQuizMode = null;

const els = {
  wordInput: document.getElementById("wordInput"),
  meaningInput: document.getElementById("meaningInput"),
  exampleInput: document.getElementById("exampleInput"),
  sourceInput: document.getElementById("sourceInput"),
  addWordBtn: document.getElementById("addWordBtn"),
  clearFormBtn: document.getElementById("clearFormBtn"),
  totalCount: document.getElementById("totalCount"),
  activeCount: document.getElementById("activeCount"),
  archivedCount: document.getElementById("archivedCount"),
  todayReviewCount: document.getElementById("todayReviewCount"),
  startQuizBtn: document.getElementById("startQuizBtn"),
  refreshQuizBtn: document.getElementById("refreshQuizBtn"),
  quizEmpty: document.getElementById("quizEmpty"),
  quizArea: document.getElementById("quizArea"),
  quizModeLabel: document.getElementById("quizModeLabel"),
  quizQuestion: document.getElementById("quizQuestion"),
  quizHint: document.getElementById("quizHint"),
  answerBox: document.getElementById("answerBox"),
  quizAnswer: document.getElementById("quizAnswer"),
  quizExampleWrap: document.getElementById("quizExampleWrap"),
  quizSourceWrap: document.getElementById("quizSourceWrap"),
  showAnswerBtn: document.getElementById("showAnswerBtn"),
  reviewButtons: document.getElementById("reviewButtons"),
  knowBtn: document.getElementById("knowBtn"),
  maybeBtn: document.getElementById("maybeBtn"),
  dontKnowBtn: document.getElementById("dontKnowBtn"),
  wordList: document.getElementById("wordList"),
  searchInput: document.getElementById("searchInput"),
  filterSelect: document.getElementById("filterSelect")
};

function loadWords() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return [];
  try {
    return JSON.parse(saved);
  } catch (e) {
    return [];
  }
}

function saveWords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
}

function getTodayString() {
  return new Date().toISOString().slice(0, 10);
}

function getTodayStats() {
  const saved = localStorage.getItem(TODAY_KEY);
  const today = getTodayString();

  if (!saved) {
    const initial = { date: today, reviewCount: 0 };
    localStorage.setItem(TODAY_KEY, JSON.stringify(initial));
    return initial;
  }

  try {
    const data = JSON.parse(saved);
    if (data.date !== today) {
      const reset = { date: today, reviewCount: 0 };
      localStorage.setItem(TODAY_KEY, JSON.stringify(reset));
      return reset;
    }
    return data;
  } catch (e) {
    const initial = { date: today, reviewCount: 0 };
    localStorage.setItem(TODAY_KEY, JSON.stringify(initial));
    return initial;
  }
}

function incrementTodayReviewCount() {
  const stats = getTodayStats();
  stats.reviewCount += 1;
  localStorage.setItem(TODAY_KEY, JSON.stringify(stats));
}

function createWordData(word, meaning, example, source) {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
    word: word.trim(),
    meaning: meaning.trim(),
    example: example.trim(),
    source: source.trim(),
    createdAt: new Date().toISOString(),
    reviewCount: 0,
    correctCount: 0,
    wrongCount: 0,
    streak: 0,
    level: 0,
    archived: false,
    lastReviewedAt: null,
    nextReviewAt: new Date().toISOString()
  };
}

function addWord() {
  const word = els.wordInput.value.trim();
  const meaning = els.meaningInput.value.trim();
  const example = els.exampleInput.value.trim();
  const source = els.sourceInput.value.trim();

  if (!word || !meaning) {
    alert("英単語と意味は必須です。");
    return;
  }

  const exists = words.find(
    item => item.word.toLowerCase() === word.toLowerCase() && !item.archived
  );

  if (exists) {
    alert("同じ単語がすでに登録されています。");
    return;
  }

  const newWord = createWordData(word, meaning, example, source);
  words.unshift(newWord);
  saveWords();
  clearForm();
  renderAll();
  switchTab("list");
}

function clearForm() {
  els.wordInput.value = "";
  els.meaningInput.value = "";
  els.exampleInput.value = "";
  els.sourceInput.value = "";
  els.wordInput.focus();
}

function renderStats() {
  const total = words.length;
  const active = words.filter(w => !w.archived).length;
  const archived = words.filter(w => w.archived).length;
  const todayStats = getTodayStats();

  els.totalCount.textContent = total;
  els.activeCount.textContent = active;
  els.archivedCount.textContent = archived;
  els.todayReviewCount.textContent = todayStats.reviewCount;
}

function getDueWords() {
  const now = new Date();
  const activeWords = words.filter(w => !w.archived);

  const due = activeWords.filter(w => {
    if (!w.nextReviewAt) return true;
    return new Date(w.nextReviewAt) <= now;
  });

  return due.length > 0 ? due : activeWords;
}

function pickQuizWord() {
  const candidates = getDueWords();
  if (candidates.length === 0) return null;

  const weighted = [];
  candidates.forEach(word => {
    const weight = Math.max(1, 6 - word.level + word.wrongCount - word.correctCount);
    for (let i = 0; i < weight; i++) {
      weighted.push(word);
    }
  });

  const picked = weighted[Math.floor(Math.random() * weighted.length)];
  return picked;
}

function startQuiz() {
  currentQuizWord = pickQuizWord();

  if (!currentQuizWord) {
    els.quizEmpty.classList.remove("hidden");
    els.quizArea.classList.add("hidden");
    return;
  }

  els.quizEmpty.classList.add("hidden");
  els.quizArea.classList.remove("hidden");
  els.answerBox.style.display = "none";
  els.reviewButtons.classList.add("hidden");

  currentQuizMode = Math.random() < 0.5 ? "enToJa" : "jaToEn";

  if (currentQuizMode === "enToJa") {
    els.quizModeLabel.textContent = "英語 → 日本語";
    els.quizQuestion.textContent = currentQuizWord.word;
    els.quizHint.textContent = "意味を思い出してください。";
    els.quizAnswer.textContent = currentQuizWord.meaning;
  } else {
    els.quizModeLabel.textContent = "日本語 → 英語";
    els.quizQuestion.textContent = currentQuizWord.meaning;
    els.quizHint.textContent = "英単語を思い出してください。";
    els.quizAnswer.textContent = currentQuizWord.word;
  }

  els.quizExampleWrap.innerHTML = currentQuizWord.example
    ? `<strong>例文:</strong> ${escapeHtml(currentQuizWord.example)}`
    : "";

  els.quizSourceWrap.innerHTML = currentQuizWord.source
    ? `出典・メモ: ${escapeHtml(currentQuizWord.source)}`
    : "";

  els.showAnswerBtn.disabled = false;
}

function showAnswer() {
  els.answerBox.style.display = "block";
  els.reviewButtons.classList.remove("hidden");
  els.showAnswerBtn.disabled = true;
}

function reviewCurrent(result) {
  if (!currentQuizWord) return;

  const target = words.find(w => w.id === currentQuizWord.id);
  if (!target) return;

  target.reviewCount += 1;
  target.lastReviewedAt = new Date().toISOString();

  if (result === "know") {
    target.correctCount += 1;
    target.streak += 1;
    target.level = Math.min(target.level + 1, 5);
  } else if (result === "maybe") {
    target.streak = 0;
  } else if (result === "dontKnow") {
    target.wrongCount += 1;
    target.streak = 0;
    target.level = Math.max(target.level - 1, 0);
  }

  target.nextReviewAt = calcNextReviewAt(target, result);

  if (target.level >= 5 && target.correctCount >= 3) {
    target.archived = true;
  }

  incrementTodayReviewCount();
  saveWords();
  renderAll();
  startQuiz();
}

function calcNextReviewAt(word, result) {
  const now = new Date();

  let minutesToAdd = 10;

  if (result === "dontKnow") {
    minutesToAdd = 5;
  } else if (result === "maybe") {
    minutesToAdd = 30;
  } else {
    if (word.level <= 1) minutesToAdd = 60;
    else if (word.level === 2) minutesToAdd = 24 * 60;
    else if (word.level === 3) minutesToAdd = 3 * 24 * 60;
    else if (word.level >= 4) minutesToAdd = 7 * 24 * 60;
  }

  now.setMinutes(now.getMinutes() + minutesToAdd);
  return now.toISOString();
}

function renderWordList() {
  const q = els.searchInput.value.trim().toLowerCase();
  const filter = els.filterSelect.value;

  let filtered = [...words];

  if (filter === "active") {
    filtered = filtered.filter(w => !w.archived);
  } else if (filter === "archived") {
    filtered = filtered.filter(w => w.archived);
  }

  if (q) {
    filtered = filtered.filter(w =>
      w.word.toLowerCase().includes(q) ||
      w.meaning.toLowerCase().includes(q) ||
      (w.example || "").toLowerCase().includes(q) ||
      (w.source || "").toLowerCase().includes(q)
    );
  }

  filtered.sort((a, b) => {
    if (a.archived !== b.archived) return a.archived - b.archived;
    if (a.level !== b.level) return a.level - b.level;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  if (filtered.length === 0) {
    els.wordList.innerHTML = `<div class="empty">該当する単語がありません。</div>`;
    return;
  }

  els.wordList.innerHTML = filtered.map(word => {
    return `
      <div class="word-item">
        <div class="word-head">
          <div>
            <div class="word-title">${escapeHtml(word.word)}</div>
            <div style="margin-top: 6px;">
              <span class="pill">意味: ${escapeHtml(word.meaning)}</span>
              <span class="pill">Lv ${word.level}</span>
              <span class="pill">${word.archived ? "卒業済み" : "復習対象"}</span>
            </div>
          </div>

          <div class="row">
            ${word.archived
              ? `<button class="gray" onclick="restoreWord('${word.id}')">復帰</button>`
              : `<button class="secondary" onclick="archiveWord('${word.id}')">卒業にする</button>`
            }
            <button class="danger" onclick="deleteWord('${word.id}')">削除</button>
          </div>
        </div>

        ${word.example ? `<p><strong>例文:</strong> ${escapeHtml(word.example)}</p>` : ""}
        ${word.source ? `<p class="small">出典・メモ: ${escapeHtml(word.source)}</p>` : ""}

        <p class="small">
          回答回数: ${word.reviewCount} /
          正解扱い: ${word.correctCount} /
          不正解扱い: ${word.wrongCount}
        </p>
      </div>
    `;
  }).join("");
}

function archiveWord(id) {
  const target = words.find(w => w.id === id);
  if (!target) return;
  target.archived = true;
  saveWords();
  renderAll();
}

function restoreWord(id) {
  const target = words.find(w => w.id === id);
  if (!target) return;
  target.archived = false;
  target.nextReviewAt = new Date().toISOString();
  saveWords();
  renderAll();
}

function deleteWord(id) {
  const ok = confirm("この単語を削除しますか？");
  if (!ok) return;
  words = words.filter(w => w.id !== id);
  saveWords();
  renderAll();
}

function switchTab(tabName) {
  document.querySelectorAll("section[id^='tab-']").forEach(sec => {
    sec.classList.add("hidden");
  });
  document.getElementById(`tab-${tabName}`).classList.remove("hidden");

  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.classList.remove("active");
    btn.classList.add("gray");
  });

  const activeBtn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
  activeBtn.classList.add("active");
  activeBtn.classList.remove("gray");

  if (tabName === "quiz") {
    startQuiz();
  }
}

function renderAll() {
  renderStats();
  renderWordList();
}

function escapeHtml(str) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

els.addWordBtn.addEventListener("click", addWord);
els.clearFormBtn.addEventListener("click", clearForm);
els.startQuizBtn.addEventListener("click", () => switchTab("quiz"));
els.refreshQuizBtn.addEventListener("click", startQuiz);
els.showAnswerBtn.addEventListener("click", showAnswer);
els.knowBtn.addEventListener("click", () => reviewCurrent("know"));
els.maybeBtn.addEventListener("click", () => reviewCurrent("maybe"));
els.dontKnowBtn.addEventListener("click", () => reviewCurrent("dontKnow"));
els.searchInput.addEventListener("input", renderWordList);
els.filterSelect.addEventListener("change", renderWordList);

document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    switchTab(btn.dataset.tab);
  });
});

[els.wordInput, els.meaningInput, els.exampleInput, els.sourceInput].forEach(el => {
  el.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey && el.tagName !== "TEXTAREA") {
      e.preventDefault();
      addWord();
    }
  });
});

window.archiveWord = archiveWord;
window.restoreWord = restoreWord;
window.deleteWord = deleteWord;

renderAll();
