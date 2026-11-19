// Leonida Platinum — GTA VI trophy guide & tracker.
// Loads only app/data/trophies.json from its own server, saves progress in
// localStorage, and never makes a network request to any other origin.
const STORE_KEY = 'leonida-platinum-progress-v1';
const SPOILER_KEY = 'leonida-platinum-spoilers-v1';

const listEl = document.getElementById('trophyList');
const detailEl = document.getElementById('detailPanel');
const searchEl = document.getElementById('search');
const gradeEl = document.getElementById('gradeFilter');
const earnedEl = document.getElementById('earnedFilter');
const spoilerEl = document.getElementById('spoilerToggle');
const kindRowEl = document.getElementById('kindRow');
const resultEl = document.getElementById('resultLine');
const emptyEl = document.getElementById('emptyState');

const doc = await (await fetch('data/trophies.json')).json();
const trophies = doc.trophies;
const roadmap = doc.roadmap || [];

let earned = new Set(JSON.parse(localStorage.getItem(STORE_KEY) ?? '[]'));
let spoilers = localStorage.getItem(SPOILER_KEY) === '1';
let kind = 'all';
let selectedId = null;

const KINDS = [
  ['all', 'All'],
  ['story', 'Story'],
  ['missable', 'Missable'],
  ['collectibles', 'Collectibles'],
  ['activities', 'Activities'],
  ['side', 'Side quests'],
  ['crime', 'Crime'],
  ['exploration', 'Exploration'],
  ['online', 'Online'],
];

function kindCount(k) {
  if (k === 'all') return trophies.length;
  if (k === 'missable') return trophies.filter((t) => t.missable).length;
  if (k === 'online') return 0;
  return trophies.filter((t) => t.kind === k).length;
}

function isSpoilerHidden(t) {
  return spoilers && t.kind === 'story' && !earned.has(t.name);
}

function saveProgress() {
  localStorage.setItem(STORE_KEY, JSON.stringify([...earned]));
}

function saveSpoilers() {
  localStorage.setItem(SPOILER_KEY, spoilers ? '1' : '0');
}

function gradeLabel(g) {
  return g.charAt(0).toUpperCase() + g.slice(1);
}

function renderKinds() {
  kindRowEl.replaceChildren();
  for (const [key, label] of KINDS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'kind-btn' + (kind === key ? ' active' : '');
    b.textContent = `${label} (${kindCount(key)})`;
    b.addEventListener('click', () => { kind = key; renderKinds(); renderList(); });
    kindRowEl.append(b);
  }
}

function visibleTrophies() {
  const q = searchEl.value.trim().toLowerCase();
  return trophies.filter((t) => {
    if (kind === 'missable' && !t.missable) return false;
    if (kind === 'online') return false;
    if (kind !== 'all' && kind !== 'missable' && t.kind !== kind) return false;
    if (gradeEl.value !== 'all' && t.grade !== gradeEl.value) return false;
    if (earnedEl.value === 'earned' && !earned.has(t.name)) return false;
    if (earnedEl.value === 'todo' && earned.has(t.name)) return false;
    if (q) {
      const hay = `${t.name} ${t.description} ${t.guide} ${t.chapter || ''} ${t.target || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function renderProgress() {
  document.getElementById('earnedCount').textContent = earned.size;
  document.getElementById('barFill').style.width = `${(earned.size / trophies.length) * 100}%`;
  const byGrade = (g) => trophies.filter((t) => t.grade === g && earned.has(t.name)).length;
  document.getElementById('gradeCounts').textContent =
    `Platinum ${byGrade('platinum')}/1 · Gold ${byGrade('gold')}/2 · Silver ${byGrade('silver')}/6 · Bronze ${byGrade('bronze')}/46`;
}

function renderList() {
  const shown = visibleTrophies();
  listEl.replaceChildren();
  emptyEl.hidden = shown.length !== 0;
  resultEl.textContent = kind === 'online'
    ? 'Online (0) — this game has no online trophies: all 55 are single-player, so this filter is empty by design.'
    : `Showing ${shown.length} of ${trophies.length} trophies · ${earned.size} earned`;
  for (const t of shown) {
    const li = document.createElement('li');
    if (earned.has(t.name)) li.classList.add('earned');
    if (selectedId === t.id) li.classList.add('selected');
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = earned.has(t.name);
    box.setAttribute('aria-label', `Mark ${t.name} earned`);
    box.addEventListener('change', (ev) => {
      ev.stopPropagation();
      if (box.checked) earned.add(t.name); else earned.delete(t.name);
      saveProgress();
      renderProgress();
      renderList();
      renderDetail();
    });
    const body = document.createElement('div');
    const hidden = isSpoilerHidden(t);
    const name = document.createElement('div');
    name.className = 't-name';
    name.textContent = hidden ? 'Hidden story trophy — earn it to reveal' : t.name;
    if (t.hidden && !hidden) {
      const tag = document.createElement('span');
      tag.className = 'hidden-tag';
      tag.textContent = ' · hidden on PSN';
      name.append(tag);
    }
    const desc = document.createElement('div');
    desc.className = 't-desc';
    desc.textContent = hidden ? 'Story trophy — its name and description are hidden until earned.' : t.description;
    const meta = document.createElement('div');
    meta.className = 't-meta';
    const bits = [];
    if (t.chapter) bits.push(t.chapter);
    if (t.target) bits.push(t.target);
    bits.push(`Stage ${t.stage}`);
    meta.textContent = bits.join(' · ');
    if (t.missable) {
      const flag = document.createElement('span');
      flag.className = 'flag-miss';
      flag.textContent = ' · ⚠ MISSABLE';
      meta.append(flag);
    }
    body.append(name, desc, meta);
    const chip = document.createElement('span');
    chip.className = `grade-chip grade-${t.grade}`;
    chip.textContent = gradeLabel(t.grade);
    li.append(box, body, chip);
    li.addEventListener('click', (ev) => {
      if (ev.target === box) return;
      selectedId = t.id;
      renderList();
      renderDetail();
    });
    listEl.append(li);
  }
}

function renderDetail() {
  const t = trophies.find((x) => x.id === selectedId) || trophies.find((x) => x.missable) || trophies[0];
  if (!t) return;
  selectedId = t.id;
  const hidden = isSpoilerHidden(t);
  detailEl.replaceChildren();
  const chip = document.createElement('span');
  chip.className = `grade-chip grade-${t.grade}`;
  chip.textContent = gradeLabel(t.grade);
  detailEl.append(chip);
  const h = document.createElement('h3');
  h.textContent = hidden ? 'Hidden story trophy' : t.name;
  detailEl.append(h);
  const off = document.createElement('p');
  off.className = 'official';
  off.textContent = hidden ? 'Official description hidden until earned.' : `“${t.description}” — official description`;
  detailEl.append(off);
  if (t.missable && t.missable_note) {
    const warn = document.createElement('p');
    warn.className = 'warn';
    warn.textContent = t.missable_note;
    detailEl.append(warn);
  }
  const targetLabel = document.createElement('p');
  targetLabel.className = 'label';
  targetLabel.textContent = 'GUIDE';
  detailEl.append(targetLabel);
  const guide = document.createElement('p');
  guide.textContent = hidden ? 'Turn off “Hide story spoilers” or earn this trophy to read its guide.' : t.guide;
  detailEl.append(guide);
  if (t.target) {
    const target = document.createElement('p');
    const strong = document.createElement('strong');
    strong.textContent = 'Target: ';
    target.append(strong, document.createTextNode(t.target));
    detailEl.append(target);
  }
  const srcLabel = document.createElement('p');
  srcLabel.className = 'label';
  srcLabel.textContent = 'SOURCES — WHERE EACH FACT COMES FROM';
  detailEl.append(srcLabel);
  const ul = document.createElement('ul');
  for (const s of t.sources || []) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = s.url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = s.name;
    li.append(a);
    ul.append(li);
  }
  detailEl.append(ul);
  const done = document.createElement('p');
  done.className = 'label';
  done.textContent = earned.has(t.name) ? '✓ EARNED — ticked in your tracker' : 'NOT EARNED YET — tick the box to mark it done';
  detailEl.append(done);
}

function renderRoadmap() {
  const wrap = document.getElementById('roadmapStages');
  wrap.replaceChildren();
  for (const s of roadmap) {
    const card = document.createElement('article');
    card.className = 'stage-card';
    const h = document.createElement('h4');
    h.textContent = s.title;
    const time = document.createElement('p');
    time.className = 'time';
    time.textContent = s.time;
    const p = document.createElement('p');
    p.textContent = s.text;
    card.append(h, time, p);
    wrap.append(card);
  }
}

function renderMissable() {
  const wrap = document.getElementById('missableList');
  wrap.replaceChildren();
  for (const t of trophies.filter((x) => x.missable)) {
    const card = document.createElement('article');
    card.className = 'miss-card';
    const h = document.createElement('h3');
    h.textContent = `${t.name} — ${gradeLabel(t.grade)}`;
    const off = document.createElement('p');
    off.className = 'official';
    off.textContent = `“${t.description}” — official description`;
    const p = document.createElement('p');
    p.textContent = t.guide;
    card.append(h, off, p);
    wrap.append(card);
  }
  const none = document.createElement('p');
  none.className = 'note';
  none.textContent = 'That is the whole list: 1 of 55. Every other trophy is safe to earn in free-roam after the story, including all 12 story trophies.';
  wrap.append(none);
}

function switchView(name) {
  document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.view === name));
  document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.id === `view-${name}`));
}

document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => switchView(b.dataset.view)));
document.getElementById('showMissable').addEventListener('click', () => switchView('missable'));
searchEl.addEventListener('input', renderList);
gradeEl.addEventListener('change', renderList);
earnedEl.addEventListener('change', renderList);
spoilerEl.checked = spoilers;
spoilerEl.addEventListener('change', () => {
  spoilers = spoilerEl.checked;
  saveSpoilers();
  renderList();
  renderDetail();
});

document.getElementById('exportBtn').addEventListener('click', () => {
  const payload = { game: 'Grand Theft Auto VI', exported: new Date().toISOString(), earned: [...earned] };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  a.download = 'gta6-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
});
document.getElementById('importFile').addEventListener('change', async (ev) => {
  const file = ev.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const names = Array.isArray(data) ? data : data.earned;
    const known = new Set(trophies.map((t) => t.name));
    earned = new Set((names || []).filter((n) => known.has(n)));
    saveProgress();
    renderProgress();
    renderList();
    renderDetail();
  } catch {
    resultEl.textContent = 'That file could not be imported — it is not a progress file from this guide.';
  }
  ev.target.value = '';
});
document.getElementById('resetBtn').addEventListener('click', () => {
  if (confirm('Clear all earned ticks?')) {
    earned = new Set();
    saveProgress();
    renderProgress();
    renderList();
    renderDetail();
  }
});

// Deep links used by the screenshots and by readers: #roadmap, #missable,
// #about, #trophy-<id>, and ?spoilers=on.
const params = new URLSearchParams(location.search);
if (params.get('spoilers') === 'on') {
  spoilers = true;
  spoilerEl.checked = true;
  saveSpoilers();
}
const hash = location.hash.replace('#', '');
if (hash === 'roadmap' || hash === 'missable' || hash === 'about') switchView(hash);
if (hash.startsWith('trophy-')) {
  const id = Number(hash.slice('trophy-'.length));
  if (trophies.some((t) => t.id === id)) selectedId = id;
}

renderKinds();
renderProgress();
renderList();
renderDetail();
renderRoadmap();
renderMissable();
