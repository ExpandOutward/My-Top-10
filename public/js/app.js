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
