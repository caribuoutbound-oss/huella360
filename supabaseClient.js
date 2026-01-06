// supabaseClient.js
const supabaseUrl = 'https://jeefaqsbkjrudjxnouwf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImplZWZhcXNia2pydWRqeG5vdXdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MjUwODIsImV4cCI6MjA4MzIwMTA4Mn0.FZbjJCpcO3TmFSrs85cz4HrGDazYwoVpPTLWzYxpU8A';

// Cliente ligero (sin @supabase/supabase-js)
async function supabaseFetch(table, options = {}) {
  const { select = '*', eq = {}, or = '', order = null, limit = null } = options;
  
  let url = `${supabaseUrl}/rest/v1/${table}?select=${encodeURIComponent(select)}`;
  
  for (const [key, value] of Object.entries(eq)) {
    url += `&${encodeURIComponent(key)}=eq.${encodeURIComponent(value)}`;
  }
  
  if (or) url += `&or=${encodeURIComponent(or)}`;
  if (order) url += `&order=${encodeURIComponent(order)}`;
  if (limit) url += `&limit=${limit}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`
    }
  });
  
  return await response.json();
}

export async function supabaseLogin(usuario, contrasena) {
  const data = await supabaseFetch('usuarios', {
    eq: { usuario, contrasena, estado: 'Activo' }
  });
  return Array.isArray(data) && data.length > 0 ? data[0] : null;
}

export async function searchPedidos(query) {
  const data = await supabaseFetch('pedidos', {
    or: `(numerodocumento.eq.${query},order_id.eq.${query})`,
    order: 'fechatomapedido.desc',
    limit: 20
  });
  return Array.isArray(data) ? data : [];
}

