export const auth = {
  get token() { return localStorage.getItem('token'); },
  get role() { return localStorage.getItem('role'); },
  get nama() { return localStorage.getItem('nama'); },
  simpan(d) {
    localStorage.setItem('token', d.token);
    localStorage.setItem('role', d.role);
    localStorage.setItem('nama', d.nama);
  },
  keluar() { localStorage.clear(); },
};

export async function api(path, method = 'GET', body) {
  const res = await fetch('/api' + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(auth.token ? { Authorization: 'Bearer ' + auth.token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) { auth.keluar(); window.location.href = '/'; }
  if (!res.ok) throw new Error(data.message || 'Terjadi kesalahan');
  return data;
}

export const rp = (n) => 'Rp' + Number(n || 0).toLocaleString('id-ID');