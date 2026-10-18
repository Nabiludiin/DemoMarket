import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, auth, rp } from '../api';

export default function Admin() {
  const [tab, setTab] = useState('kelas');
  const [kelasId, setKelasId] = useState(null);
  const nav = useNavigate();
  const keluar = () => { auth.keluar(); nav('/'); };

  return (
    <div className="wrap">
      <header className="atas">
        <h1>Admin BPA</h1>
        <button className="btn alt" onClick={keluar}>Keluar</button>
      </header>
      <nav className="tabs">
        <button className={tab === 'kelas' ? 'on' : ''} onClick={() => { setTab('kelas'); setKelasId(null); }}>Kelas</button>
        <button className={tab === 'laporan' ? 'on' : ''} onClick={() => setTab('laporan')}>Laporan</button>
        <button className={tab === 'notif' ? 'on' : ''} onClick={() => setTab('notif')}>Notifikasi</button>
      </nav>
      {tab === 'laporan' && <Laporan />}
      {tab === 'kelas' && (kelasId
        ? <KelasDetail id={kelasId} kembali={() => setKelasId(null)} />
        : <DaftarKelas buka={setKelasId} />)}
    </div>
  );
}

function Laporan() {
  const [d, setD] = useState(null);
  useEffect(() => { api('/admin/laporan').then(setD); }, []);
  if (!d) return <p>Memuat...</p>;
  const item = [
    ['Modal tersalur', d.modal_tersalur], ['Penjualan QRIS', d.penjualan], ['Biaya Midtrans', d.biaya_midtrans],
    ['Penjualan bersih (setelah biaya Midtrans)', d.laba_kotor],
    ['Saldo semua kelompok', d.saldo_semua],
  ];
  return (
    <div className="grid">
      {item.map(([n, v]) => <div className="kartu" key={n}><small>{n}</small><b>{rp(v)}</b></div>)}
    </div>
  );
}

function DaftarKelas({ buka }) {
  const [kelas, setKelas] = useState([]);
  const [dosen, setDosen] = useState([]);
  const [nd, setNd] = useState('');
  const [nk, setNk] = useState({ nama: '', dosen_id: '' });
  const [pesan, setPesan] = useState('');

  const muat = () => { api('/admin/kelas').then(setKelas); api('/admin/dosen').then(setDosen); };
  useEffect(() => { muat(); }, []);

  async function kirim(e, path, body, reset) {
    e.preventDefault();
    setPesan('');
    try { await api(path, 'POST', body); reset(); muat(); } catch (x) { setPesan(x.message); }
  }

  return (
    <div>
      {pesan && <p className="err">{pesan}</p>}
      <div className="grid2">
        <div className="kartu">
          <h2>Tambah kelas</h2>
          <form className="baris" onSubmit={(e) => kirim(e, '/admin/kelas', { nama: nk.nama, dosen_id: nk.dosen_id || null }, () => setNk({ nama: '', dosen_id: '' }))}>
            <input required placeholder="Nama kelas" value={nk.nama} onChange={(e) => setNk({ ...nk, nama: e.target.value })} />
            <select value={nk.dosen_id} onChange={(e) => setNk({ ...nk, dosen_id: e.target.value })}>
              <option value="">Dosen pengampu</option>
              {dosen.map((d) => <option key={d.id} value={d.id}>{d.nama}</option>)}
            </select>
            <button className="btn">Tambah kelas</button>
          </form>
        </div>
        <div className="kartu">
          <h2>Tambah dosen pengampu</h2>
          <form className="baris" onSubmit={(e) => kirim(e, '/admin/dosen', { nama: nd }, () => setNd(''))}>
            <input required placeholder="Nama dosen" value={nd} onChange={(e) => setNd(e.target.value)} />
            <button className="btn">Tambah dosen</button>
          </form>
          <p className="kecil">{dosen.map((d) => d.nama).join(', ') || 'Belum ada dosen'}</p>
        </div>
      </div>

      <div className="panel">
        <h2>Daftar kelas</h2>
        <div className="scroll">
          <table>
            <thead><tr><th>Kelas</th><th>Dosen pengampu</th><th>Jumlah kelompok</th><th>Aksi</th></tr></thead>
            <tbody>
              {kelas.length === 0 && <tr><td colSpan="4" className="kecil">Belum ada kelas.</td></tr>}
              {kelas.map((k) => (
                <tr key={k.id}>
                  <td>{k.nama}</td>
                  <td>{k.dosen?.nama || '-'}</td>
                  <td>{k.kelompoks_count}</td>
                  <td><button className="btn sm" onClick={() => buka(k.id)}>Buka kelas</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KelasDetail({ id, kembali }) {
  const [kls, setKls] = useState(null);
  const [dosen, setDosen] = useState([]);
  const [hal, setHal] = useState(1);
  const [data, setData] = useState(null);
  const [pilih, setPilih] = useState(null);
  const [pesan, setPesan] = useState('');
  const [baru, setBaru] = useState({ nama: '', modal: '' });

  const muatKelas = () => api('/admin/kelas').then((l) => setKls(l.find((x) => x.id === id)));
  const muat = () => api(`/admin/kelompok?kelas_id=${id}&page=${hal}`).then(setData);
  useEffect(() => { muatKelas(); api('/admin/dosen').then(setDosen); }, [id]);
  useEffect(() => { muat(); }, [id, hal]);

  async function aksi(fn) {
    setPesan('');
    try { await fn(); await muat(); await muatKelas(); } catch (e) { setPesan(e.message); }
  }
  const gantiDosen = (v) => aksi(() => api(`/admin/kelas/${id}`, 'PUT', { dosen_id: v || null }));
  const tambah = (e) => {
    e.preventDefault();
    aksi(async () => {
      await api('/admin/kelompok', 'POST', { kelas_id: id, nama: baru.nama, modal: parseInt(baru.modal) || 0 });
      setBaru({ nama: '', modal: '' });
    });
  };
  const atur = (k) => {
    const v = prompt('Modal baru (Rp) untuk ' + k.nama, k.modal);
    if (v !== null) aksi(() => api(`/admin/kelompok/${k.id}/modal`, 'PUT', { modal: parseInt(v) || 0 }));
  };
  const topup = (k) => {
    const v = prompt('Jumlah top up (Rp) untuk ' + k.nama);
    if (v) aksi(() => api(`/admin/kelompok/${k.id}/topup`, 'POST', { jumlah: parseInt(v) || 0 }));
  };
  const cair = (k) => aksi(() => api(`/admin/kelompok/${k.id}/distribusi`, 'POST'));
  const semua = () =>
    confirm('Distribusikan modal ke semua kelompok di kelas ini yang belum menerima?') &&
    aksi(async () => {
      const r = await api('/admin/distribusi-semua', 'POST', { kelas_id: id });
      setPesan(r.kelompok_didanai + ' kelompok didanai');
    });

  if (!kls || !data) return <p>Memuat...</p>;
  return (
    <div>
      <div className="baris">
        <button onClick={kembali}>Kembali ke daftar kelas</button>
        <h2 style={{ margin: 0 }}>{kls.nama}</h2>
      </div>

      <div className="kartu">
        <div className="baris">
          <label>Dosen pengampu
            <select value={kls.dosen_id || ''} onChange={(e) => gantiDosen(e.target.value)}>
              <option value="">Belum ada</option>
              {dosen.map((d) => <option key={d.id} value={d.id}>{d.nama}</option>)}
            </select>
          </label>
          <span className="kecil">{kls.kelompoks_count} kelompok di kelas ini</span>
        </div>
      </div>

      <form className="baris" onSubmit={tambah}>
        <input required placeholder="Nama kelompok" value={baru.nama} onChange={(e) => setBaru({ ...baru, nama: e.target.value })} />
        <input type="number" placeholder="Modal (Rp)" value={baru.modal} onChange={(e) => setBaru({ ...baru, modal: e.target.value })} />
        <button className="btn">Tambah kelompok</button>
        <button type="button" className="btn gold" onClick={semua}>Distribusi modal ke semua di kelas ini</button>
      </form>
      {pesan && <p className="err">{pesan}</p>}

      <div className="scroll">
        <table>
          <thead><tr><th>Kelompok</th><th>Modal</th><th>Saldo</th><th>Status</th><th>Aksi</th></tr></thead>
          <tbody>
            {data.data.map((k) => (
              <tr key={k.id}>
                <td>{k.nama}</td>
                <td>{rp(k.modal)}</td>
                <td><b>{rp(k.saldo)}</b></td>
                <td>{k.modal_cair_at ? 'Modal cair' : 'Belum cair'}</td>
                <td className="aksi">
                  <button disabled={!!k.modal_cair_at} onClick={() => atur(k)}>Atur modal</button>
                  <button disabled={!!k.modal_cair_at || k.modal < 1} onClick={() => cair(k)}>Distribusi</button>
                  <button onClick={() => topup(k)}>Top up</button>
                  <button onClick={() => setPilih(k)}>Detail</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="baris">
        <button disabled={hal <= 1} onClick={() => setHal(hal - 1)}>Sebelumnya</button>
        <span>Halaman {data.current_page} dari {data.last_page}</span>
        <button disabled={hal >= data.last_page} onClick={() => setHal(hal + 1)}>Berikutnya</button>
      </div>
      {pilih && <Detail k={pilih} tutup={() => setPilih(null)} />}
    </div>
  );
}

function Detail({ k, tutup }) {
  const [d, setD] = useState(null);
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [pesan, setPesan] = useState('');
  useEffect(() => { api(`/admin/kelompok/${k.id}/riwayat`).then(setD); }, [k.id]);

  async function tambahAnggota(e) {
    e.preventDefault();
    setPesan('');
    try {
      await api(`/admin/kelompok/${k.id}/anggota`, 'POST', f);
      setF({ name: '', email: '', password: '' });
      setPesan('Anggota ditambahkan');
    } catch (x) { setPesan(x.message); }
  }

  return (
    <div className="panel">
      <div className="baris"><h2>{k.nama}</h2><button onClick={tutup}>Tutup</button></div>
      <p className="kecil">ID QRIS: {k.qris_id}</p>
      <form className="baris" onSubmit={tambahAnggota}>
        <input required placeholder="Nama mahasiswa" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <input required type="email" placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <input required type="password" placeholder="Kata sandi (min 6)" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
        <button className="btn">Tambah anggota</button>
      </form>
      {pesan && <p className="kecil">{pesan}</p>}
      <h3>Riwayat transaksi</h3>
      {!d ? <p>Memuat...</p> : (
        <div className="scroll">
          <table>
            <thead><tr><th>Waktu</th><th>Jenis</th><th>Jumlah</th><th>Saldo akhir</th></tr></thead>
            <tbody>
              {d.transaksi.data.length === 0 && <tr><td colSpan="4" className="kecil">Belum ada transaksi.</td></tr>}
              {d.transaksi.data.map((t) => (
                <tr key={t.id}>
                  <td>{new Date(t.created_at).toLocaleString('id-ID')}</td>
                  <td>{t.tipe}</td><td>{rp(t.jumlah)}</td><td>{rp(t.saldo_akhir)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
function Notifikasi() {
  const [list, setList] = useState(null);
  const [pesan, setPesan] = useState('');
  const [idk, setIdk] = useState({});
  const muat = () => api('/admin/notifikasi').then(setList);
  useEffect(() => { muat(); }, []);

  async function tetapkan(n) {
    setPesan('');
    try {
      await api(`/admin/notifikasi/${n.id}/tetapkan`, 'POST', { kelompok_id: parseInt(idk[n.id]) || 0 });
      muat();
    } catch (e) { setPesan(e.message); }
  }

  if (!list) return <p>Memuat...</p>;
  return (
    <div className="panel">
      <div className="baris"><h2>Notifikasi Midtrans terbaru</h2><button onClick={muat}>Muat ulang</button></div>
      <p className="kecil">Buka "Payload" pada pembayaran asli untuk melihat field yang berisi identifier QRIS. Pembayaran berstatus yatim belum dikenali kelompoknya.</p>
      {pesan && <p className="err">{pesan}</p>}
      <div className="scroll">
        <table>
          <thead><tr><th>Waktu</th><th>Status</th><th>Jumlah</th><th>Kelompok</th><th>Payload</th><th>Aksi</th></tr></thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan="6" className="kecil">Belum ada notifikasi.</td></tr>}
            {list.map((n) => (
              <tr key={n.id}>
                <td>{new Date(n.created_at).toLocaleString('id-ID')}</td>
                <td>{n.status}</td>
                <td>{rp(n.jumlah)}</td>
                <td>{n.kelompok_id || '-'}</td>
                <td><details><summary>Lihat</summary><pre style={{ maxWidth: 320, overflow: 'auto' }}>{JSON.stringify(n.payload, null, 2)}</pre></details></td>
                <td>
                  {n.status === 'yatim' && (
                    <span className="aksi">
                      <input style={{ width: 90 }} placeholder="ID kelompok" value={idk[n.id] || ''} onChange={(e) => setIdk({ ...idk, [n.id]: e.target.value })} />
                      <button onClick={() => tetapkan(n)}>Tetapkan</button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}