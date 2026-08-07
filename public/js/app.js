const API_BASE = '';
// LEARNED: Empty API_BASE uses the same host (local or Render).

let movies = [];
let games = [];
let shows = [];
let currentUser = null;

/** Active Sortable instances keyed by tbody id (recreated after each load). */
const sortables = {};

// Send session cookie with every request
function apiFetch(url, options = {}) {
  return fetch(`${API_BASE}${url}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
}

// Load data when page loads
document.addEventListener('DOMContentLoaded', async () => {
  const currentYear = new Date().getFullYear();

  document.getElementById('movie-year').max = currentYear;
  document.getElementById('game-year').max = currentYear;
  document.getElementById('show-year').max = currentYear;
  document.getElementById('edit-movie-year').max = currentYear;
  document.getElementById('edit-game-year').max = currentYear;
  document.getElementById('edit-show-year').max = currentYear;

  document.getElementById('edit-movie-year').min = 1500;
  document.getElementById('edit-game-year').min = 1500;
  document.getElementById('edit-show-year').min = 1500;

  document.getElementById('login-btn').addEventListener('click', () => handleAuth());
  document.getElementById('logout-btn').addEventListener('click', handleLogout);
  document.getElementById('change-password-btn').addEventListener('click', () => {
    document.getElementById('current-password').value = '';
    document.getElementById('new-password').value = '';
    document.getElementById('confirm-password').value = '';
    document.getElementById('change-password-error').hidden = true;
    new bootstrap.Modal(document.getElementById('changePasswordModal')).show();
  });
  document.getElementById('save-password-btn').addEventListener('click', handleChangePassword);

  document.querySelectorAll('.share-list-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const category = btn.dataset.category;
      downloadShareCard(category, btn);
    });
  });

  document.querySelectorAll('.csv-export-btn').forEach((btn) => {
    btn.addEventListener('click', () => exportListCsv(btn.dataset.category));
  });
  document.querySelectorAll('.csv-template-btn').forEach((btn) => {
    btn.addEventListener('click', () => downloadCsvTemplate(btn.dataset.category));
  });
  document.querySelectorAll('.csv-import-btn').forEach((btn) => {
    btn.addEventListener('click', () => openCsvImportPicker(btn.dataset.category));
  });

  const csvInput = document.getElementById('csv-import-input');
  if (csvInput) {
    csvInput.addEventListener('change', handleCsvFileSelected);
  }
  const csvConfirmBtn = document.getElementById('csv-import-confirm-btn');
  if (csvConfirmBtn) {
    csvConfirmBtn.addEventListener('click', applyPendingCsvImport);
  }

  await checkSession();
});

async function checkSession() {
  try {
    const response = await apiFetch('/auth/me');
    if (response.ok) {
      currentUser = await response.json();
      showApp();
    } else {
      showAuth();
    }
  } catch (error) {
    console.error('Session check failed:', error);
    showAuth();
  }
}

function showAuth() {
  currentUser = null;
  document.getElementById('auth-panel').hidden = false;
  document.getElementById('app-panel').hidden = true;
}

function showApp() {
  document.getElementById('auth-panel').hidden = true;
  document.getElementById('app-panel').hidden = false;
  document.getElementById('user-label').textContent = currentUser
    ? `Signed in as ${currentUser.username}`
    : '';
  loadMovies();
  loadGames();
  loadShows();
}

function setAuthError(message) {
  const el = document.getElementById('auth-error');
  if (!message) {
    el.hidden = true;
    el.textContent = '';
    return;
  }
  el.hidden = false;
  el.textContent = message;
}

async function handleAuth() {
  setAuthError('');
  const username = document.getElementById('auth-username').value.trim();
  const password = document.getElementById('auth-password').value;

  if (!username || !password) {
    setAuthError('Username and password are required.');
    return;
  }

  try {
    const response = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setAuthError(data.error || 'Authentication failed');
      return;
    }

    currentUser = data;
    document.getElementById('auth-password').value = '';
    showApp();
  } catch (error) {
    console.error('Auth error:', error);
    setAuthError('Network error. Try again.');
  }
}

async function handleChangePassword() {
  const errorEl = document.getElementById('change-password-error');
  errorEl.hidden = true;
  errorEl.textContent = '';

  const currentPassword = document.getElementById('current-password').value;
  const newPassword = document.getElementById('new-password').value;
  const confirmPassword = document.getElementById('confirm-password').value;

  if (!currentPassword || !newPassword || !confirmPassword) {
    errorEl.textContent = 'All fields are required.';
    errorEl.hidden = false;
    return;
  }
  if (newPassword.length < 8) {
    errorEl.textContent = 'New password must be at least 8 characters.';
    errorEl.hidden = false;
    return;
  }
  if (newPassword !== confirmPassword) {
    errorEl.textContent = 'New passwords do not match.';
    errorEl.hidden = false;
    return;
  }

  try {
    const response = await apiFetch('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword })
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      errorEl.textContent = data.error || 'Could not change password';
      errorEl.hidden = false;
      return;
    }

    bootstrap.Modal.getInstance(document.getElementById('changePasswordModal')).hide();
    alert('Password updated successfully.');
  } catch (error) {
    console.error('Change password error:', error);
    errorEl.textContent = 'Network error. Try again.';
    errorEl.hidden = false;
  }
}

async function handleLogout() {
  try {
    await apiFetch('/auth/logout', { method: 'POST' });
  } catch (error) {
    console.error('Logout error:', error);
  }
  showAuth();
}

// ==================== LOAD FUNCTIONS ====================

function mediaRowHtml(item) {
  return `
    <tr data-id="${item.id}">
      <td class="drag-handle" title="Drag to reorder" aria-label="Drag to reorder">⋮⋮</td>
      <td class="col-rank">${item.rank}</td>
      <td>${escapeHtml(item.title)}</td>
      <td>${escapeHtml(item.genre)}</td>
      <td>${escapeHtml(item.year)}</td>
      <td>
        <button type="button" class="btn btn-sm btn-primary">Edit</button>
        <button type="button" class="btn btn-sm btn-danger">Delete</button>
      </td>
    </tr>
  `;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Enable drag-and-drop reordering on a list tbody.
 * On drop, persists full order via PUT /{resource}/reorder and reloads.
 */
function setupSortable(tbodyId, resource, reload) {
  if (typeof Sortable === 'undefined') {
    console.warn('SortableJS not loaded; drag-and-drop disabled.');
    return;
  }

  if (sortables[tbodyId]) {
    sortables[tbodyId].destroy();
    delete sortables[tbodyId];
  }

  const tbody = document.getElementById(tbodyId);
  if (!tbody || tbody.children.length === 0) {
    return;
  }

  sortables[tbodyId] = Sortable.create(tbody, {
    animation: 150,
    handle: '.drag-handle',
    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    dragClass: 'sortable-drag',
    onEnd: async (evt) => {
      if (evt.oldIndex === evt.newIndex) return;

      const orderedIds = Array.from(tbody.querySelectorAll('tr[data-id]')).map(
        (row) => Number(row.dataset.id)
      );

      try {
        const response = await apiFetch(`/${resource}/reorder`, {
          method: 'PUT',
          body: JSON.stringify({ orderedIds })
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          alert(data.error || 'Could not reorder list');
          reload();
          return;
        }

        reload();
      } catch (error) {
        console.error('Reorder error:', error);
        alert('Error reordering list');
        reload();
      }
    }
  });
}

async function loadMovies() {
  try {
    const response = await apiFetch('/movies');
    if (response.status === 401) {
      showAuth();
      return;
    }
    movies = await response.json();
    if (!Array.isArray(movies)) movies = [];

    const tbody = document.getElementById('movies-table-body');
    tbody.innerHTML = movies.map(mediaRowHtml).join('');
    setupSortable('movies-table-body', 'movies', loadMovies);
  } catch (error) {
    console.error('Error loading movies:', error);
  }
}

async function loadGames() {
  try {
    const response = await apiFetch('/games');
    if (response.status === 401) {
      showAuth();
      return;
    }
    games = await response.json();
    if (!Array.isArray(games)) games = [];

    const tbody = document.getElementById('games-table-body');
    tbody.innerHTML = games.map(mediaRowHtml).join('');
    setupSortable('games-table-body', 'games', loadGames);
  } catch (error) {
    console.error('Error loading games:', error);
  }
}

async function loadShows() {
  try {
    const response = await apiFetch('/shows');
    if (response.status === 401) {
      showAuth();
      return;
    }
    shows = await response.json();
    if (!Array.isArray(shows)) shows = [];

    const tbody = document.getElementById('shows-table-body');
    tbody.innerHTML = shows.map(mediaRowHtml).join('');
    setupSortable('shows-table-body', 'shows', loadShows);
  } catch (error) {
    console.error('Error loading shows:', error);
  }
}

// ==================== FORM HANDLERS ====================

const addMovieForm = document.getElementById('add-movie-form');
if (addMovieForm) {
  addMovieForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (movies.length >= 10) {
      alert('Maximum of 10 movies reached!');
      return;
    }

    const newMovie = {
      title: document.getElementById('movie-title').value,
      genre: document.getElementById('movie-genre').value,
      year: document.getElementById('movie-year').value
    };

    try {
      const response = await apiFetch('/movies', {
        method: 'POST',
        body: JSON.stringify(newMovie)
      });
      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        addMovieForm.reset();
        loadMovies();
        alert('Movie added successfully!');
      } else {
        alert(data.error || 'Error adding movie');
      }
    } catch (error) {
      console.error('Error adding movie:', error);
      alert('Error adding movie');
    }
  });
}

const addGameForm = document.getElementById('add-game-form');
if (addGameForm) {
  addGameForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (games.length >= 10) {
      alert('Maximum of 10 games reached!');
      return;
    }

    const newGame = {
      title: document.getElementById('game-title').value,
      genre: document.getElementById('game-genre').value,
      year: document.getElementById('game-year').value
    };

    try {
      const response = await apiFetch('/games', {
        method: 'POST',
        body: JSON.stringify(newGame)
      });
      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        addGameForm.reset();
        loadGames();
        alert('Game added successfully!');
      } else {
        alert(data.error || 'Error adding game');
      }
    } catch (error) {
      console.error('Error adding game:', error);
      alert('Error adding game');
    }
  });
}

const addShowForm = document.getElementById('add-show-form');
if (addShowForm) {
  addShowForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (shows.length >= 10) {
      alert('Maximum of 10 shows reached!');
      return;
    }

    const newShow = {
      title: document.getElementById('show-title').value,
      genre: document.getElementById('show-genre').value,
      year: document.getElementById('show-year').value
    };

    try {
      const response = await apiFetch('/shows', {
        method: 'POST',
        body: JSON.stringify(newShow)
      });
      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        addShowForm.reset();
        loadShows();
        alert('Show added successfully!');
      } else {
        alert(data.error || 'Error adding show');
      }
    } catch (error) {
      console.error('Error adding show:', error);
      alert('Error adding show');
    }
  });
}

// Global Delete handler
document.addEventListener('click', async (e) => {
  if (e.target.classList.contains('btn-danger')) {
    if (!confirm('Are you sure you want to delete this item?')) return;

    const row = e.target.closest('tr');
    // data-id is the database id; Rank column is display-only (1..n)
    const id = row.dataset.id;
    const tabPane = e.target.closest('.tab-pane');
    const resource = tabPane.id;

    try {
      const response = await apiFetch(`/${resource}/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        if (resource === 'movies') loadMovies();
        else if (resource === 'games') loadGames();
        else if (resource === 'shows') loadShows();
        alert('Item deleted successfully!');
      } else {
        const data = await response.json().catch(() => ({}));
        alert(data.error || 'Error deleting item');
      }
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Error deleting item');
    }
  }
});

// Edit handlers — fill from in-memory lists (not cell indices; handle column is first).
document.addEventListener('click', (e) => {
  if (e.target.textContent !== 'Edit' || !e.target.classList.contains('btn-primary')) {
    return;
  }

  const row = e.target.closest('tr');
  if (!row || !row.dataset.id) return;

  if (e.target.closest('#movies')) {
    const item = movies.find((m) => String(m.id) === String(row.dataset.id));
    if (!item) return;
    document.getElementById('edit-movie-id').value = item.id;
    document.getElementById('edit-movie-rank').value = item.rank;
    document.getElementById('edit-movie-title').value = item.title;
    document.getElementById('edit-movie-genre').value = item.genre;
    document.getElementById('edit-movie-year').value = item.year;
    new bootstrap.Modal(document.getElementById('editMovieModal')).show();
    return;
  }

  if (e.target.closest('#games')) {
    const item = games.find((g) => String(g.id) === String(row.dataset.id));
    if (!item) return;
    document.getElementById('edit-game-id').value = item.id;
    document.getElementById('edit-game-rank').value = item.rank;
    document.getElementById('edit-game-title').value = item.title;
    document.getElementById('edit-game-genre').value = item.genre;
    document.getElementById('edit-game-year').value = item.year;
    new bootstrap.Modal(document.getElementById('editGameModal')).show();
    return;
  }

  if (e.target.closest('#shows')) {
    const item = shows.find((s) => String(s.id) === String(row.dataset.id));
    if (!item) return;
    document.getElementById('edit-show-id').value = item.id;
    document.getElementById('edit-show-rank').value = item.rank;
    document.getElementById('edit-show-title').value = item.title;
    document.getElementById('edit-show-genre').value = item.genre;
    document.getElementById('edit-show-year').value = item.year;
    new bootstrap.Modal(document.getElementById('editShowModal')).show();
  }
});

document.getElementById('save-movie-edit').addEventListener('click', async () => {
  const id = document.getElementById('edit-movie-id').value;
  const rank = Number(document.getElementById('edit-movie-rank').value);
  if (!Number.isInteger(rank) || rank < 1 || rank > 10) {
    alert('Rank must be an integer between 1 and 10.');
    return;
  }
  const updatedMovie = {
    rank,
    title: document.getElementById('edit-movie-title').value,
    genre: document.getElementById('edit-movie-genre').value,
    year: document.getElementById('edit-movie-year').value
  };

  try {
    const response = await apiFetch(`/movies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updatedMovie)
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      bootstrap.Modal.getInstance(document.getElementById('editMovieModal')).hide();
      loadMovies();
      alert('Movie updated successfully!');
    } else {
      alert(data.error || 'Error updating movie');
    }
  } catch (error) {
    console.error('Error updating movie:', error);
    alert('Error updating movie');
  }
});

document.getElementById('save-game-edit').addEventListener('click', async () => {
  const id = document.getElementById('edit-game-id').value;
  const rank = Number(document.getElementById('edit-game-rank').value);
  if (!Number.isInteger(rank) || rank < 1 || rank > 10) {
    alert('Rank must be an integer between 1 and 10.');
    return;
  }
  const updatedGame = {
    rank,
    title: document.getElementById('edit-game-title').value,
    genre: document.getElementById('edit-game-genre').value,
    year: document.getElementById('edit-game-year').value
  };

  try {
    const response = await apiFetch(`/games/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updatedGame)
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      bootstrap.Modal.getInstance(document.getElementById('editGameModal')).hide();
      loadGames();
      alert('Game updated successfully!');
    } else {
      alert(data.error || 'Error updating game');
    }
  } catch (error) {
    console.error('Error updating game:', error);
    alert('Error updating game');
  }
});

document.getElementById('save-show-edit').addEventListener('click', async () => {
  const id = document.getElementById('edit-show-id').value;
  const rank = Number(document.getElementById('edit-show-rank').value);
  if (!Number.isInteger(rank) || rank < 1 || rank > 10) {
    alert('Rank must be an integer between 1 and 10.');
    return;
  }
  const updatedShow = {
    rank,
    title: document.getElementById('edit-show-title').value,
    genre: document.getElementById('edit-show-genre').value,
    year: document.getElementById('edit-show-year').value
  };

  try {
    const response = await apiFetch(`/shows/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updatedShow)
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      bootstrap.Modal.getInstance(document.getElementById('editShowModal')).hide();
      loadShows();
      alert('Show updated successfully!');
    } else {
      alert(data.error || 'Error updating show');
    }
  } catch (error) {
    console.error('Error updating show:', error);
    alert('Error updating show');
  }
});

// ==================== SHARE CARD (client-side PNG) ====================

const SHARE_CATEGORY_LABELS = {
  movies: 'Movies',
  games: 'Games',
  shows: 'Shows'
};

function getShareListData(category) {
  if (category === 'movies') return movies;
  if (category === 'games') return games;
  if (category === 'shows') return shows;
  return [];
}

/**
 * Fill the off-screen share card from in-memory list data.
 * Rank + title + year always; genre when present.
 */
function populateShareCard(category) {
  const label = SHARE_CATEGORY_LABELS[category] || category;
  const items = [...getShareListData(category)].sort(
    (a, b) => Number(a.rank) - Number(b.rank)
  );

  document.getElementById('share-card-title').textContent = `My Top 10 ${label}`;

  const usernameEl = document.getElementById('share-card-username');
  usernameEl.textContent = currentUser?.username
    ? `@${currentUser.username}`
    : '';

  const listEl = document.getElementById('share-card-list');
  listEl.innerHTML = items
    .map((item) => {
      const rank = escapeHtml(item.rank);
      const title = escapeHtml(item.title);
      const year = escapeHtml(item.year);
      const genre = item.genre ? escapeHtml(item.genre) : '';
      const metaParts = [year, genre].filter(Boolean);
      const meta = metaParts.length
        ? `<span class="share-card__item-meta">${metaParts.join(' · ')}</span>`
        : '';

      return `
        <li class="share-card__item">
          <span class="share-card__rank">${rank}</span>
          <span class="share-card__item-body">
            <span class="share-card__item-title">${title}</span>
            ${meta}
          </span>
        </li>
      `;
    })
    .join('');

  return items.length;
}

/**
 * Render the share card to a high-DPI PNG and trigger download.
 */
async function downloadShareCard(category, buttonEl) {
  if (typeof htmlToImage === 'undefined') {
    alert('Image export library failed to load. Refresh and try again.');
    return;
  }

  const count = populateShareCard(category);
  if (count === 0) {
    alert('Your list is empty. Add at least one item before downloading.');
    return;
  }

  const card = document.getElementById('share-card');
  const label = SHARE_CATEGORY_LABELS[category] || category;
  const slug = String(label).toLowerCase().replace(/\s+/g, '-');
  const filename = `my-top-10-${slug}.png`;

  const originalLabel = buttonEl ? buttonEl.textContent : null;
  if (buttonEl) {
    buttonEl.disabled = true;
    buttonEl.textContent = 'Generating…';
  }

  try {
    // pixelRatio 2 → retina-friendly (~1440px wide from 720px card)
    const dataUrl = await htmlToImage.toPng(card, {
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: '#121218'
    });

    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
  } catch (error) {
    console.error('Share card export failed:', error);
    alert('Could not generate the image. Try again.');
  } finally {
    if (buttonEl) {
      buttonEl.disabled = false;
      buttonEl.textContent = originalLabel || 'Download image';
    }
  }
}

// ==================== CSV IMPORT / EXPORT ====================
// Contract (v1): header must be exactly rank,title,genre,year
// Validate entire file before any deletes/creates (replace mode).

const CSV_REQUIRED_HEADERS = ['rank', 'title', 'genre', 'year'];
const CSV_MIN_YEAR = 1500;
const CSV_MAX_ITEMS = 10;

/** @type {{ category: string, items: Array<{rank:number,title:string,genre:string,year:string}> } | null} */
let pendingCsvImport = null;
/** Category for the shared file input (set when Import CSV is clicked). */
let csvImportCategory = null;

function getListData(category) {
  if (category === 'movies') return movies;
  if (category === 'games') return games;
  if (category === 'shows') return shows;
  return [];
}

function getListReload(category) {
  if (category === 'movies') return loadMovies;
  if (category === 'games') return loadGames;
  if (category === 'shows') return loadShows;
  return null;
}

function escapeCsvField(value) {
  const s = String(value ?? '');
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function downloadTextFile(filename, text, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function buildListCsv(items) {
  const header = CSV_REQUIRED_HEADERS.join(',');
  const sorted = [...items].sort((a, b) => Number(a.rank) - Number(b.rank));
  const rows = sorted.map((item) =>
    [
      escapeCsvField(item.rank),
      escapeCsvField(item.title),
      escapeCsvField(item.genre),
      escapeCsvField(item.year)
    ].join(',')
  );
  return `${header}\n${rows.join('\n')}${rows.length ? '\n' : ''}`;
}

function exportListCsv(category) {
  const label = SHARE_CATEGORY_LABELS[category] || category;
  const items = getListData(category);
  const slug = String(label).toLowerCase().replace(/\s+/g, '-');
  const csv = buildListCsv(items);
  downloadTextFile(`my-top-10-${slug}.csv`, csv);
}

function downloadCsvTemplate(category) {
  const label = SHARE_CATEGORY_LABELS[category] || category;
  const slug = String(label).toLowerCase().replace(/\s+/g, '-');
  // Header only — users fill rows; keeps the format contract obvious.
  const csv = `${CSV_REQUIRED_HEADERS.join(',')}\n`;
  downloadTextFile(`my-top-10-${slug}-template.csv`, csv);
}

function openCsvImportPicker(category) {
  csvImportCategory = category;
  const input = document.getElementById('csv-import-input');
  if (!input) return;
  input.value = '';
  input.click();
}

async function handleCsvFileSelected(event) {
  const file = event.target.files && event.target.files[0];
  const category = csvImportCategory;
  event.target.value = '';

  if (!file || !category) return;

  let text;
  try {
    text = await file.text();
  } catch (error) {
    console.error('CSV read failed:', error);
    showCsvImportResult({
      ok: false,
      category,
      summary: 'Could not read the selected file.',
      errors: [{ code: 'PARSE_ERROR', row: null, message: 'File could not be read as text.' }]
    });
    return;
  }

  const result = validateCsvImport(text);
  if (!result.ok) {
    showCsvImportResult({
      ok: false,
      category,
      summary: `Import rejected for ${SHARE_CATEGORY_LABELS[category] || category}. No changes were made.`,
      errors: result.errors
    });
    return;
  }

  pendingCsvImport = { category, items: result.items };
  showCsvImportResult({
    ok: true,
    category,
    summary: `File is valid. Replace your entire ${SHARE_CATEGORY_LABELS[category] || category} list with ${result.items.length} item(s)?`,
    items: result.items,
    errors: []
  });
}

/**
 * Split file text into logical CSV records (handles quoted newlines + BOM).
 * @returns {{ rows: string[][], rowLines: number[], errors: Array<{code:string,row:number|null,message:string}> }}
 */
function parseCsvRecords(text) {
  const errors = [];
  // Strip UTF-8 BOM (common from Excel)
  let raw = text;
  if (raw.charCodeAt(0) === 0xfeff) {
    raw = raw.slice(1);
  }

  const records = [];
  let field = '';
  let row = [];
  let inQuotes = false;
  let lineNo = 1;
  let rowStartLine = 1;

  const pushRow = () => {
    row.push(field);
    field = '';
    // Ignore completely empty lines (e.g. trailing newline at EOF)
    const allEmpty = row.every((cell) => String(cell).trim() === '');
    if (!allEmpty) {
      records.push({ fields: row, line: rowStartLine });
    }
    row = [];
  };

  const endRecordLine = () => {
    pushRow();
    lineNo++;
    rowStartLine = lineNo;
  };

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (inQuotes) {
      if (ch === '"') {
        if (raw[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        if (ch === '\n') lineNo++;
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\r') {
      // Treat \r\n as a single linebreak
      if (raw[i + 1] === '\n') continue;
      endRecordLine();
    } else if (ch === '\n') {
      endRecordLine();
    } else {
      field += ch;
    }
  }

  if (inQuotes) {
    errors.push({
      code: 'PARSE_ERROR',
      row: rowStartLine,
      message: 'Unclosed quoted field (check for a missing closing ").'
    });
    return { rows: [], rowLines: [], errors };
  }

  // Final field/row if file does not end with newline
  if (field.length > 0 || row.length > 0) {
    pushRow();
  }

  return {
    rows: records.map((r) => r.fields),
    rowLines: records.map((r) => r.line),
    errors
  };
}

/**
 * Validate CSV text for import. Does not mutate server state.
 * @returns {{ ok: true, items: Array } | { ok: false, errors: Array }}
 */
function validateCsvImport(text) {
  const errors = [];
  const parsed = parseCsvRecords(text);

  if (parsed.errors.length) {
    return { ok: false, errors: parsed.errors };
  }

  if (!parsed.rows.length) {
    errors.push({
      code: 'ROW_COUNT',
      row: null,
      message: 'File is empty. Expected a header row and 1–10 data rows.'
    });
    return { ok: false, errors };
  }

  const headerFields = parsed.rows[0].map((h) => String(h).trim());
  const headerLower = headerFields.map((h) => h.toLowerCase());

  // Exact set and order: rank,title,genre,year
  const expected = CSV_REQUIRED_HEADERS.join(',');
  const actual = headerLower.join(',');
  if (actual !== expected) {
    // Distinguish missing vs unknown vs wrong order for clearer tickets
    const missing = CSV_REQUIRED_HEADERS.filter((h) => !headerLower.includes(h));
    const unknown = headerLower.filter((h) => h && !CSV_REQUIRED_HEADERS.includes(h));

    if (missing.length || headerFields.length !== CSV_REQUIRED_HEADERS.length || unknown.length) {
      if (missing.length) {
        errors.push({
          code: 'MISSING_HEADER',
          row: 1,
          message: `Header must be exactly: ${expected}. Missing: ${missing.join(', ')}.`
        });
      }
      if (unknown.length) {
        errors.push({
          code: 'UNKNOWN_COLUMN',
          row: 1,
          message: `Unknown column(s): ${unknown.join(', ')}. Allowed: ${expected}.`
        });
      }
      if (!missing.length && !unknown.length) {
        errors.push({
          code: 'MISSING_HEADER',
          row: 1,
          message: `Header must be exactly: ${expected} (found: ${headerFields.join(',') || '(empty)'}).`
        });
      }
    } else {
      errors.push({
        code: 'MISSING_HEADER',
        row: 1,
        message: `Header columns must appear in order: ${expected} (found: ${headerFields.join(',')}).`
      });
    }
    return { ok: false, errors };
  }

  const dataRows = parsed.rows.slice(1);
  const dataLines = (parsed.rowLines || []).slice(1);

  if (dataRows.length === 0) {
    errors.push({
      code: 'ROW_COUNT',
      row: null,
      message: 'No data rows found. Add 1–10 items below the header.'
    });
    return { ok: false, errors };
  }

  if (dataRows.length > CSV_MAX_ITEMS) {
    errors.push({
      code: 'ROW_COUNT',
      row: null,
      message: `Too many data rows (${dataRows.length}). Maximum is ${CSV_MAX_ITEMS}.`
    });
    return { ok: false, errors };
  }

  const maxYear = new Date().getFullYear();
  const items = [];
  const seenRanks = new Map();

  dataRows.forEach((fields, index) => {
    const line = dataLines[index] != null ? dataLines[index] : index + 2;

    if (fields.length !== CSV_REQUIRED_HEADERS.length) {
      errors.push({
        code: 'PARSE_ERROR',
        row: line,
        message: `Expected ${CSV_REQUIRED_HEADERS.length} columns, found ${fields.length}.`
      });
      return;
    }

    const rankRaw = String(fields[0] ?? '').trim();
    const title = String(fields[1] ?? '').trim();
    const genre = String(fields[2] ?? '').trim();
    const yearRaw = String(fields[3] ?? '').trim();

    if (!title) {
      errors.push({
        code: 'REQUIRED_FIELD',
        row: line,
        message: 'title is required and cannot be empty.'
      });
    }
    if (!genre) {
      errors.push({
        code: 'REQUIRED_FIELD',
        row: line,
        message: 'genre is required and cannot be empty.'
      });
    }
    if (!yearRaw) {
      errors.push({
        code: 'REQUIRED_FIELD',
        row: line,
        message: 'year is required and cannot be empty.'
      });
    }

    const rank = Number(rankRaw);
    if (!/^\d+$/.test(rankRaw) || !Number.isInteger(rank) || rank < 1 || rank > CSV_MAX_ITEMS) {
      errors.push({
        code: 'INVALID_RANK',
        row: line,
        message: `rank must be an integer from 1 to ${CSV_MAX_ITEMS} (found: "${rankRaw || '(empty)'}").`
      });
    } else if (seenRanks.has(rank)) {
      errors.push({
        code: 'INVALID_RANK',
        row: line,
        message: `Duplicate rank ${rank} (also used on row ${seenRanks.get(rank)}).`
      });
    } else {
      seenRanks.set(rank, line);
    }

    if (yearRaw) {
      const yearNum = Number(yearRaw);
      if (!/^\d{4}$/.test(yearRaw) || !Number.isInteger(yearNum)) {
        errors.push({
          code: 'INVALID_YEAR',
          row: line,
          message: `year must be a 4-digit number (found: "${yearRaw}").`
        });
      } else if (yearNum < CSV_MIN_YEAR || yearNum > maxYear) {
        errors.push({
          code: 'INVALID_YEAR',
          row: line,
          message: `year must be between ${CSV_MIN_YEAR} and ${maxYear} (found: ${yearRaw}).`
        });
      }
    }

    items.push({
      rank: Number.isInteger(rank) ? rank : rankRaw,
      title,
      genre,
      year: yearRaw
    });
  });

  // Ranks must be exactly 1..N with no gaps (N = data row count)
  if (errors.length === 0) {
    const n = dataRows.length;
    for (let r = 1; r <= n; r++) {
      if (!seenRanks.has(r)) {
        errors.push({
          code: 'INVALID_RANK',
          row: null,
          message: `Ranks must be 1 through ${n} with no gaps. Missing rank ${r}.`
        });
      }
    }
  }

  if (errors.length) {
    return { ok: false, errors };
  }

  items.sort((a, b) => a.rank - b.rank);
  return { ok: true, items };
}

function showCsvImportResult({ ok, category, summary, items = [], errors = [] }) {
  const label = SHARE_CATEGORY_LABELS[category] || category;
  document.getElementById('csvImportModalLabel').textContent = `CSV import — ${label}`;
  document.getElementById('csv-import-summary').textContent = summary;

  const previewWrap = document.getElementById('csv-import-preview-wrap');
  const previewList = document.getElementById('csv-import-preview');
  const errorsWrap = document.getElementById('csv-import-errors-wrap');
  const errorsList = document.getElementById('csv-import-errors');
  const confirmBtn = document.getElementById('csv-import-confirm-btn');

  if (ok && items.length) {
    previewWrap.hidden = false;
    previewList.innerHTML = items
      .map(
        (item) =>
          `<li><strong>#${escapeHtml(item.rank)}</strong> ${escapeHtml(item.title)} ` +
          `<span class="text-secondary">(${escapeHtml(item.year)} · ${escapeHtml(item.genre)})</span></li>`
      )
      .join('');
    confirmBtn.hidden = false;
    confirmBtn.disabled = false;
    confirmBtn.textContent = 'Replace list';
  } else {
    previewWrap.hidden = true;
    previewList.innerHTML = '';
    confirmBtn.hidden = true;
    pendingCsvImport = null;
  }

  if (!ok && errors.length) {
    errorsWrap.hidden = false;
    errorsList.innerHTML = errors
      .map((err) => {
        const rowPart = err.row != null ? `Row ${escapeHtml(err.row)}` : 'File';
        return `<li><code>${escapeHtml(err.code)}</code> — ${rowPart}: ${escapeHtml(err.message)}</li>`;
      })
      .join('');
  } else {
    errorsWrap.hidden = true;
    errorsList.innerHTML = '';
  }

  const modalEl = document.getElementById('csvImportModal');
  bootstrap.Modal.getOrCreateInstance(modalEl).show();
}

async function applyPendingCsvImport() {
  if (!pendingCsvImport) return;

  const { category, items } = pendingCsvImport;
  const confirmBtn = document.getElementById('csv-import-confirm-btn');
  const summaryEl = document.getElementById('csv-import-summary');
  const reload = getListReload(category);

  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Importing…';
  }
  if (summaryEl) {
    summaryEl.textContent = 'Replacing list…';
  }

  try {
    // Snapshot current ids first (list arrays may be stale only if user edited in another tab)
    const existing = [...getListData(category)];

    for (const item of existing) {
      const response = await apiFetch(`/${category}/${item.id}`, { method: 'DELETE' });
      if (!response.ok && response.status !== 404) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Failed to delete existing item (id ${item.id}).`);
      }
    }

    // Create in rank order so assigned ranks match CSV 1..n
    const sorted = [...items].sort((a, b) => a.rank - b.rank);
    for (const item of sorted) {
      const response = await apiFetch(`/${category}`, {
        method: 'POST',
        body: JSON.stringify({
          title: item.title,
          genre: item.genre,
          year: item.year
        })
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Failed to create "${item.title}".`);
      }
    }

    pendingCsvImport = null;
    if (reload) await reload();

    if (summaryEl) {
      summaryEl.textContent = `Import complete. Your ${SHARE_CATEGORY_LABELS[category] || category} list now has ${sorted.length} item(s).`;
    }
    document.getElementById('csv-import-preview-wrap').hidden = true;
    if (confirmBtn) {
      confirmBtn.hidden = true;
      confirmBtn.textContent = 'Replace list';
    }
  } catch (error) {
    console.error('CSV import apply failed:', error);
    if (summaryEl) {
      summaryEl.textContent =
        'Import failed partway through. Your list may be incomplete — reload and try again, or re-import a valid file.';
    }
    document.getElementById('csv-import-errors-wrap').hidden = false;
    document.getElementById('csv-import-errors').innerHTML =
      `<li><code>APPLY_ERROR</code> — ${escapeHtml(error.message || 'Unknown error')}</li>`;
    if (reload) await reload();
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.textContent = 'Replace list';
    }
  }
}
