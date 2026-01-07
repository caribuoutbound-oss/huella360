import { supabaseLogin, searchPedidos } from './supabaseClient.js';

/* =========================
   ESTADO GLOBAL
========================= */
let currentUser = { nombre: 'Visitante' };
let searchResults = [];
let isLoading = false;

/* =========================
   HELPERS
========================= */
function resetState() {
  searchResults = [];
  isLoading = false;
}

function render(html) {
  document.getElementById('root').innerHTML = html;
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function maskName(name) {
  if (!name) return '—';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase() + '•'.repeat(Math.max(0, parts[0].length - 1));
  }
  const firstName = parts[0];
  const lastName = parts.slice(1).join(' ');
  const maskedLastName = lastName.charAt(0).toUpperCase() + '•'.repeat(Math.max(0, lastName.length - 1));
  return `${firstName} ${maskedLastName}`;
}

function maskPhone(phone) {
  if (!phone && phone !== 0) return '—';
  const cleaned = phone.toString().replace(/\D/g, '');
  if (cleaned.length === 0) return '—';
  if (cleaned.length <= 4) {
    return '•'.repeat(cleaned.length);
  }
  const first = cleaned.substring(0, 3);
  const last = cleaned.length >= 5 ? cleaned.slice(-2) : '';
  const middleLength = cleaned.length - first.length - last.length;
  const middle = '•'.repeat(Math.max(0, middleLength));
  return first + middle + last;
}

/* =========================
   THEME FUNCTIONS
========================= */
window.toggleTheme = () => {
  const html = document.documentElement;
  const currentTheme = html.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
};

function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
}

function createThemeToggle() {
  if (document.getElementById('theme-toggle')) return;

  const toggleHTML = `
    <div id="theme-toggle" class="theme-toggle">
      <button class="theme-toggle-btn" onclick="toggleTheme()" aria-label="Cambiar tema">
        <svg class="theme-icon sun sun-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="5" fill="currentColor"/>
          <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1m15.364-6.636l-4.243 4.243m-6 0L1.878 5.636m14.485 12.728l-4.243-4.243m-6 0l-4.243 4.243" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <svg class="theme-icon moon moon-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor"/>
        </svg>
      </button>
    </div>
  `;

  document.body.insertAdjacentHTML('afterbegin', toggleHTML);
}

/* =========================
   HOME PAGE
========================= */
function HomePage() {
  const rows = searchResults.map((r, idx) => `
    <tr style="animation-delay: ${idx * 0.05}s">
      <td class="px-4 py-3.5">
        <div class="flex items-center gap-2">
          <span class="badge badge-info">#${r.order_id}</span>
        </div>
      </td>
      <td class="px-4 py-3.5">
        <div class="font-medium" style="color: var(--text-secondary)">${maskName(r.nombrecliente)}</div>
      </td>
      <td class="px-4 py-3.5 text-sm" style="color: var(--text-secondary)">${maskPhone(r.numerotelefonico)}</td>
      <td class="px-4 py-3.5">
        <div class="badge badge-danger mb-1">${r.motivorechazo}</div>
        ${r.submotivorechazo ? `<div class="text-xs mt-1" style="color: var(--text-muted)">${r.submotivorechazo}</div>` : ''}
      </td>
      <td class="px-4 py-3.5 text-xs" style="color: var(--text-secondary)">${formatDate(r.fechatomapedido)}</td>
    </tr>
  `).join('');

  return `
    <div class="w-full max-w-7xl mx-auto animate-fadeIn">
      <div class="glass-effect card-shadow p-8 rounded-2xl">
        <!-- Header -->
        <div class="header-section flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 class="text-2xl font-bold mb-1" style="color: var(--text-primary)">Panel de Pedidos</h1>
            <p class="text-sm" style="color: var(--text-muted)">Búsqueda y gestión de pedidos rechazados</p>
          </div>
        </div>

        <!-- Search Bar -->
        <div class="search-container mt-6 flex gap-3 flex-wrap">
          <div class="relative flex-1 min-w-[250px]">
            <svg class="search-icon absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style="color: var(--text-muted)" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              id="searchInput"
              placeholder="Buscar por DNI o número de orden..."
              class="w-full pl-10 p-3.5 border input-modern search-input rounded-xl text-sm"
            />
          </div>
          <button
            onclick="doSearch()"
            class="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3.5 rounded-xl font-semibold text-sm btn-primary whitespace-nowrap"
          >
            🔍 Buscar
          </button>
        </div>

        <!-- Results -->
        ${
          isLoading
            ? `
              <div class="text-center py-16">
                <div class="spinner mx-auto mb-4"></div>
                <p class="text-sm font-medium" style="color: var(--text-muted)">Buscando pedidos...</p>
                <p class="text-xs mt-1" style="color: var(--text-muted); opacity: 0.7">Esto puede tomar unos segundos</p>
              </div>
            `
            : `
              <div class="overflow-x-auto rounded-xl mt-6" style="border: 1px solid var(--border-color)">
                <table class="table-modern w-full">
                  <thead>
                    <tr>
                      <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary)">Nº Pedido</th>
                      <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary)">Cliente</th>
                      <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary)">Teléfono</th>
                      <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary)">Motivo de Rechazo</th>
                      <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary)">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${
                      rows || 
                      `<tr>
                        <td colspan="5">
                          <div class="empty-state py-12 text-center">
                            <svg class="mx-auto w-10 h-10" style="color: var(--text-muted)" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p class="font-medium mb-1 mt-3" style="color: var(--text-secondary)">No se encontraron resultados</p>
                            <p class="text-xs" style="color: var(--text-muted)">Intenta con otro DNI o número de orden</p>
                          </div>
                        </td>
                      </tr>`
                    }
                  </tbody>
                </table>
              </div>

              ${searchResults.length > 0 ? `
                <div class="mt-4 flex items-center justify-between text-xs px-2" style="color: var(--text-muted)">
                  <span>
                    Mostrando <span class="font-semibold" style="color: var(--text-secondary)">${searchResults.length}</span> resultado${searchResults.length !== 1 ? 's' : ''}
                  </span>
                  <span>Última búsqueda: ${new Date().toLocaleTimeString('es-ES')}</span>
                </div>
              ` : ''}
            `
        }
      </div>
    </div>
  `;
}

/* =========================
   EVENTOS
========================= */
window.doSearch = async () => {
  const q = document.getElementById('searchInput').value.trim();
  if (!q) {
    alert('Por favor ingresa un DNI o número de orden');
    return;
  }

  isLoading = true;
  render(HomePage());

  try {
    searchResults = await searchPedidos(q);
  } catch (error) {
    console.error('Error en búsqueda:', error);
    searchResults = [];
  }

  isLoading = false;
  render(HomePage());
};

/* =========================
   INIT
========================= */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  createThemeToggle(); // 👈 Inserta el botón fijo en el body (fuera del layout)
  render(HomePage());

  document.addEventListener('keypress', e => {
    if (e.target.id === 'searchInput' && e.key === 'Enter') {
      window.doSearch();
    }
  });

  // Respetar cambios del sistema si no hay preferencia guardada
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
      document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
    }
  });
});
