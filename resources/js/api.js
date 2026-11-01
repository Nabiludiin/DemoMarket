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
  if (res.status === 401 && auth.token) { auth.keluar(); window.location.href = '/login'; }
  if (res.status === 429) throw new Error('Terlalu banyak percobaan. Tunggu satu menit lalu coba lagi.');
  if (!res.ok) throw new Error(data.message || 'Terjadi kesalahan. Coba lagi.');
  return data;
}

export async function keluar() {
  await api('/logout', 'POST').catch(() => {});
  auth.keluar();
  window.location.href = '/login';
}

export const rp = (n) => 'Rp' + Math.abs(Number(n || 0)).toLocaleString('id-ID');

export const rpTanda = (n) => (Number(n) > 0 ? '+' : Number(n) < 0 ? '−' : '') + rp(n);

export const LABEL_TIPE = {
  modal: 'Modal dari BPA',
  topup: 'Top up dari BPA',
  penjualan: 'Penjualan QRIS',
  biaya: 'Biaya QRIS',
  pengembalian: 'Pengembalian modal',
  withdraw: 'Penarikan saldo',
};

export const jam = (t) => new Date(t).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

export const tanggal = (t) => new Date(t).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

export function hari(t) {
  const d = new Date(t), kini = new Date(), kemarin = new Date();
  kemarin.setDate(kini.getDate() - 1);
  if (d.toDateString() === kini.toDateString()) return 'Hari ini';
  if (d.toDateString() === kemarin.toDateString()) return 'Kemarin';
  return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });
}
