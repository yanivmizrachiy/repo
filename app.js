const $ = (id) => document.getElementById(id);
const visits = JSON.parse(localStorage.getItem('repoVisits') || '{}');
let repos = [];
let meta = {};

function fmtDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('he-IL');
}

function safe(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[ch]));
}

function lastVisit(name) {
  return visits[name]?.last_opened_at || '';
}

function readinessClass(value) {
  const n = Number(value || 0);
  if (n >= 75) return 'good';
  if (n >= 45) return 'mid';
  return 'low';
}

function statusClass(value) {
  const text = String(value || '');
  if (text.includes('ארכיון') || text.includes('ריק')) return 'low';
  if (text.includes('חלקי')) return 'mid';
  return 'good';
}

function openRepo(name) {
  const repo = repos.find((item) => item.name === name);
  if (!repo) return;
  visits[repo.name] = { last_opened_at: new Date().toISOString() };
  localStorage.setItem('repoVisits', JSON.stringify(visits, null, 2));
  window.open(repo.url, '_blank', 'noopener');
  render();
}

function renderStats(rows) {
  const active = rows.filter((repo) => String(repo.status_he || '').includes('פעיל')).length;
  const partial = rows.filter((repo) => String(repo.status_he || '').includes('חלקי')).length;
  const archived = rows.filter((repo) => String(repo.status_he || '').includes('ארכיון')).length;
  const avg = rows.length ? Math.round(rows.reduce((sum, repo) => sum + Number(repo.readiness_percent || 0), 0) / rows.length) : 0;
  const stats = document.getElementById('stats');
  if (!stats) return;
  stats.innerHTML = `
    <div><b>${rows.length}</b><span>מוצגים</span></div>
    <div><b>${meta.public_count ?? repos.length}</b><span>ציבוריים</span></div>
    <div><b>${meta.private_hidden ?? 0}</b><span>פרטיים מוסתרים</span></div>
    <div><b>${active}</b><span>פעילים</span></div>
    <div><b>${partial}</b><span>חלקיים</span></div>
    <div><b>${archived}</b><span>ארכיון</span></div>
    <div><b>${avg}%</b><span>ממוצע מוכנות</span></div>
  `;
}

function render() {
  const query = $('q').value.toLowerCase().trim();
  const sortMode = $('sort').value;
  let rows = repos.filter((repo) => [
    repo.name, repo.category_he, repo.summary_he, repo.exists_he, repo.notes_he, repo.status_he
  ].join(' ').toLowerCase().includes(query));

  rows.sort((a, b) => {
    if (sortMode === 'name') return a.name.localeCompare(b.name, 'he');
    if (sortMode === 'ready') return Number(b.readiness_percent || 0) - Number(a.readiness_percent || 0);
    const av = sortMode === 'visit' ? (lastVisit(a.name) || a.pushed_at) : (a.pushed_at || '');
    const bv = sortMode === 'visit' ? (lastVisit(b.name) || b.pushed_at) : (b.pushed_at || '');
    return String(bv).localeCompare(String(av));
  });

  renderStats(rows);

  $('rows').innerHTML = rows.map((repo) => `
    <tr>
      <td>
        <div class="repo">${safe(repo.name)}</div>
        <div class="muted">${safe(repo.category_he || 'לא מסווג')}</div>
      </td>
      <td>
        <strong>${safe(repo.summary_he || 'אין עדיין תיאור עברי מאומת.')}</strong>
        <div class="muted">${safe(repo.exists_he || 'לא זוהה מידע.')}</div>
      </td>
      <td><span class="pill ${statusClass(repo.status_he)}">${safe(repo.status_he || 'לא ידוע')}</span></td>
      <td>
        <div class="bar"><span class="${readinessClass(repo.readiness_percent)}" style="width:${Math.max(0, Math.min(100, Number(repo.readiness_percent || 0)))}%"></span></div>
        <b>${Number(repo.readiness_percent || 0)}%</b>
      </td>
      <td>${safe(repo.notes_he || '')}<br><span class="muted"><b>נפתח כאן:</b> ${fmtDate(lastVisit(repo.name))}</span></td>
      <td><button type="button" data-repo="${safe(repo.name)}">פתח ריפו</button></td>
    </tr>
  `).join('') || '<tr><td colspan="6">אין תוצאות</td></tr>';

  document.querySelectorAll('button[data-repo]').forEach((button) => {
    button.addEventListener('click', () => openRepo(button.dataset.repo));
  });
}

fetch('data/index.json?x=' + Date.now())
  .then((response) => response.json())
  .then((data) => {
    meta = data || {};
    repos = data.repositories || [];
    $('count').textContent = repos.length + ' ריפוזיטוריז באתר';
    $('updated').textContent = data.generated_at ? 'עודכן: ' + fmtDate(data.generated_at) : 'עדיין לא עודכן';
    if (data.notice_he) {
      $('privacy').hidden = false;
      $('privacy').textContent = data.notice_he + (data.private_hidden ? ' ' + data.private_hidden + ' ריפוזיטוריז פרטיים מוסתרים באתר הציבורי.' : '');
    } else if (data.private_hidden) {
      $('privacy').hidden = false;
      $('privacy').textContent = data.private_hidden + ' ריפוזיטוריז פרטיים מוסתרים באתר הציבורי.';
    }
    render();
  })
  .catch(() => {
    $('rows').innerHTML = '<tr><td colspan="6">שגיאה בטעינת הנתונים.</td></tr>';
  });

$('q').addEventListener('input', render);
$('sort').addEventListener('input', render);
