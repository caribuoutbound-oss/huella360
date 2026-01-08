import { supabaseLogin, searchPedidos } from './supabaseClient.js';

/* =========================
   ESTADO GLOBAL
========================= */
let currentUser = { nombre: 'Visitante' };
let searchResults = [];
let isLoading = false;
let lastQuery = '';

/* =========================
   HELPERS
========================= */
function resetState() {
  searchResults = [];
  isLoading = false;
  lastQuery = '';
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
    <style>
      @keyframes neonGlow {
        0%, 100% {
          box-shadow: 
            0 0 5px rgba(59, 130, 246, 0.5),
            0 0 10px rgba(59, 130, 246, 0.4),
            0 0 20px rgba(59, 130, 246, 0.3),
            inset 0 0 10px rgba(59, 130, 246, 0.2);
          border-color: rgba(59, 130, 246, 0.8);
        }
        50% {
          box-shadow: 
            0 0 10px rgba(147, 51, 234, 0.6),
            0 0 20px rgba(147, 51, 234, 0.5),
            0 0 30px rgba(147, 51, 234, 0.4),
            inset 0 0 15px rgba(147, 51, 234, 0.3);
          border-color: rgba(147, 51, 234, 0.9);
        }
      }

      @keyframes textShine {
        0%, 100% {
          color: #60a5fa;
          text-shadow: 0 0 8px rgba(96, 165, 250, 0.8);
        }
        50% {
          color: #a78bfa;
          text-shadow: 0 0 12px rgba(167, 139, 250, 0.9);
        }
      }

      @keyframes iconPulse {
        0%, 100% {
          transform: scale(1);
          filter: drop-shadow(0 0 4px rgba(59, 130, 246, 0.6));
        }
        50% {
          transform: scale(1.1);
          filter: drop-shadow(0 0 8px rgba(147, 51, 234, 0.8));
        }
      }

      .neon-alert-container {
        position: relative;
        display: inline-block;
        margin-top: 12px;
        max-width: 100%;
      }

      .neon-alert {
        position: relative;
        padding: 12px 16px 12px 44px;
        border-radius: 10px;
        border: 2px solid rgba(59, 130, 246, 0.8);
        background: linear-gradient(
          135deg,
          rgba(59, 130, 246, 0.1) 0%,
          rgba(147, 51, 234, 0.1) 100%
        );
        backdrop-filter: blur(10px);
        animation: neonGlow 2s ease-in-out infinite;
        font-size: 13px;
        font-weight: 600;
        line-height: 1.5;
        color: #60a5fa;
        text-shadow: 0 0 8px rgba(96, 165, 250, 0.8);
        animation: neonGlow 2s ease-in-out infinite, textShine 2s ease-in-out infinite;
        overflow: hidden;
      }

      .neon-alert::before {
        content: '';
        position: absolute;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background: linear-gradient(
          45deg,
          transparent 30%,
          rgba(255, 255, 255, 0.1) 50%,
          transparent 70%
        );
        animation: shimmer 3s linear infinite;
      }

      @keyframes shimmer {
        0% {
          transform: translateX(-100%) translateY(-100%) rotate(45deg);
        }
        100% {
          transform: translateX(100%) translateY(100%) rotate(45deg);
        }
      }

      .neon-alert-icon {
        position: absolute;
        left: 14px;
        top: 50%;
        transform: translateY(-50%);
        width: 20px;
        height: 20px;
        animation: iconPulse 2s ease-in-out infinite;
      }

      .neon-alert-text {
        position: relative;
        z-index: 1;
      }

      @media (max-width: 640px) {
        .neon-alert {
          font-size: 12px;
          padding: 10px 14px 10px 40px;
        }
        .neon-alert-icon {
          width: 18px;
          height: 18px;
          left: 12px;
        }
      }
    </style>

    <div class="w-full max-w-7xl mx-auto animate-fadeIn">
      <div class="glass-effect card-shadow p-8 rounded-2xl">
        <!-- Header -->
        <div class="header-section flex justify-between items-start flex-wrap gap-4">
          <div>
            <h1 class="text-2xl font-bold mb-1" style="color: var(--text-primary)">Panel de Pedidos</h1>
            <p class="text-sm mb-3" style="color: var(--text-muted)">Búsqueda y gestión de pedidos rechazados</p>
            
            <!-- Alerta Neon Mejorada -->
            <div class="neon-alert-container">
              <div class="neon-alert">
                <svg class="neon-alert-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <div class="neon-alert-text">
                  Los documentos que comienzan con 0 deben ingresarse sin los ceros iniciales.
                </div>
              </div>
            </div>
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
              placeholder="Ingresa DNI o Nº de pedido"
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
                            <p class="text-xs" style="color: var(--text-muted)">Intenta con otro DNI o número de pedido</p>
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
  const input = document.getElementById('searchInput');
  const q = input.value.trim();

  if (!q) {
    alert('🔍 Por favor ingresa un DNI o número de pedido');
    input.focus();
    return;
  }

  if (!/^\d+$/.test(q)) {
    alert('🔍 Usa solo números: DNI (sin puntos) o número de pedido');
    input.select();
    return;
  }

  if (q.length < 3 || q.length > 12) {
    alert('🔍 El DNI o número de pedido debe tener entre 3 y 12 dígitos');
    input.select();
    return;
  }

  if (q === lastQuery) return;

  lastQuery = q;
  isLoading = true;
  render(HomePage());

  try {
    searchResults = await searchPedidos(q);
  } catch (error) {
    console.error('Error en búsqueda:', error);
    searchResults = [];
    alert('⚠️ No se pudieron cargar los pedidos. Verifica tu conexión e inténtalo nuevamente.');
  }

  isLoading = false;
  render(HomePage());
};

/* =========================
   INIT
========================= */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  createThemeToggle();
  render(HomePage());

  setTimeout(() => {
    const input = document.getElementById('searchInput');
    if (input) input.focus();
  }, 100);

  document.addEventListener('keypress', e => {
    if (e.target.id === 'searchInput' && e.key === 'Enter') {
      window.doSearch();
    }
  });

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
      document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
    }
  });
});
