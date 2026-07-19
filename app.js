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

/* ---------- Lightbox with zoom / pan ---------- */
let lbPair = null;
const lbImg = $("#lbImg"), lbStage = $("#lbStage");
const z = { s: 1, min: 1, tx: 0, ty: 0 };

function applyZ() { lbImg.style.transform = `translate(${z.tx}px,${z.ty}px) scale(${z.s})`; }
function markZoom() { lbStage.classList.toggle("zoomed", z.s > z.min * 1.02); }
function clampPan() {
  const cw = lbStage.clientWidth, ch = lbStage.clientHeight;
  const iw = lbImg.naturalWidth * z.s, ih = lbImg.naturalHeight * z.s;
  z.tx = iw <= cw ? (cw - iw) / 2 : Math.min(0, Math.max(cw - iw, z.tx));
  z.ty = ih <= ch ? (ch - ih) / 2 : Math.min(0, Math.max(ch - ih, z.ty));
}
function fitImage() {
  const cw = lbStage.clientWidth, ch = lbStage.clientHeight;
  const iw = lbImg.naturalWidth, ih = lbImg.naturalHeight;
  if (!iw || !ih) return;
  z.min = Math.min(cw / iw, ch / ih);
  z.s = z.min; z.tx = (cw - iw * z.s) / 2; z.ty = (ch - ih * z.s) / 2;
  applyZ(); markZoom();
}
function zoomAt(mx, my, factor) {
  const px = (mx - z.tx) / z.s, py = (my - z.ty) / z.s;
  z.s = Math.max(z.min, Math.min(z.min * 12, z.s * factor));
  z.tx = mx - px * z.s; z.ty = my - py * z.s;
  clampPan(); applyZ(); markZoom();
}
lbImg.onload = fitImage;
function setLbSrc(src) { lbImg.src = src; if (lbImg.complete && lbImg.naturalWidth) fitImage(); }

function lbLabel(src) {
  if (!lbPair) return;
  $("#lbToggle").textContent = src.endsWith(lbPair.info) ? "📊 Xem sơ đồ luồng" : "🖼️ Xem infographic";
}
function openLightbox(src, pair) {
  lbPair = (pair && pair.sodo && pair.info && pair.sodo !== pair.info) ? pair : null;
  $("#lbToggle").classList.toggle("hidden", !lbPair);
  if (lbPair) lbLabel(src);
  $("#lightbox").classList.remove("hidden");
  document.body.style.overflow = "hidden";
  setLbSrc(src);
}
function closeLightbox() { $("#lightbox").classList.add("hidden"); lbImg.src = ""; document.body.style.overflow = ""; }

$("#lbToggle").onclick = e => {
  e.stopPropagation();
  const next = lbImg.src.endsWith(lbPair.info) ? lbPair.sodo : lbPair.info;
  setLbSrc(next); lbLabel(next);
};
$(".lb-close").onclick = closeLightbox;
$("#lbZoomIn").onclick = () => zoomAt(lbStage.clientWidth / 2, lbStage.clientHeight / 2, 1.4);
$("#lbZoomOut").onclick = () => zoomAt(lbStage.clientWidth / 2, lbStage.clientHeight / 2, 1 / 1.4);
$("#lbZoomReset").onclick = fitImage;
document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("#lightbox").classList.contains("hidden")) closeLightbox(); });

lbStage.addEventListener("wheel", e => {
  e.preventDefault();
  const r = lbStage.getBoundingClientRect();
  zoomAt(e.clientX - r.left, e.clientY - r.top, e.deltaY < 0 ? 1.18 : 1 / 1.18);
}, { passive: false });
lbStage.addEventListener("dblclick", e => {
  const r = lbStage.getBoundingClientRect();
  if (z.s > z.min * 1.05) fitImage(); else zoomAt(e.clientX - r.left, e.clientY - r.top, 2.6);
});

const pts = new Map(); let last = null, pinchD = 0, moved = 0, downTarget = null;
lbStage.addEventListener("pointerdown", e => {
  downTarget = e.target;
  lbStage.setPointerCapture(e.pointerId);
  pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  last = { x: e.clientX, y: e.clientY }; moved = 0;
  if (pts.size === 2) { const [a, b] = [...pts.values()]; pinchD = Math.hypot(a.x - b.x, a.y - b.y); }
});
lbStage.addEventListener("pointermove", e => {
  if (!pts.has(e.pointerId)) return;
  pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pts.size === 2) {
    const [a, b] = [...pts.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y);
    const r = lbStage.getBoundingClientRect();
    if (pinchD) zoomAt((a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top, d / pinchD);
    pinchD = d; last = null; moved = 99;
  } else if (last) {
    const dx = e.clientX - last.x, dy = e.clientY - last.y;
    moved += Math.abs(dx) + Math.abs(dy);
    z.tx += dx; z.ty += dy; last = { x: e.clientX, y: e.clientY }; clampPan(); applyZ();
  }
});
function endPtr(e) {
  pts.delete(e.pointerId);
  if (pts.size < 2) pinchD = 0;
  last = pts.size === 1 ? { ...[...pts.values()][0] } : null;
  // tap on dark backdrop (no drag, not zoomed) closes
  if (pts.size === 0 && moved < 6 && z.s <= z.min * 1.02 && downTarget === lbStage) closeLightbox();
}
lbStage.addEventListener("pointerup", endPtr);
lbStage.addEventListener("pointercancel", e => { pts.delete(e.pointerId); if (pts.size < 2) pinchD = 0; });
window.addEventListener("resize", () => { if (!$("#lightbox").classList.contains("hidden")) fitImage(); });

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
