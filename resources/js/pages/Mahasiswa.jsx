import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, auth, rp } from '../api';

export default function Mahasiswa() {
  const [d, setD] = useState(null);
  const [riwayat, setRiwayat] = useState([]);
  const [jumlah, setJumlah] = useState('');
  const [pesan, setPesan] = useState('');
  const [adaGambar, setAdaGambar] = useState(true);
  const nav = useNavigate();

  const muat = () => {
    api('/kelompok-saya').then(setD).catch((e) => setPesan(e.message));
    api('/kelompok-saya/riwayat').then((r) => setRiwayat(r.data)).catch(() => {});
  };
  useEffect(() => { muat(); }, []);

  async function aksi(fn) {
    setPesan('');
    try { await fn(); muat(); } catch (e) { setPesan(e.message); }
  }
  const tarik = (e) => {
    e.preventDefault();
    aksi(async () => {
      await api('/kelompok-saya/withdraw', 'POST', { jumlah: parseInt(jumlah) || 0 });
      setJumlah('');
    });
  };
  const kembali = () => aksi(() => api('/kelompok-saya/kembalikan-modal', 'POST'));
  const keluar = () => { auth.keluar(); nav('/'); };

  if (!d) return <div className="wrap"><p className="err">{pesan || 'Memuat...'}</p></div>;
  const k = d.kelompok;

  return (
    <div className="wrap">
      <header className="atas">
        <div><h1>{k.nama}</h1><p className="kecil">{k.kelas?.nama}, dosen: {k.kelas?.dosen?.nama || '-'}</p></div>
        <button className="btn alt" onClick={keluar}>Keluar</button>
      </header>

      <div className="grid">
        <div className="kartu"><small>Saldo</small><b>{rp(k.saldo)}</b></div>
        <div className="kartu"><small>Modal belum kembali</small><b>{rp(d.modal_belum_kembali)}</b></div>
        <div className="kartu"><small>Bisa ditarik</small><b>{rp(d.bisa_ditarik)}</b></div>
      </div>
      {pesan && <p className="err">{pesan}</p>}

      <div className="grid2">
        <div className="kartu">
          <h2>QRIS kelompok</h2>
          <div className="qris">
            {adaGambar
              ? <img src={`/qris/${k.qris_id}.png`} alt={'QRIS ' + k.qris_id} onError={() => setAdaGambar(false)} />
              : <span>Gambar QRIS statis<br />{k.qris_id}<br /><small>(taruh di public/qris)</small></span>}
          </div>
        </div>
        <div className="kartu">
          <h2>Withdraw dan pengembalian modal</h2>
          <form className="baris" onSubmit={tarik}>
            <input type="number" min="1" placeholder="Jumlah (Rp)" value={jumlah} onChange={(e) => setJumlah(e.target.value)} />
            <button className="btn">Withdraw</button>
          </form>
          <button className="btn gold" disabled={d.modal_belum_kembali < 1} onClick={kembali}>Kembalikan modal ke BPA</button>
        </div>
      </div>

      <div className="panel">
        <h2>Riwayat transaksi</h2>
        <div className="scroll">
          <table>
            <thead><tr><th>Waktu</th><th>Jenis</th><th>Jumlah</th><th>Saldo akhir</th></tr></thead>
            <tbody>
              {riwayat.length === 0 && <tr><td colSpan="4" className="kecil">Belum ada transaksi.</td></tr>}
              {riwayat.map((t) => (
                <tr key={t.id}>
                  <td>{new Date(t.created_at).toLocaleString('id-ID')}</td>
                  <td>{t.tipe}</td><td>{rp(t.jumlah)}</td><td>{rp(t.saldo_akhir)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}