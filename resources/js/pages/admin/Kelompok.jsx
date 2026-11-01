import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, rp } from '../../api';
import { Bidang, Dialog, Input, InputRupiah, Kosong, Paginasi, PesanGalat, Pilih, StatusMuat, Tanda, Tombol, useAksi, useMuat, useToast } from '../../ui';

export default function Kelompok() {
  const [sp, setSp] = useSearchParams();
  const kelasId = sp.get('kelas_id') ?? '';
  const [cari, setCari] = useState(sp.get('q') ?? '');
  const [tambah, setTambah] = useState(false);
  const [konfirmasi, setKonfirmasi] = useState(false);

  // Filter disimpan di URL supaya tombol kembali dari halaman detail tidak menghapusnya.
  const ubah = (kunci, nilai) => setSp((l) => {
    const n = new URLSearchParams(l);
    nilai ? n.set(kunci, nilai) : n.delete(kunci);
    if (kunci !== 'page') n.delete('page');
    return n;
  }, { replace: true });

  useEffect(() => {
    if (cari === (sp.get('q') ?? '')) return;
    const t = setTimeout(() => ubah('q', cari), 300);
    return () => clearTimeout(t);
  }, [cari]);

  const daftar = useMuat(() => api(`/admin/kelompok?${sp}`), [sp.toString()]);
  const ringkas = useMuat(() => api(`/admin/ringkasan${kelasId ? `?kelas_id=${kelasId}` : ''}`), [kelasId]);
  const kelas = useMuat(() => api('/admin/kelas'));
  const segarkan = () => { daftar.muat(); ringkas.muat(); };
  const r = ringkas.data;
  const adaFilter = sp.get('q') || sp.get('status') || kelasId;

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">Kelompok</h1>
          {r && (
            <p className="text-sm text-muted mt-0.5">
              {r.kelompok.toLocaleString('id-ID')} kelompok · {r.sudah_cair.toLocaleString('id-ID')} sudah menerima modal · saldo total {rp(r.saldo)}
            </p>
          )}
        </div>
        <Tombol onClick={() => setTambah(true)}>Tambah kelompok</Tombol>
      </div>

      {r?.siap_cair > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 mt-5 px-4 py-3 bg-surface border border-line rounded-lg">
          <p className="text-sm">
            <span className="font-medium">{r.siap_cair.toLocaleString('id-ID')} kelompok</span> menunggu modal, total <span className="font-medium">{rp(r.modal_siap_cair)}</span>
          </p>
          <Tombol varian="primer" ukuran="sm" onClick={() => setKonfirmasi(true)}>Cairkan semua…</Tombol>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mt-5 mb-3">
        <Input type="search" aria-label="Cari kelompok" placeholder="Cari nama atau kode QRIS" className="basis-full sm:basis-0 sm:flex-1 sm:max-w-xs" value={cari} onChange={(e) => setCari(e.target.value)} />
        <Pilih aria-label="Saring kelas" className="!w-auto flex-1 min-w-0 sm:flex-none sm:!w-44" value={kelasId} onChange={(e) => ubah('kelas_id', e.target.value)}>
          <option value="">Semua kelas</option>
          {kelas.data?.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
        </Pilih>
        <Pilih aria-label="Saring status modal" className="!w-auto flex-1 min-w-0 sm:flex-none sm:!w-44" value={sp.get('status') ?? ''} onChange={(e) => ubah('status', e.target.value)}>
          <option value="">Semua status</option>
          <option value="belum_cair">Modal belum cair</option>
          <option value="cair">Modal sudah cair</option>
        </Pilih>
      </div>

      <div className={`bg-surface border border-line rounded-lg transition-opacity ${daftar.memuat && daftar.data ? 'opacity-60' : ''}`}>
        <StatusMuat q={daftar}>
          {(d) => d.data.length === 0 ? (
            adaFilter
              ? <Kosong judul="Tidak ada kelompok yang cocok">Coba ubah kata kunci atau saringan.</Kosong>
              : <Kosong judul="Belum ada kelompok">Tambahkan kelas dulu, lalu buat kelompok di dalamnya.</Kosong>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[780px] [&_td]:whitespace-nowrap">
                  <thead>
                    <tr className="text-left text-[13px] text-muted border-b border-line">
                      <th className="font-normal px-4 py-2.5 max-sm:sticky max-sm:left-0 max-sm:bg-surface max-sm:border-r max-sm:border-line">Kelompok</th>
                      <th className="font-normal px-4 py-2.5">Kelas</th>
                      <th className="font-normal px-4 py-2.5 text-right">Anggota</th>
                      <th className="font-normal px-4 py-2.5 text-right">Modal</th>
                      <th className="font-normal px-4 py-2.5">Status modal</th>
                      <th className="font-normal px-4 py-2.5 text-right w-36">Saldo</th>
                      <th className="px-4 py-2.5" aria-label="Aksi" />
                    </tr>
                  </thead>
                  <tbody>
                    {d.data.map((k) => <Baris key={k.id} k={k} segarkan={segarkan} />)}
                  </tbody>
                </table>
              </div>
              <Paginasi halaman={d.current_page} terakhir={d.last_page} total={d.total} ke={(n) => ubah('page', String(n))} />
            </>
          )}
        </StatusMuat>
      </div>

      <DialogTambah buka={tambah} tutup={() => setTambah(false)} kelas={kelas.data ?? []} selesai={segarkan} />
      <DialogCairSemua buka={konfirmasi} tutup={() => setKonfirmasi(false)} r={r} kelasId={kelasId} kelas={kelas.data} selesai={segarkan} />
    </>
  );
}

function Baris({ k, segarkan }) {
  const { sibuk, jalan } = useAksi();
  const toast = useToast();
  const cair = !!k.modal_cair_at;

  const cairkan = () => jalan(async () => {
    await api(`/admin/kelompok/${k.id}/distribusi`, 'POST');
    toast(`Modal ${k.nama} dicairkan`);
    segarkan();
  }).then(() => {});

  return (
    <tr className="border-b border-line last:border-0 hover:bg-canvas/70">
      <td className="px-4 py-2.5 max-sm:sticky max-sm:left-0 max-sm:bg-surface max-sm:border-r max-sm:border-line">
        <Link to={`/admin/kelompok/${k.id}`} className="font-medium hover:underline underline-offset-2">{k.nama}</Link>
        <span className="block text-xs text-muted font-mono">{k.qris_id}</span>
      </td>
      <td className="px-4 py-2.5">
        {k.kelas?.nama}
        <span className="block text-[13px] text-muted">{k.kelas?.dosen?.nama ?? 'Belum ada dosen'}</span>
      </td>
      <td className={`px-4 py-2.5 text-right ${k.anggota_count === 0 ? 'text-faint' : ''}`}>{k.anggota_count}</td>
      <td className="px-4 py-1.5 text-right w-44">{cair ? rp(k.modal) : <ModalSebaris k={k} segarkan={segarkan} />}</td>
      <td className="px-4 py-2.5">
        {cair ? <Tanda warna="masuk">Sudah cair</Tanda> : k.modal > 0 ? <Tanda warna="tunggu">Siap dicairkan</Tanda> : <Tanda>Belum diatur</Tanda>}
      </td>
      <td className="px-4 py-2.5 text-right font-medium">{rp(k.saldo)}</td>
      <td className="px-4 py-1.5 text-right w-28">
        {!cair && k.modal > 0 && <Tombol ukuran="sm" disabled={sibuk} onClick={cairkan}>Cairkan</Tombol>}
      </td>
    </tr>
  );
}

function ModalSebaris({ k, segarkan }) {
  const [edit, setEdit] = useState(false);
  const [nilai, setNilai] = useState(Number(k.modal));
  const { sibuk, galat, jalan } = useAksi();

  function simpan(e) {
    e.preventDefault();
    if (nilai === '' || nilai === Number(k.modal)) { setEdit(false); return; }
    jalan(async () => {
      await api(`/admin/kelompok/${k.id}/modal`, 'PUT', { modal: nilai });
      setEdit(false);
      segarkan();
    });
  }

  if (!edit) {
    return (
      <button onClick={() => { setNilai(Number(k.modal)); setEdit(true); }} title="Ubah modal" aria-label={`Ubah modal ${k.nama}, sekarang ${rp(k.modal)}`} className="-mr-2 px-2 py-1 rounded border border-transparent hover:border-line-strong">
        {rp(k.modal)}
      </button>
    );
  }
  return (
    <form onSubmit={simpan} onKeyDown={(e) => e.key === 'Escape' && setEdit(false)}>
      <InputRupiah autoFocus className="!h-8 -mr-2" aria-label={`Modal ${k.nama}`} disabled={sibuk} value={nilai} onChange={setNilai} onBlur={simpan} onFocus={(e) => e.target.select()} />
      {galat && <span role="alert" className="block text-xs text-galat mt-1 text-left">{galat}</span>}
    </form>
  );
}

function DialogTambah({ buka, tutup, kelas, selesai }) {
  const [f, setF] = useState({ kelas_id: '', nama: '', modal: '' });
  const { sibuk, galat, jalan } = useAksi();
  const toast = useToast();

  function kirim(e) {
    e.preventDefault();
    jalan(async () => {
      const k = await api('/admin/kelompok', 'POST', { ...f, modal: f.modal || 0 });
      toast(`${k.nama} ditambahkan`);
      setF({ kelas_id: f.kelas_id, nama: '', modal: '' });
      tutup(); selesai();
    });
  }

  return (
    <Dialog buka={buka} tutup={tutup} judul="Tambah kelompok">
      <form onSubmit={kirim} className="space-y-4">
        <Bidang label="Kelas">
          <Pilih required value={f.kelas_id} onChange={(e) => setF({ ...f, kelas_id: e.target.value })}>
            <option value="" disabled>Pilih kelas</option>
            {kelas.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
          </Pilih>
        </Bidang>
        <Bidang label="Nama kelompok">
          <Input required value={f.nama} onChange={(e) => setF({ ...f, nama: e.target.value })} />
        </Bidang>
        <Bidang label="Modal" bantuan="Boleh dikosongkan dan diatur nanti.">
          <InputRupiah value={f.modal} onChange={(modal) => setF({ ...f, modal })} />
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

function DialogCairSemua({ buka, tutup, r, kelasId, kelas, selesai }) {
  const { sibuk, galat, jalan } = useAksi();
  const toast = useToast();
  const namaKelas = kelasId && kelas?.find((k) => String(k.id) === kelasId)?.nama;

  const kirim = () => jalan(async () => {
    const h = await api('/admin/distribusi-semua', 'POST', kelasId ? { kelas_id: kelasId } : {});
    toast(`Modal cair ke ${h.kelompok_didanai.toLocaleString('id-ID')} kelompok`);
    tutup(); selesai();
  });

  return (
    <Dialog buka={buka} tutup={tutup} judul={`Cairkan ${rp(r?.modal_siap_cair)}?`}>
      <p className="text-sm text-muted">
        Saldo {r?.siap_cair.toLocaleString('id-ID')} kelompok{namaKelas ? ` di ${namaKelas}` : ''} akan bertambah sesuai modalnya.
        Setelah cair, nominal modal tidak bisa diubah. Pastikan dana fisiknya sudah disiapkan BPA.
      </p>
      <div className="mt-4"><PesanGalat>{galat}</PesanGalat></div>
      <div className="flex gap-2 justify-end mt-4">
        <Tombol onClick={tutup}>Batal</Tombol>
        <Tombol varian="primer" disabled={sibuk} onClick={kirim}>{sibuk ? 'Mencairkan…' : 'Cairkan sekarang'}</Tombol>
      </div>
    </Dialog>
  );
}
