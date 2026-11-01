import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import { Input, Kosong, PesanGalat, Pilih, StatusMuat, Tombol, useAksi, useMuat, useToast } from '../../ui';

export default function KelasDosen() {
  const kelas = useMuat(() => api('/admin/kelas'));
  const dosen = useMuat(() => api('/admin/dosen'));

  return (
    <>
      <h1 className="text-[22px] font-semibold tracking-tight mb-6">Kelas &amp; dosen</h1>
      <div className="lg:grid lg:grid-cols-[1fr_340px] gap-8 items-start">
        <section>
          <h2 className="font-semibold mb-3">Kelas</h2>
          <div className="bg-surface border border-line rounded-lg">
            <StatusMuat q={kelas}>
              {(daftar) => daftar.length === 0 ? (
                <Kosong judul="Belum ada kelas">Tambahkan kelas pertama di bawah.</Kosong>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[460px]">
                    <thead>
                      <tr className="text-left text-[13px] text-muted border-b border-line">
                        <th className="font-normal px-4 py-2.5">Nama</th>
                        <th className="font-normal px-4 py-2.5">Dosen pengampu</th>
                        <th className="font-normal px-4 py-2.5 text-right">Kelompok</th>
                      </tr>
                    </thead>
                    <tbody>
                      {daftar.map((k) => <BarisKelas key={k.id} k={k} dosen={dosen.data ?? []} />)}
                    </tbody>
                  </table>
                </div>
              )}
            </StatusMuat>
            <FormTambah
              label="Nama kelas baru"
              tombol="Tambah kelas"
              kirim={async (nama) => { await api('/admin/kelas', 'POST', { nama }); kelas.muat(); return `${nama} ditambahkan`; }}
            />
          </div>
        </section>
        <section className="mt-8 lg:mt-0">
          <h2 className="font-semibold mb-3">Dosen pengampu</h2>
          <div className="bg-surface border border-line rounded-lg">
            <StatusMuat q={dosen}>
              {(daftar) => daftar.length === 0 ? (
                <Kosong judul="Belum ada dosen" />
              ) : (
                <ul>
                  {daftar.map((d) => (
                    <li key={d.id} className="px-4 py-2.5 border-b border-line text-sm">
                      {d.nama}
                      {d.email && <span className="block text-[13px] text-muted truncate">{d.email}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </StatusMuat>
            <FormTambah
              label="Nama dosen baru"
              tombol="Tambah dosen"
              kirim={async (nama) => { await api('/admin/dosen', 'POST', { nama }); dosen.muat(); return `${nama} ditambahkan`; }}
            />
          </div>
        </section>
      </div>
    </>
  );
}

function BarisKelas({ k, dosen }) {
  const [dosenId, setDosenId] = useState(k.dosen_id ?? '');
  const { sibuk, galat, jalan } = useAksi();
  const toast = useToast();

  function ganti(e) {
    const baru = e.target.value, lama = dosenId;
    setDosenId(baru);
    jalan(async () => {
      try {
        await api(`/admin/kelas/${k.id}`, 'PUT', { dosen_id: baru || null });
        toast(`Dosen ${k.nama} diperbarui`);
      } catch (x) { setDosenId(lama); throw x; }
    });
  }

  return (
    <tr className="border-b border-line last:border-0">
      <td className="px-4 py-2 font-medium whitespace-nowrap">{k.nama}</td>
      <td className="px-4 py-2">
        <Pilih aria-label={`Dosen ${k.nama}`} className="!h-8 max-w-64" disabled={sibuk} value={dosenId} onChange={ganti}>
          <option value="">Belum ada dosen</option>
          {dosen.map((d) => <option key={d.id} value={d.id}>{d.nama}</option>)}
        </Pilih>
        {galat && <span role="alert" className="block text-xs text-galat mt-1">{galat}</span>}
      </td>
      <td className="px-4 py-2 text-right">
        <Link to={`/admin?kelas_id=${k.id}`} className="hover:underline underline-offset-2">{k.kelompoks_count}</Link>
      </td>
    </tr>
  );
}

function FormTambah({ label, tombol, kirim }) {
  const [nama, setNama] = useState('');
  const { sibuk, galat, jalan } = useAksi();
  const toast = useToast();

  function simpan(e) {
    e.preventDefault();
    jalan(async () => { toast(await kirim(nama)); setNama(''); });
  }

  return (
    <form onSubmit={simpan} className="p-3 border-t border-line first:border-0 space-y-2">
      <div className="flex gap-2">
        <Input aria-label={label} placeholder={label} required value={nama} onChange={(e) => setNama(e.target.value)} />
        <Tombol type="submit" disabled={sibuk || !nama.trim()}>{tombol}</Tombol>
      </div>
      <PesanGalat>{galat}</PesanGalat>
    </form>
  );
}
