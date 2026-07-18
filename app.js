"use strict";
const $  = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c]));
const LETTERS = ["A","B","C","D","E","F"];

let GALLERY = [], FC = [], QUIZ = [];

/* ---------- Tabs ---------- */
$$(".tab").forEach(t => t.onclick = () => {
  $$(".tab").forEach(x => x.classList.remove("active"));
  t.classList.add("active");
  $$(".panel").forEach(p => p.classList.remove("active"));
  $("#panel-" + t.dataset.tab).classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
});

/* ---------- Theme ---------- */
const root = document.documentElement;
const saved = localStorage.getItem("theme");
if (saved) root.dataset.theme = saved;
function isDark() {
  const cur = root.dataset.theme || (matchMedia("(prefers-color-scheme:dark)").matches ? "dark" : "light");
  return cur === "dark";
}
function paintThemeIcon() { $("#themeToggle").textContent = isDark() ? "☀️" : "🌙"; }
paintThemeIcon();
$("#themeToggle").onclick = () => {
  const next = isDark() ? "light" : "dark";
  root.dataset.theme = next; localStorage.setItem("theme", next); paintThemeIcon();
};

/* ---------- Helpers ---------- */
const uniqueTopics = arr => [...new Set(arr.map(x => x.topic))];
const filterByTopic = (arr, t) => t === "all" ? [...arr] : arr.filter(x => x.topic === t);
function shuffle(a) { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function renderChips(host, topics, active, onPick) {
  host.innerHTML = "";
  topics.forEach(t => {
    const c = document.createElement("button");
    c.className = "chip" + (t === active ? " active" : "");
    c.textContent = t === "all" ? "Tất cả" : t;
    c.onclick = () => { [...host.children].forEach(x => x.classList.remove("active")); c.classList.add("active"); onPick(t); };
    host.appendChild(c);
  });
}

/* ---------- Gallery ---------- */
function renderGallery() {
  const groups = {};
  GALLERY.forEach(g => (groups[g.module] = groups[g.module] || []).push(g));
  const host = $("#galleryGroups"); host.innerHTML = "";
  Object.entries(groups).forEach(([mod, items]) => {
    const block = document.createElement("div");
    const title = document.createElement("div");
    title.className = "grp-title"; title.textContent = mod;
    block.appendChild(title);
    const grid = document.createElement("div"); grid.className = "gallery";
    items.forEach(g => {
      const c = document.createElement("div"); c.className = "card";
      c.innerHTML =
        `<div class="card-thumb" data-sodo="${esc(g.sodo)}" data-info="${esc(g.info)}">
           <img src="${esc(g.info)}" alt="${esc(g.title)}" loading="lazy">
         </div>
         <div class="card-body">
           <p class="card-title">${esc(g.title)}</p>
           <div class="card-actions">
             <button class="pill" data-open="${esc(g.sodo)}">📊 Sơ đồ</button>
             <button class="pill primary" data-open="${esc(g.info)}">🖼️ Infographic</button>
           </div>
         </div>`;
      grid.appendChild(c);
    });
    block.appendChild(grid); host.appendChild(block);
  });
  $$("#galleryGroups .card-thumb").forEach(t =>
    t.onclick = () => openLightbox(t.dataset.info, { sodo: t.dataset.sodo, info: t.dataset.info }));
  $$("#galleryGroups .pill").forEach(b => b.onclick = () => {
    const th = $(".card-thumb", b.closest(".card"));
    openLightbox(b.dataset.open, { sodo: th.dataset.sodo, info: th.dataset.info });
  });
}

/* ---------- Lightbox ---------- */
let lbPair = null;
function lbLabel(src) {
  if (!lbPair) return;
  const showingInfo = src.endsWith(lbPair.info);
  $("#lbToggle").textContent = showingInfo ? "📊 Xem sơ đồ luồng" : "🖼️ Xem infographic";
}
function openLightbox(src, pair) {
  $("#lbImg").src = src;
  lbPair = (pair && pair.sodo && pair.info && pair.sodo !== pair.info) ? pair : null;
  const tog = $("#lbToggle");
  if (lbPair) { tog.classList.remove("hidden"); lbLabel(src); } else tog.classList.add("hidden");
  $("#lightbox").classList.remove("hidden");
  document.body.style.overflow = "hidden";
}
function closeLightbox() { $("#lightbox").classList.add("hidden"); $("#lbImg").src = ""; document.body.style.overflow = ""; }
$("#lbToggle").onclick = () => {
  const cur = $("#lbImg").src;
  const next = cur.endsWith(lbPair.info) ? lbPair.sodo : lbPair.info;
  $("#lbImg").src = next; lbLabel(next);
};
$(".lb-close").onclick = closeLightbox;
$("#lightbox").onclick = e => { if (e.target.id === "lightbox") closeLightbox(); };
document.addEventListener("keydown", e => { if (e.key === "Escape") closeLightbox(); });
$$(".zoomable").forEach(img => img.onclick = () => openLightbox(img.dataset.full, null));

/* ---------- Flashcards ---------- */
let fcFilter = "all";
function initFlashcards() {
  renderChips($("#fcChips"), ["all", ...uniqueTopics(FC)], fcFilter, t => { fcFilter = t; renderFCGrid(filterByTopic(FC, fcFilter)); });
  renderFCGrid(FC);
  $("#fcShuffle").onclick = () => renderFCGrid(shuffle(filterByTopic(FC, fcFilter)));
  $("#fcStudy").onclick = () => openStudy(filterByTopic(FC, fcFilter));
}
function fcFace(c) {
  return `<div class="flip-inner">
    <div class="flip-face flip-front"><div class="fc-tag">${esc(c.topic)} · Câu hỏi</div><div class="fc-q">${esc(c.front)}</div><div class="fc-hint">Bấm để xem đáp án ↻</div></div>
    <div class="flip-face flip-back"><div class="fc-tag">Đáp án</div><div class="fc-a">${esc(c.back)}</div><div class="fc-hint">Bấm để lật lại ↻</div></div>
  </div>`;
}
function renderFCGrid(list) {
  $("#fcCount").textContent = list.length + " thẻ";
  const grid = $("#fcGrid"); grid.innerHTML = "";
  list.forEach(c => {
    const el = document.createElement("div"); el.className = "flip"; el.innerHTML = fcFace(c);
    el.onclick = () => el.classList.toggle("flipped");
    grid.appendChild(el);
  });
}
function openStudy(list) {
  if (!list.length) return;
  let i = 0;
  const ov = document.createElement("div"); ov.className = "lightbox"; ov.style.flexDirection = "column";
  function draw() {
    const c = list[i];
    ov.innerHTML =
      `<button class="lb-close" aria-label="Đóng">✕</button>
       <div class="study-wrap">
         <div class="flip" id="sflip">${fcFace(c)}</div>
         <div class="study-nav">
           <button class="btn-ghost" id="sprev">← Trước</button>
           <span class="quiz-meta">${i + 1} / ${list.length}</span>
           <button class="btn-primary" id="snext">Sau →</button>
         </div>
       </div>`;
    $("#sflip", ov).onclick = () => $("#sflip", ov).classList.toggle("flipped");
    $("#sprev", ov).onclick = e => { e.stopPropagation(); if (i > 0) { i--; draw(); } };
    $("#snext", ov).onclick = e => { e.stopPropagation(); if (i < list.length - 1) { i++; draw(); } };
    $(".lb-close", ov).onclick = () => { ov.remove(); document.body.style.overflow = ""; };
  }
  draw(); document.body.appendChild(ov); document.body.style.overflow = "hidden";
}

/* ---------- Quiz ---------- */
let quizFilter = "all", quizSet = [], qi = 0, qScore = 0, qAnswered = false;
function initQuiz() {
  renderChips($("#quizChips"), ["all", ...uniqueTopics(QUIZ)], quizFilter, t => { quizFilter = t; });
  $("#quizStart").onclick = startQuiz;
  $("#quizNext").onclick = nextQ;
  $("#quizQuit").onclick = () => { $("#quizRunner").classList.add("hidden"); $("#quizIntro").classList.remove("hidden"); };
}
function startQuiz() {
  quizSet = shuffle(filterByTopic(QUIZ, quizFilter));
  if (!quizSet.length) return;
  qi = 0; qScore = 0;
  $("#quizIntro").classList.add("hidden");
  $("#quizResult").classList.add("hidden");
  $("#quizRunner").classList.remove("hidden");
  $("#quizScore").textContent = "0";
  drawQ();
}
function drawQ() {
  qAnswered = false;
  const q = quizSet[qi];
  $("#quizProgressBar").style.width = (qi / quizSet.length * 100) + "%";
  $("#quizPos").textContent = `Câu ${qi + 1}/${quizSet.length}`;
  $("#quizNext").disabled = true;
  $("#quizNext").textContent = qi === quizSet.length - 1 ? "Xem kết quả 🏁" : "Câu tiếp →";
  const card = $("#quizCard");
  card.innerHTML =
    `<div class="q-topic">${esc(q.topic)}</div><div class="q-text">${esc(q.question)}</div>` +
    q.options.map((o, idx) => `<button class="opt" data-i="${idx}"><span class="lt">${LETTERS[idx]}</span><span>${esc(o)}</span></button>`).join("") +
    `<div id="qExpl"></div>`;
  $$(".opt", card).forEach(b => b.onclick = () => answer(parseInt(b.dataset.i, 10)));
}
function answer(idx) {
  if (qAnswered) return; qAnswered = true;
  const q = quizSet[qi];
  $$(".opt", $("#quizCard")).forEach((b, i) => {
    b.classList.add("done");
    if (i === q.correct) b.classList.add("correct");
    else if (i === idx) b.classList.add("wrong");
    else b.classList.add("dim");
  });
  const correct = idx === q.correct;
  if (correct) { qScore++; $("#quizScore").textContent = qScore; }
  let html = "";
  if (!correct) html += `<div class="expl bad"><b>✗ Chưa đúng</b>${esc(q.explanations[idx])}</div>`;
  html += `<div class="expl good"><b>✓ Đáp án đúng: ${LETTERS[q.correct]}</b>${esc(q.explanations[q.correct])}</div>`;
  $("#qExpl").innerHTML = html;
  $("#quizNext").disabled = false;
}
function nextQ() {
  if (qi < quizSet.length - 1) { qi++; drawQ(); window.scrollTo({ top: 0, behavior: "smooth" }); }
  else showResult();
}
function showResult() {
  $("#quizRunner").classList.add("hidden");
  const pct = Math.round(qScore / quizSet.length * 100);
  const msg = pct >= 80 ? "Xuất sắc! 🎉" : pct >= 50 ? "Khá ổn, ôn thêm nhé 💪" : "Cần ôn lại kỹ hơn 📖";
  const box = $("#quizResult"); box.classList.remove("hidden");
  box.innerHTML =
    `<div class="result-box">
       <div class="result-score">${qScore}/${quizSet.length}</div>
       <p style="font-size:1.1rem;font-weight:700;color:var(--ink);margin:.4em 0">${pct}% · ${msg}</p>
       <p>Bạn đã hoàn thành phần luyện tập.</p>
       <div style="display:flex;gap:10px;justify-content:center;margin-top:16px;flex-wrap:wrap">
         <button class="btn-primary" id="qAgain">🔄 Làm lại</button>
         <button class="btn-ghost" id="qBack">Chọn chủ đề khác</button>
       </div>
     </div>`;
  $("#qAgain").onclick = startQuiz;
  $("#qBack").onclick = () => { box.classList.add("hidden"); $("#quizIntro").classList.remove("hidden"); };
}

/* ---------- Boot ---------- */
(async function () {
  try {
    [GALLERY, FC, QUIZ] = await Promise.all([
      fetch("data/gallery.json").then(r => r.json()),
      fetch("data/flashcards.json").then(r => r.json()),
      fetch("data/quiz.json").then(r => r.json())
    ]);
    renderGallery(); initFlashcards(); initQuiz();
  } catch (e) {
    document.querySelector("main").innerHTML =
      '<p style="padding:30px;text-align:center;color:var(--muted)">Không tải được dữ liệu. Hãy mở trang qua máy chủ web (GitHub Pages), không mở trực tiếp file.</p>';
    console.error(e);
  }
})();
