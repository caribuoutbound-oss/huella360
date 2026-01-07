import { supabaseLogin, searchPedidos } from './supabaseClient.js';

/* =========================
   ESTADO GLOBAL
========================= */
let currentUser = { nombre: 'Visitante' }; // Simulación de usuario para evitar errores
let searchResults = [];
let isLoading = false;

/* =========================
   MODO OSCURO
========================= */
function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const newTheme = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
}

function createThemeToggle() {
  if (document.getElementById('theme-toggle')) return;

  const toggle = document.createElement('div');
  toggle.id = 'theme-toggle';
  toggle.className = 'theme-toggle';
  toggle.innerHTML = `
    <button class="theme-toggle-btn" aria-label="Alternar modo claro/oscuro">
      <svg class="theme-icon sun" viewBox="0 0 24 24" aria-hidden="true">
        <path class="sun-icon" d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06L16.5 6.44l-1.334-1.334a.75.75 0 00-1.06 1.06l1.333 1.334-1.333 1.334a.75.75 0 101.06 1.06L16.5 9.56l1.334 1.334a.75.75 0 001.06-1.06L17.56 8.5l1.334-1.334z" />
      </svg>
      <svg class="theme-icon moon" viewBox="0 0 24 24" aria-hidden="true">
        <path class="moon-icon" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" />
      </svg>
    </button>
  `;

  toggle.querySelector('button').addEventListener('click', toggleTheme);
  document.body.appendChild(toggle);
}

// Inicializar tema inmediatamente
initTheme();

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
   HOME PAGE (sin login)
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
        <div class="font-medium text-slate-700">${maskName(r.nombrecliente)}</div>
      </td>
      <td class="px-4 py-3.5 text-slate-600 text-sm">${maskPhone(r.numerotelefonico)}</td>
      <td class="px-4 py-3.5">
        <div class="badge badge-danger mb-1">${r.motivorechazo}</div>
        ${r.submotivorechazo ? `<div class="text-xs text-slate-500 mt-1">${r.submotivorechazo}</div>` : ''}
      </td>
      <td class="px-4 py-3.5 text-slate-600 text-xs">${formatDate(r.fechatomapedido)}</td>
    </tr>
  `).join('');

  return `
    <div class="w-full max-w-7xl mx-auto animate-fadeIn">
      <div class="glass-effect card-shadow p-8 rounded-2xl">
        <div class="header-section flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 class="text-2xl font-bold text-slate-800 mb-1">Panel de Pedidos</h1>
            <p class="text-sm text-slate-500">Búsqueda y gestión de pedidos rechazados</p>
          </div>
        </div>

        <div class="search-container mt-6 flex gap-3 flex-wrap">
          <div class="relative flex-1 min-w-[250px]">
            <svg class="search-icon absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              id="searchInput"
              placeholder="Buscar por DNI o número de orden..."
              class="w-full pl-10 p-3.5 border input-modern search-input rounded-xl text-sm bg-white"
            />
          </div>
          <button
            onclick="doSearch()"
            class="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3.5 rounded-xl font-semibold text-sm btn-primary whitespace-nowrap"
          >
            🔍 Buscar
          </button>
        </div>

        ${
          isLoading
            ? `
              <div class="text-center py-16">
                <div class="spinner mx-auto mb-4"></div>
                <p class="text-sm text-slate-500 font-medium">Buscando pedidos...</p>
                <p class="text-xs text-slate-400 mt-1">Esto puede tomar unos segundos</p>
              </div>
            `
            : `
              <div class="overflow-x-auto rounded-xl border border-slate-200 mt-6">
                <table class="table-modern w-full">
                  <thead>
                    <tr>
                      <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Nº Pedido</th>
                      <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Cliente</th>
                      <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Teléfono</th>
                      <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Motivo de Rechazo</th>
                      <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${
                      rows || 
                      `<tr>
                        <td colspan="5">
                          <div class="empty-state py-12 text-center">
                            <svg class="mx-auto w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p class="font-medium text-slate-600 mb-1 mt-3">No se encontraron resultados</p>
                            <p class="text-xs text-slate-400">Intenta con otro DNI o número de orden</p>
                          </div>
                        </td>
                      </tr>`
                    }
                  </tbody>
                </table>
              </div>

              ${searchResults.length > 0 ? `
                <div class="mt-4 flex items-center justify-between text-xs text-slate-500 px-2">
                  <span>
                    Mostrando <span class="font-semibold text-slate-700">${searchResults.length}</span> resultado${searchResults.length !== 1 ? 's' : ''}
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
  render(HomePage());
  createThemeToggle(); // 👈 Inserta el botón de modo oscuro

  document.addEventListener('keypress', e => {
    if (e.target.id === 'searchInput' && e.key === 'Enter') {
      window.doSearch();
    }
  });
});
