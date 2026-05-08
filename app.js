const $ = (id) => document.getElementById(id);
const visits = JSON.parse(localStorage.getItem('repoVisits') || '{}');
let repos = [];

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

function openRepo(name) {
  const repo = repos.find((item) => item.name === name);
  if (!repo) return;
  visits[repo.name] = { last_opened_at: new Date().toISOString() };
  localStorage.setItem('repoVisits', JSON.stringify(visits, null, 2));
  window.open(repo.url, '_blank', 'noopener');
  render();
}

function render() {
  const query = $('q').value.toLowerCase().trim();
  const sortMode = $('sort').value;
  let rows = repos.filter((repo) => [
    repo.name, repo.summary_he, repo.exists_he, repo.notes_he, repo.language
  ].join(' ').toLowerCase().includes(query));

  rows.sort((a, b) => {
    if (sortMode === 'name') return a.name.localeCompare(b.name, 'he');
    const av = sortMode === 'visit' ? (lastVisit(a.name) || a.pushed_at) : (a.pushed_at || '');
    const bv = sortMode === 'visit' ? (lastVisit(b.name) || b.pushed_at) : (b.pushed_at || '');
    return String(bv).localeCompare(String(av));
  });

  $('rows').innerHTML = rows.map((repo) => `
    <tr>
      <td><div class="repo">${safe(repo.name)}</div><div class="muted">${safe(repo.language || '')}</div></td>
      <td>${safe(repo.summary_he || 'אין עדיין תיאור עברי מאומת.')}</td>
      <td>${safe(repo.exists_he || 'לא זוהה מידע.')}</td>
      <td>${safe(repo.notes_he || '')}</td>
      <td><b>עודכן:</b> ${fmtDate(repo.pushed_at)}<br><span class="muted"><b>נפתח כאן:</b> ${fmtDate(lastVisit(repo.name))}</span></td>
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
    repos = data.repositories || [];
    $('count').textContent = repos.length + ' ריפוזיטוריז';
    $('updated').textContent = data.generated_at ? 'עודכן: ' + fmtDate(data.generated_at) : 'עדיין לא עודכן';
    if (data.private_hidden) {
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
