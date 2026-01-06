import { supabaseLogin, searchPedidos } from './supabaseClient.js';

/* =========================
   ESTADO GLOBAL
========================= */
let currentUser = null;
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

/* =========================
   LOGIN PAGE
========================= */
function LoginPage() {
  return `
    <div class="w-full max-w-md mx-auto bg-white p-8 rounded-2xl shadow-xl animate-fadeIn">
      <h2 class="text-2xl font-bold text-center mb-6 text-gray-800">
        Acceso Interno
      </h2>

      <form id="loginForm" class="space-y-4">
        <input
          name="usuario"
          required
          placeholder="Usuario"
          class="w-full p-3 border rounded-xl"
        />

        <input
          name="contrasena"
          type="password"
          required
          placeholder="Contraseña"
          class="w-full p-3 border rounded-xl"
        />

        <button
          class="w-full bg-blue-600 text-white py-2 rounded-xl hover:bg-blue-700 transition"
        >
          Entrar
        </button>
      </form>
    </div>
  `;
}

/* =========================
   HOME PAGE
========================= */
function HomePage() {
  const rows = searchResults.map(r => `
    <tr class="result-card hover:bg-gray-50">
      <td class="px-4 py-3 font-semibold">#${r.order_id}</td>
      <td class="px-4 py-3">${r.nombrecliente}</td>
      <td class="px-4 py-3 text-red-600 font-medium">
        ${r.motivorechazo}
        <div class="text-xs text-gray-500">
          ${r.submotivorechazo || ''}
        </div>
      </td>
      <td class="px-4 py-3 text-gray-600">
        ${formatDate(r.fechatomapedido)}
      </td>
    </tr>
  `).join('');

  return `
    <div class="w-full max-w-6xl mx-auto bg-white p-6 rounded-2xl shadow-xl">
      
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-xl font-bold">
          Bienvenido, ${currentUser.nombre}
        </h1>
        <button
          onclick="logout()"
          class="text-red-600 text-sm hover:underline"
        >
          Salir
        </button>
      </div>

      <div class="flex gap-2 mb-6">
        <input
          id="searchInput"
          placeholder="DNI u ORDER_ID"
          class="flex-1 p-3 border rounded-xl"
        />
        <button
          onclick="doSearch()"
          class="bg-blue-600 text-white px-4 rounded-xl hover:bg-blue-700 transition"
        >
          Buscar
        </button>
      </div>

      ${
        isLoading
          ? `
            <div class="text-center py-12">
              <div class="spinner mx-auto mb-3"></div>
              <p class="text-sm text-gray-500">
                Buscando pedidos...
              </p>
            </div>
          `
          : `
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead class="bg-gray-100 text-xs uppercase">
                  <tr>
                    <th class="px-4 py-3 text-left">Pedido</th>
                    <th class="px-4 py-3 text-left">Cliente</th>
                    <th class="px-4 py-3 text-left">Motivo</th>
                    <th class="px-4 py-3 text-left">Fecha</th>
                  </tr>
                </thead>
                <tbody class="divide-y">
                  ${
                    rows ||
                    `<tr>
                      <td colspan="4" class="empty-state text-center py-8 text-gray-500">
                        Sin resultados
                      </td>
                    </tr>`
                  }
                </tbody>
              </table>
            </div>
          `
      }
    </div>
  `;
}

/* =========================
   EVENTOS
========================= */
window.doSearch = async () => {
  const q = document.getElementById('searchInput').value.trim();
  if (!q) return;

  isLoading = true;
  render(HomePage());

  searchResults = await searchPedidos(q);

  isLoading = false;
  render(HomePage());
};

window.logout = () => {
  currentUser = null;
  resetState();
  render(LoginPage());
};

/* =========================
   INIT
========================= */
document.addEventListener('DOMContentLoaded', () => {
  render(LoginPage());

  document.addEventListener('submit', async e => {
    if (e.target.id === 'loginForm') {
      e.preventDefault();

      const { usuario, contrasena } = e.target;
      const user = await supabaseLogin(
        usuario.value,
        contrasena.value
      );

      if (user) {
        currentUser = user;
        resetState();
        render(HomePage());
      } else {
        alert('Credenciales incorrectas');
      }
    }
  });
});
