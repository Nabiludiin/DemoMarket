import React, { useEffect, useState } from 'react';
import { api, jam, rp, tanggal } from '../../api';
import { Bidang, Dialog, Input, Kosong, PesanGalat, StatusMuat, Tanda, Tombol, useAksi, useMuat, useToast } from '../../ui';

const STATUS = {
  yatim: { warna: 'tunggu', teks: 'Perlu ditetapkan' },
  diproses: { warna: 'masuk', teks: 'Diproses' },
  diabaikan: { warna: 'faint', teks: 'Diabaikan' },
  ditolak: { warna: 'galat', teks: 'Nominal tidak cocok' },
};

export default function Notifikasi() {
  const q = useMuat(() => api('/admin/notifikasi'));
  const [pilih, setPilih] = useState(null);

  return (
    <>
      <h1 className="text-[22px] font-semibold tracking-tight">Pembayaran masuk</h1>
      <p className="text-sm text-muted mt-0.5 mb-6">Notifikasi terbaru dari Midtrans. Pembayaran yang tidak dikenali kelompoknya perlu Anda tetapkan.</p>
      <div className="bg-surface border border-line rounded-lg">
        <StatusMuat q={q}>
          {(daftar) => daftar.length === 0 ? (
            <Kosong judul="Belum ada notifikasi">Notifikasi muncul setelah ada pembayaran QRIS yang masuk.</Kosong>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[620px]">
                <thead>
                  <tr className="text-left text-[13px] text-muted border-b border-line">
                    <th className="font-normal px-4 py-2.5">Waktu</th>
                    <th className="font-normal px-4 py-2.5">Referensi</th>
                    <th className="font-normal px-4 py-2.5 text-right">Jumlah</th>
                    <th className="font-normal px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5" aria-label="Aksi" />
                  </tr>
                </thead>
                <tbody>
                  {daftar.map((n) => {
                    const s = STATUS[n.status] ?? { warna: 'faint', teks: n.status };
                    return (
                      <tr key={n.id} className="border-b border-line last:border-0">
                        <td className="px-4 py-2.5 text-muted whitespace-nowrap">{tanggal(n.created_at)}, {jam(n.created_at)}</td>
                        <td className="px-4 py-2.5 font-mono text-[13px]">{n.ref}</td>
                        <td className="px-4 py-2.5 text-right font-medium">{rp(n.jumlah)}</td>
                        <td className="px-4 py-2.5"><Tanda warna={s.warna}>{s.teks}</Tanda></td>
                        <td className="px-4 py-1.5 text-right">
                          {n.status === 'yatim' && <Tombol ukuran="sm" onClick={() => setPilih(n)}>Tetapkan…</Tombol>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </StatusMuat>
      </div>
      <DialogTetapkan n={pilih} tutup={() => setPilih(null)} selesai={q.muat} />
    </>
  );
}

function DialogTetapkan({ n, tutup, selesai }) {
  const [cari, setCari] = useState('');
  const [hasil, setHasil] = useState([]);
  const [dipilih, setDipilih] = useState(null);
  const { sibuk, galat, jalan } = useAksi();
  const toast = useToast();

  useEffect(() => {
    if (!n) { setCari(''); setDipilih(null); setHasil([]); return; }
    let batal = false;
    const t = setTimeout(async () => {
      const r = await api(`/admin/kelompok?q=${encodeURIComponent(cari)}`).catch(() => ({ data: [] }));
      if (!batal) setHasil(r.data.slice(0, 6));
    }, 200);
    return () => { batal = true; clearTimeout(t); };
  }, [cari, n]);

  function kirim(e) {
    e.preventDefault();
    jalan(async () => {
      await api(`/admin/notifikasi/${n.id}/tetapkan`, 'POST', { kelompok_id: dipilih.id });
      toast(`${rp(n.jumlah)} masuk ke ${dipilih.nama}`);
      tutup(); selesai();
    });
  }

  return (
    <Dialog buka={!!n} tutup={tutup} judul={`Tetapkan ${rp(n?.jumlah)} ke kelompok`}>
      <form onSubmit={kirim} className="space-y-4">
        <Bidang label="Cari kelompok">
          <Input type="search" autoFocus placeholder="Nama atau kode QRIS" value={cari} onChange={(e) => setCari(e.target.value)} />
        </Bidang>
        <fieldset className="border border-line rounded-md divide-y divide-line">
          <legend className="sr-only">Hasil pencarian</legend>
          {hasil.length === 0 && <p className="px-3 py-3 text-sm text-muted">Tidak ada kelompok yang cocok.</p>}
          {hasil.map((k) => (
            <label key={k.id} className="flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer hover:bg-canvas">
              <input type="radio" name="kelompok" className="accent-ink" checked={dipilih?.id === k.id} onChange={() => setDipilih(k)} />
              <span>{k.nama} <span className="text-muted font-mono text-xs">{k.qris_id}</span></span>
            </label>
          ))}
        </fieldset>
        <p className="text-[13px] text-muted">Penetapan tidak bisa dibatalkan. Biaya QRIS dipotong dari saldo kelompok.</p>
        <PesanGalat>{galat}</PesanGalat>
        <div className="flex gap-2 justify-end">
          <Tombol onClick={tutup}>Batal</Tombol>
          <Tombol type="submit" varian="primer" disabled={!dipilih || sibuk}>{sibuk ? 'Menyimpan…' : 'Tetapkan'}</Tombol>
        </div>
      </form>
    </Dialog>
  );
}
