const $ = (id) => document.getElementById(id);
const visits = JSON.parse(localStorage.getItem('repoVisits') || '{}');
const owner = 'yanivmizrachiy';
const siteUrl = 'https://yanivmizrachiy.github.io/repo/';
const repoUrl = 'https://github.com/yanivmizrachiy/repo';
const updateWorkflowUrl = 'https://github.com/yanivmizrachiy/repo/actions/workflows/update-index.yml';
const termuxInstallCommand = 'pkg install -y curl termux-api >/dev/null 2>&1; curl -fsSL https://raw.githubusercontent.com/yanivmizrachiy/repo/main/termux/install_repo_index_shortcut.sh | bash';
const refreshCommand = 'gh workflow run "Update repo index" --repo yanivmizrachiy/repo; Start-Sleep -Seconds 5; gh run list --repo yanivmizrachiy/repo --workflow "Update repo index" --limit 5';
let repos = [];
let meta = {};
let deferredInstallPrompt = null;

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

function setCopyStatus(text, isError = false) {
  const status = $('copyStatus');
  if (!status) return;
  status.textContent = text;
  status.style.color = isError ? '#b91c1c' : '';
}

async function copyText(text, successMessage) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
    }
    setCopyStatus(successMessage || 'הועתק ללוח.');
  } catch (error) {
    setCopyStatus('לא הצלחתי להעתיק אוטומטית. אפשר לסמן ולהעתיק ידנית: ' + text, true);
  }
}

function repoNumber(repo, fallbackIndex) {
  const n = Number(repo.number ?? repo.index ?? fallbackIndex + 1);
  return Number.isFinite(n) && n > 0 ? n : fallbackIndex + 1;
}

function repoSiteUrl(repo) {
  return repo.site_url || `https://${owner}.github.io/${encodeURIComponent(repo.name)}/`;
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

function actionLink(url, label, explanation) {
  return `<div class="actionItem"><a class="actionButton" href="${safe(url)}" target="_blank" rel="noopener">${safe(label)}</a><small>${safe(explanation)}</small></div>`;
}

function renderActions(repo) {
  const base = `https://github.com/${owner}/${encodeURIComponent(repo.name)}`;
  const branch = encodeURIComponent(repo.default_branch || 'main');
  return `
    <div class="actionsGrid">
      ${actionLink(repo.url, 'פתח ריפו', 'פותח את עמוד הריפו האמיתי ב־GitHub.')}
      ${actionLink(repoSiteUrl(repo), 'פתח אתר חיצוני', 'פותח את כתובת האתר החיצוני המשוערת של הריפו.')}
      ${actionLink(`${base}/blob/${branch}/README.md`, 'פתח README', 'פותח את דף ההסבר הראשי של הריפו, אם הוא קיים.')}
      ${actionLink(`${base}/blob/${branch}/RULES.md`, 'פתח כללים', 'פותח את דף הכללים של הריפו, אם הוא קיים.')}
      ${actionLink(`${base}/tree/${branch}/docs`, 'פתח מסמכים', 'פותח את תיקיית המסמכים של הריפו, אם היא קיימת.')}
      ${actionLink(`${base}/tree/${branch}/STATE`, 'פתח מצב', 'פותח את תיקיית מצב הפרויקט, אם היא קיימת.')}
    </div>
  `;
}

function render() {
  const query = $('q').value.toLowerCase().trim();
  const sortMode = $('sort').value;
  let rows = repos.filter((repo, index) => [
    repoNumber(repo, index), repo.name, repo.category_he, repo.summary_he, repo.exists_he, repo.notes_he, repo.status_he,
    'פתח ריפו פתח אתר README כללים מסמכים מצב'
  ].join(' ').toLowerCase().includes(query));

  rows.sort((a, b) => {
    if (sortMode === 'name') return a.name.localeCompare(b.name, 'he');
    if (sortMode === 'ready') return Number(b.readiness_percent || 0) - Number(a.readiness_percent || 0);
    const av = sortMode === 'visit' ? (lastVisit(a.name) || a.pushed_at) : (a.pushed_at || '');
    const bv = sortMode === 'visit' ? (lastVisit(b.name) || b.pushed_at) : (b.pushed_at || '');
    return String(bv).localeCompare(String(av));
  });

  renderStats(rows);

  $('rows').innerHTML = rows.map((repo, index) => `
    <tr>
      <td class="repoNum">${repoNumber(repo, repos.findIndex((item) => item.name === repo.name) >= 0 ? repos.findIndex((item) => item.name === repo.name) : index)}</td>
      <td>
        <div class="repo">${safe(repo.name)}</div>
        <div class="muted">${safe(repo.category_he || 'לא מסווג')}</div>
        <div class="muted"><b>עודכן:</b> ${fmtDate(repo.pushed_at || repo.updated_at)}</div>
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
      <td>${renderActions(repo)}</td>
    </tr>
  `).join('') || '<tr><td colspan="7">אין תוצאות</td></tr>';
}

async function handleGlobalAction(action) {
  if (action === 'open-site') {
    window.open(siteUrl, '_blank', 'noopener');
    setCopyStatus('האתר נפתח בחלון חדש.');
    return;
  }
  if (action === 'open-repo') {
    window.open(repoUrl, '_blank', 'noopener');
    setCopyStatus('ריפו הניהול נפתח בחלון חדש.');
    return;
  }
  if (action === 'open-update-workflow') {
    window.open(updateWorkflowUrl, '_blank', 'noopener');
    setCopyStatus('מסך GitHub Actions לעדכון האינדקס נפתח.');
    return;
  }
  if (action === 'copy-refresh-command') {
    await copyText(refreshCommand, 'פקודת רענון GitHub Actions הועתקה ל־PowerShell.');
    return;
  }
  if (action === 'copy-termux-command') {
    await copyText(termuxInstallCommand, 'פקודת Termux לקיצור הטלפון הועתקה.');
    return;
  }
  if (action === 'install-pwa') {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      setCopyStatus(choice?.outcome === 'accepted' ? 'התקנת האתר למסך הבית אושרה.' : 'ההתקנה לא אושרה. אפשר להשתמש בתפריט הדפדפן: הוספה למסך הבית.');
    } else {
      await copyText('פתח את האתר בכרום בטלפון: ' + siteUrl + ' ואז בתפריט ⋮ בחר: הוספה למסך הבית / התקנת האפליקציה.', 'הנחיית התקנה למסך הבית הועתקה.');
    }
  }
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  setCopyStatus('אפשר להתקין את האתר למסך הבית עם האייקון הכתום.');
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  setCopyStatus('האתר הותקן כאפליקציה במסך הבית.');
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      setCopyStatus('האתר עובד, אבל Service Worker לא נרשם בדפדפן הזה.', true);
    });
  });
}

fetch('data/index.json?x=' + Date.now())
  .then((response) => response.json())
  .then((data) => {
    meta = data || {};
    repos = (data.repositories || []).map((repo, index) => ({ ...repo, number: repo.number ?? index + 1 }));
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
    $('rows').innerHTML = '<tr><td colspan="7">שגיאה בטעינת הנתונים.</td></tr>';
  });

$('q').addEventListener('input', render);
$('sort').addEventListener('input', render);
document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-global-action]');
  if (!button) return;
  handleGlobalAction(button.dataset.globalAction);
});
