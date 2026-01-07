import { supabaseLogin, searchPedidos } from './supabaseClient.js';

/* =========================
   ESTADO GLOBAL
========================= */
// Simulamos un usuario genérico para evitar errores en HomePage()
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
   LOGIN PAGE (COMENTADA - NO SE USA ACTUALMENTE)
========================= */
/*
function LoginPage() {
  return `
    <div class="w-full max-w-md mx-auto login-container">
      <div class="glass-effect card-shadow p-10 rounded-2xl">
        <div class="login-header">
          <div class="login-icon">🔐</div>
          <h2 class="login-title">Acceso al Sistema</h2>
          <p class="login-subtitle">Ingresa tus credenciales para continuar</p>
        </div>
        <form id="loginForm" class="space-y-5">
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Usuario</label>
            <input name="usuario" required placeholder="Ingresa tu usuario" class="w-full p-3.5 border input-modern rounded-xl text-sm bg-white" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Contraseña</label>
            <input name="contrasena" type="password" required placeholder="••••••••" class="w-full p-3.5 border input-modern rounded-xl text-sm bg-white" />
          </div>
          <button type="submit" class="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3.5 rounded-xl font-semibold text-sm btn-primary mt-6">
            Iniciar Sesión
          </button>
        </form>
        <div class="mt-6 pt-6 border-t border-slate-200 text-center">
          <p class="text-xs text-slate-500">Sistema Interno de Gestión de Pedidos</p>
        </div>
      </div>
    </div>
  `;
}
*/

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
        <!-- Header -->
        <div class="header-section flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 class="text-2xl font-bold text-slate-800 mb-1">Panel de Pedidos</h1>
            <p class="text-sm text-slate-500">Búsqueda y gestión de pedidos rechazados</p>
          </div>
          <!-- Botón de cierre de sesión eliminado (no hay login) -->
        </div>

        <!-- Search Bar -->
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

        <!-- Results -->
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

/*
// Función de logout comentada (no usada)
window.logout = () => {
  if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
    currentUser = null;
    resetState();
    render(LoginPage());
  }
};
*/

/* =========================
   INIT - ARRANQUE DIRECTO EN HOME
========================= */
document.addEventListener('DOMContentLoaded', () => {
  // Renderizamos directamente la página de búsqueda
  render(HomePage());

  // Evento de tecla Enter en el buscador
  document.addEventListener('keypress', e => {
    if (e.target.id === 'searchInput' && e.key === 'Enter') {
      window.doSearch();
    }
  });

  /*
  // Lógica de login comentada
  document.addEventListener('submit', async e => {
    if (e.target.id === 'loginForm') {
      e.preventDefault();
      // ... lógica de login ...
    }
  });
  */
});
