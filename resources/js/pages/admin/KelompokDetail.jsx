import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, jam, LABEL_TIPE, rp, rpTanda, tanggal } from '../../api';
import { Bidang, Dialog, Input, InputRupiah, Kosong, Paginasi, PesanGalat, StatusMuat, Tanda, Tombol, useAksi, useMuat, useToast } from '../../ui';

export default function KelompokDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [hal, setHal] = useState(1);
  const [dialog, setDialog] = useState(null);
  const q = useMuat(() => api(`/admin/kelompok/${id}/riwayat?page=${hal}`), [id, hal]);
  const tutup = () => setDialog(null);

  return (
    <>
      <button onClick={() => navigate(-1)} className="text-[13px] text-muted hover:text-ink mb-3">← Kelompok</button>
      <StatusMuat q={q}>
        {({ kelompok: k, modal_belum_kembali, bisa_ditarik, transaksi }) => {
          const cair = !!k.modal_cair_at;
          return (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-[22px] font-semibold tracking-tight">{k.nama}</h1>
                  <p className="text-sm text-muted mt-0.5">
                    {k.kelas?.nama} · {k.kelas?.dosen?.nama ?? 'Belum ada dosen'} · <span className="font-mono text-[13px]">{k.qris_id}</span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!cair && <Tombol onClick={() => setDialog('modal')}>Atur modal</Tombol>}
                  <Tombol onClick={() => setDialog('topup')}>Top up</Tombol>
                  {!cair && <Tombol varian="primer" disabled={k.modal < 1} onClick={() => setDialog('cair')}>Cairkan modal</Tombol>}
                </div>
              </div>

              <dl className="grid grid-cols-2 lg:grid-cols-4 mt-6 bg-surface border border-line rounded-lg divide-line [&>div]:px-4 [&>div]:py-3 max-lg:[&>div:nth-child(-n+2)]:border-b max-lg:[&>div]:border-line lg:divide-x max-lg:[&>div:nth-child(even)]:border-l">
                <Angka label="Saldo" nilai={rp(k.saldo)} kuat />
                <Angka label="Modal" nilai={rp(k.modal)} catatan={cair ? <Tanda warna="masuk">Cair {tanggal(k.modal_cair_at)}</Tanda> : k.modal > 0 ? <Tanda warna="tunggu">Siap dicairkan</Tanda> : <Tanda>Belum diatur</Tanda>} />
                <Angka label="Modal belum kembali" nilai={cair ? rp(modal_belum_kembali) : '—'} />
                <Angka label="Bisa ditarik" nilai={rp(bisa_ditarik)} />
              </dl>

              <div className="lg:grid lg:grid-cols-[1fr_320px] gap-8 mt-8 items-start">
                <section>
                  <h2 className="font-semibold mb-3">Riwayat transaksi</h2>
                  <div className="bg-surface border border-line rounded-lg">
                    {transaksi.data.length === 0 ? (
                      <Kosong judul="Belum ada transaksi">Transaksi muncul setelah modal cair atau ada pembayaran masuk.</Kosong>
                    ) : (
                      <>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm min-w-[520px]">
                            <thead>
                              <tr className="text-left text-[13px] text-muted border-b border-line">
                                <th className="font-normal px-4 py-2.5">Waktu</th>
                                <th className="font-normal px-4 py-2.5">Keterangan</th>
                                <th className="font-normal px-4 py-2.5 text-right">Jumlah</th>
                                <th className="font-normal px-4 py-2.5 text-right">Saldo</th>
                              </tr>
                            </thead>
                            <tbody>
                              {transaksi.data.map((t) => (
                                <tr key={t.id} className="border-b border-line last:border-0">
                                  <td className="px-4 py-2.5 text-muted whitespace-nowrap">{tanggal(t.created_at)}, {jam(t.created_at)}</td>
                                  <td className="px-4 py-2.5">
                                    {LABEL_TIPE[t.tipe] ?? t.tipe}
                                    {t.meta?.status === 'simulasi' && <span className="text-muted"> (simulasi)</span>}
                                  </td>
                                  <td className={`px-4 py-2.5 text-right font-medium whitespace-nowrap ${t.jumlah > 0 ? 'text-masuk' : ''}`}>{rpTanda(t.jumlah)}</td>
                                  <td className="px-4 py-2.5 text-right text-muted whitespace-nowrap">{rp(t.saldo_akhir)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <Paginasi halaman={transaksi.current_page} terakhir={transaksi.last_page} total={transaksi.total} ke={setHal} />
                      </>
                    )}
                  </div>
                </section>
                <Anggota k={k} segarkan={q.muat} />
              </div>

              <DialogNominal buka={dialog === 'topup'} tutup={tutup} judul="Top up saldo" label="Jumlah top up" bantuan="Top up langsung masuk saldo dan bisa ditarik kelompok." tombol="Tambahkan saldo"
                kirim={async (jumlah) => { await api(`/admin/kelompok/${id}/topup`, 'POST', { jumlah }); q.muat(); return `${rp(jumlah)} ditambahkan ke saldo`; }} />
              <DialogNominal buka={dialog === 'modal'} tutup={tutup} judul="Atur modal" label="Modal" awal={Number(k.modal)} bantuan="Masih bisa diubah sampai modal dicairkan." tombol="Simpan"
                kirim={async (modal) => { await api(`/admin/kelompok/${id}/modal`, 'PUT', { modal }); q.muat(); return 'Modal disimpan'; }} />
              <DialogCair buka={dialog === 'cair'} tutup={tutup} k={k} selesai={q.muat} />
            </>
          );
        }}
      </StatusMuat>
    </>
  );
}

const Angka = ({ label, nilai, catatan, kuat }) => (
  <div>
    <dt className="text-[13px] text-muted">{label}</dt>
    <dd className={`mt-0.5 ${kuat ? 'text-xl font-semibold tracking-tight' : 'text-xl tracking-tight'}`}>{nilai}</dd>
    {catatan && <dd className="mt-0.5">{catatan}</dd>}
  </div>
);

function Anggota({ k, segarkan }) {
  const [buka, setBuka] = useState(false);
  const n = k.anggota.length;
  return (
    <section className="mt-8 lg:mt-0">
      <div className="flex items-center justify-between mb-3 h-8">
        <h2 className="font-semibold">Anggota <span className="font-normal text-muted">{n} dari 8–10</span></h2>
        <Tombol ukuran="sm" onClick={() => setBuka(true)}>Tambah</Tombol>
      </div>
      <div className="bg-surface border border-line rounded-lg">
        {n === 0 ? (
          <Kosong judul="Belum ada anggota">Kelompok butuh akun anggota untuk menerima pembayaran.</Kosong>
        ) : (
          <ul>
            {k.anggota.map((a) => (
              <li key={a.id} className="px-4 py-2.5 border-b border-line last:border-0 text-sm">
                {a.name}
                <span className="block text-[13px] text-muted truncate">{a.email}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <DialogAnggota buka={buka} tutup={() => setBuka(false)} k={k} selesai={segarkan} />
    </section>
  );
}

function DialogAnggota({ buka, tutup, k, selesai }) {
  const kosong = { name: '', email: '', password: '' };
  const [f, setF] = useState(kosong);
  const { sibuk, galat, jalan } = useAksi();
  const toast = useToast();
  const ubah = (kunci) => (e) => setF({ ...f, [kunci]: e.target.value });

  function kirim(e) {
    e.preventDefault();
    jalan(async () => {
      await api(`/admin/kelompok/${k.id}/anggota`, 'POST', f);
      toast(`${f.name} ditambahkan`);
      setF(kosong); tutup(); selesai();
    });
  }

  return (
    <Dialog buka={buka} tutup={tutup} judul={`Tambah anggota ${k.nama}`}>
      <form onSubmit={kirim} className="space-y-4">
        <Bidang label="Nama"><Input required value={f.name} onChange={ubah('name')} /></Bidang>
        <Bidang label="Email"><Input type="email" required value={f.email} onChange={ubah('email')} /></Bidang>
        <Bidang label="Kata sandi awal" bantuan="Minimal 6 karakter. Sampaikan ke mahasiswa yang bersangkutan.">
          <Input type="text" autoComplete="off" required minLength={6} value={f.password} onChange={ubah('password')} />
        </Bidang>
        <PesanGalat>{galat}</PesanGalat>
        <div className="flex gap-2 justify-end">
          <Tombol onClick={tutup}>Batal</Tombol>
          <Tombol type="submit" varian="primer" disabled={sibuk}>{sibuk ? 'Menyimpan…' : 'Simpan'}</Tombol>
        </div>
      </form>
    </Dialog>
  );
}

function DialogNominal({ buka, tutup, judul, label, bantuan, tombol, awal = '', kirim }) {
  const [nilai, setNilai] = useState(awal);
  const { sibuk, galat, jalan } = useAksi();
  const toast = useToast();

  function simpan(e) {
    e.preventDefault();
    jalan(async () => { toast(await kirim(nilai)); tutup(); setNilai(awal); });
  }

  return (
    <Dialog buka={buka} tutup={tutup} judul={judul}>
      <form onSubmit={simpan} className="space-y-4">
        <Bidang label={label} bantuan={bantuan}><InputRupiah autoFocus value={nilai} onChange={setNilai} /></Bidang>
        <PesanGalat>{galat}</PesanGalat>
        <div className="flex gap-2 justify-end">
          <Tombol onClick={tutup}>Batal</Tombol>
          <Tombol type="submit" varian="primer" disabled={sibuk || nilai === ''}>{sibuk ? 'Menyimpan…' : tombol}</Tombol>
        </div>
      </form>
    </Dialog>
  );
}

function DialogCair({ buka, tutup, k, selesai }) {
  const { sibuk, galat, jalan } = useAksi();
  const toast = useToast();
  const kirim = () => jalan(async () => {
    await api(`/admin/kelompok/${k.id}/distribusi`, 'POST');
    toast(`Modal ${k.nama} dicairkan`);
    tutup(); selesai();
  });
  return (
    <Dialog buka={buka} tutup={tutup} judul={`Cairkan ${rp(k.modal)} ke ${k.nama}?`}>
      <p className="text-sm text-muted">Saldo kelompok bertambah sebesar modal. Setelah cair, nominal modal tidak bisa diubah. Pastikan dana fisiknya sudah disiapkan BPA.</p>
      <div className="mt-4"><PesanGalat>{galat}</PesanGalat></div>
      <div className="flex gap-2 justify-end mt-4">
        <Tombol onClick={tutup}>Batal</Tombol>
        <Tombol varian="primer" disabled={sibuk} onClick={kirim}>{sibuk ? 'Mencairkan…' : 'Cairkan sekarang'}</Tombol>
      </div>
    </Dialog>
  );
}
