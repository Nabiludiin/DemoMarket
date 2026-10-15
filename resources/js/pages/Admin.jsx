import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, auth, rp } from '../api';

export default function Admin() {
  const [tab, setTab] = useState('kelompok');
  const nav = useNavigate();
  const keluar = () => { auth.keluar(); nav('/'); };
  const menu = [['laporan', 'Laporan'], ['kelompok', 'Kelompok'], ['kelas', 'Kelas dan dosen']];

  return (
    <div className="wrap">
      <header className="atas">
        <h1>Admin BPA</h1>
        <button className="btn alt" onClick={keluar}>Keluar</button>
      </header>
      <nav className="tabs">
        {menu.map(([k, n]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{n}</button>
        ))}
      </nav>
      {tab === 'laporan' && <Laporan />}
      {tab === 'kelompok' && <Kelompok />}
      {tab === 'kelas' && <KelasDosen />}
    </div>
  );
}

function Laporan() {
  const [d, setD] = useState(null);
  useEffect(() => { api('/admin/laporan').then(setD); }, []);
  if (!d) return <p>Memuat...</p>;
  const item = [
    ['Modal tersalur', d.modal_tersalur], ['Penjualan QRIS', d.penjualan], ['Biaya Midtrans', d.biaya_midtrans],
    ['Laba kotor', d.laba_kotor], ['Modal kembali', d.modal_kembali], ['Withdraw', d.withdraw],
    ['Saldo semua kelompok', d.saldo_semua],
  ];
  return (
    <div className="grid">
      {item.map(([n, v]) => <div className="kartu" key={n}><small>{n}</small><b>{rp(v)}</b></div>)}
    </div>
  );
}

function Kelompok() {
  const [hal, setHal] = useState(1);
  const [data, setData] = useState(null);
  const [kelas, setKelas] = useState([]);
  const [pilih, setPilih] = useState(null);
  const [pesan, setPesan] = useState('');
  const [baru, setBaru] = useState({ kelas_id: '', nama: '', modal: '' });

  const muat = () => api('/admin/kelompok?page=' + hal).then(setData);
  useEffect(() => { muat(); }, [hal]);
  useEffect(() => { api('/admin/kelas').then(setKelas); }, []);

  async function aksi(fn) {
    setPesan('');
    try { await fn(); await muat(); } catch (e) { setPesan(e.message); }
  }
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
    confirm('Distribusikan modal ke semua kelompok yang belum menerima?') &&
    aksi(async () => {
      const r = await api('/admin/distribusi-semua', 'POST');
      setPesan(r.kelompok_didanai + ' kelompok didanai');
    });
  const tambah = (e) => {
    e.preventDefault();
    aksi(async () => {
      await api('/admin/kelompok', 'POST', { ...baru, modal: parseInt(baru.modal) || 0 });
      setBaru({ kelas_id: '', nama: '', modal: '' });
    });
  };

  if (!data) return <p>Memuat...</p>;
  return (
    <div>
      <form className="baris" onSubmit={tambah}>
        <select required value={baru.kelas_id} onChange={(e) => setBaru({ ...baru, kelas_id: e.target.value })}>
          <option value="">Pilih kelas</option>
          {kelas.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
        </select>
        <input required placeholder="Nama kelompok" value={baru.nama} onChange={(e) => setBaru({ ...baru, nama: e.target.value })} />
        <input type="number" placeholder="Modal (Rp)" value={baru.modal} onChange={(e) => setBaru({ ...baru, modal: e.target.value })} />
        <button className="btn">Tambah kelompok</button>
        <button type="button" className="btn gold" onClick={semua}>Distribusi modal ke semua</button>
      </form>
      {pesan && <p className="err">{pesan}</p>}

      <div className="scroll">
        <table>
          <thead><tr><th>Kelompok</th><th>Kelas</th><th>Modal</th><th>Saldo</th><th>Status</th><th>Aksi</th></tr></thead>
          <tbody>
            {data.data.map((k) => (
              <tr key={k.id}>
                <td>{k.nama}</td>
                <td>{k.kelas?.nama}</td>
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
    } catch (x) {
      setPesan(x.message);
    }
  }

  return (
    <div className="panel">
      <div className="baris"><h2>{k.nama}</h2><button onClick={tutup}>Tutup</button></div>
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

function KelasDosen() {
  const [dosen, setDosen] = useState([]);
  const [kelas, setKelas] = useState([]);
  const [nd, setNd] = useState('');
  const [nk, setNk] = useState({ nama: '', dosen_id: '' });
  const [pesan, setPesan] = useState('');

  const muat = () => { api('/admin/dosen').then(setDosen); api('/admin/kelas').then(setKelas); };
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
          <h2>Dosen pengampu</h2>
          <form className="baris" onSubmit={(e) => kirim(e, '/admin/dosen', { nama: nd }, () => setNd(''))}>
            <input required placeholder="Nama dosen" value={nd} onChange={(e) => setNd(e.target.value)} />
            <button className="btn">Tambah</button>
          </form>
          <ul>{dosen.map((d) => <li key={d.id}>{d.nama}</li>)}</ul>
        </div>
        <div className="kartu">
          <h2>Kelas</h2>
          <form
            className="baris"
            onSubmit={(e) => kirim(e, '/admin/kelas', { nama: nk.nama, dosen_id: nk.dosen_id || null }, () => setNk({ nama: '', dosen_id: '' }))}
          >
            <input required placeholder="Nama kelas" value={nk.nama} onChange={(e) => setNk({ ...nk, nama: e.target.value })} />
            <select value={nk.dosen_id} onChange={(e) => setNk({ ...nk, dosen_id: e.target.value })}>
              <option value="">Dosen pengampu</option>
              {dosen.map((d) => <option key={d.id} value={d.id}>{d.nama}</option>)}
            </select>
            <button className="btn">Tambah</button>
          </form>
          <ul>
            {kelas.map((k) => (
              <li key={k.id}>{k.nama} ({k.dosen?.nama || 'belum ada dosen'}), {k.kelompoks_count} kelompok</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}