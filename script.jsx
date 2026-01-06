// script.jsx
import { supabaseLogin, searchPedidos } from './supabaseClient.js';

// Estado global (simulado)
let currentUser = null;
let searchResults = [];
let isLoading = false;

// Render functions
function render(element) {
  document.getElementById('root').innerHTML = element;
}

function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Componentes
function LoginPage() {
  return `
    <div class="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
      <h2 class="text-2xl font-bold text-center mb-6 text-gray-800">Acceso Interno</h2>
      <form id="loginForm" class="space-y-4">
        <input type="text" name="usuario" placeholder="Usuario" class="w-full px-4 py-2 border border-gray-300 rounded-lg" required />
        <input type="password" name="contrasena" placeholder="Contraseña" class="w-full px-4 py-2 border border-gray-300 rounded-lg" required />
        <button type="submit" class="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition">Entrar</button>
      </form>
    </div>
  `;
}

function HomePage() {
  const resultsHtml = searchResults.map(row => `
    <tr class="hover:bg-gray-50">
      <td class="px-4 py-3 text-sm font-medium">${row.pedido}</td>
      <td class="px-4 py-3 text-sm">${row.nombrecliente}</td>
      <td class="px-4 py-3 text-sm">
        ${row.motivorechazo}<br>
        <span class="text-xs text-gray-500">${row.submotivorechazo || ''}</span>
      </td>
      <td class="px-4 py-3 text-sm">${formatDate(row.fechatomapedido)}</td>
    </tr>
  `).join('');

  return `
    <div class="w-full max-w-6xl mx-auto p-4">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-xl font-bold text-gray-800">Bienvenido, ${currentUser.nombre}</h1>
        <button onclick="logout()" class="text-sm text-red-600 hover:underline">Salir</button>
      </div>
      
      <div class="flex gap-2 mb-6">
        <input id="searchInput" type="text" placeholder="Buscar por DNI o ORDER_ID" class="flex-1 px-4 py-2 border border-gray-300 rounded-lg" />
        <button onclick="doSearch()" class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">Buscar</button>
      </div>

      ${isLoading ? `
        <div class="text-center py-12">
          <div class="spinner mx-auto"></div>
        </div>
      ` : `
        <div class="overflow-x-auto bg-white rounded-lg shadow">
          <table class="min-w-full">
            <thead class="bg-gray-100">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pedido</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Motivo</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              ${resultsHtml || '<tr><td colspan="4" class="px-4 py-8 text-center text-gray-500">No se encontraron resultados</td></tr>'}
            </tbody>
          </table>
        </div>
      `}
    </div>
  `;
}

// Event handlers
window.handleLogin = async (e) => {
  e.preventDefault();
  const form = e.target;
  const usuario = form.usuario.value;
  const contrasena = form.contrasena.value;
  
  const user = await supabaseLogin(usuario, contrasena);
  if (user) {
    currentUser = user;
    render(HomePage());
  } else {
    alert('Usuario o contraseña incorrectos');
  }
};

window.doSearch = async () => {
  const query = document.getElementById('searchInput').value.trim();
  if (!query) return;
  
  isLoading = true;
  render(HomePage());
  searchResults = await searchPedidos(query);
  isLoading = false;
  render(HomePage());
};

window.logout = () => {
  currentUser = null;
  render(LoginPage());
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  render(LoginPage());
  
  // Bind events after render
  document.addEventListener('submit', (e) => {
    if (e.target.id === 'loginForm') {
      window.handleLogin(e);
    }
  });
});
