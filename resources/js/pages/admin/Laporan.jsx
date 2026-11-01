import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, rp, rpTanda } from '../../api';
import { Kosong, Paginasi, Pilih, StatusMuat, useMuat } from '../../ui';

export default function Laporan() {
  const [kelasId, setKelasId] = useState('');
  const [hal, setHal] = useState(1);
  const total = useMuat(() => api('/admin/laporan'));
  const kelas = useMuat(() => api('/admin/kelas'));
  const perKelompok = useMuat(() => api(`/admin/laporan/kelompok?page=${hal}${kelasId ? `&kelas_id=${kelasId}` : ''}`), [hal, kelasId]);

  return (
    <>
      <h1 className="text-[22px] font-semibold tracking-tight mb-6">Laporan</h1>
      <StatusMuat q={total}>
        {(l) => (
          <div className="grid md:grid-cols-2 gap-8">
            <section>
              <h2 className="font-semibold mb-3">Keuntungan</h2>
              <div className="bg-surface border border-line rounded-lg px-4">
                <Baris label="Penjualan QRIS" nilai={rp(l.penjualan)} />
                <Baris label="Biaya QRIS" nilai={rpTanda(-l.biaya_midtrans)} />
                <Baris label="Laba kotor" nilai={rp(l.laba_kotor)} kuat />
              </div>
            </section>
            <section>
              <h2 className="font-semibold mb-3">Posisi saldo kelompok</h2>
              <div className="bg-surface border border-line rounded-lg px-4">
                <Baris label="Modal tersalur" nilai={rpTanda(l.modal_tersalur)} />
                <Baris label="Top up" nilai={rpTanda(l.topup)} />
                <Baris label="Laba kotor" nilai={rpTanda(l.laba_kotor)} />
                <Baris label="Modal dikembalikan" nilai={rpTanda(-l.modal_kembali)} />
                <Baris label="Ditarik kelompok" nilai={rpTanda(-l.withdraw)} />
                <Baris label="Saldo semua kelompok" nilai={rp(l.saldo_semua)} kuat />
              </div>
            </section>
          </div>
        )}
      </StatusMuat>

      <section className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h2 className="font-semibold">Per kelompok, laba tertinggi dulu</h2>
          <Pilih aria-label="Saring kelas" className="sm:w-44" value={kelasId} onChange={(e) => { setKelasId(e.target.value); setHal(1); }}>
            <option value="">Semua kelas</option>
            {kelas.data?.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
          </Pilih>
        </div>
        <div className={`bg-surface border border-line rounded-lg transition-opacity ${perKelompok.memuat && perKelompok.data ? 'opacity-60' : ''}`}>
          <StatusMuat q={perKelompok}>
            {(d) => d.data.length === 0 ? (
              <Kosong judul="Belum ada kelompok" />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[760px]">
                    <thead>
                      <tr className="text-[13px] text-muted border-b border-line text-right">
                        <th className="font-normal px-4 py-2.5 text-left">Kelompok</th>
                        <th className="font-normal px-4 py-2.5">Penjualan</th>
                        <th className="font-normal px-4 py-2.5">Biaya QRIS</th>
                        <th className="font-normal px-4 py-2.5">Laba kotor</th>
                        <th className="font-normal px-4 py-2.5">Modal kembali</th>
                        <th className="font-normal px-4 py-2.5">Ditarik</th>
                        <th className="font-normal px-4 py-2.5">Saldo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.data.map((k) => (
                        <tr key={k.id} className="border-b border-line last:border-0 text-right">
                          <td className="px-4 py-2.5 text-left">
                            <Link to={`/admin/kelompok/${k.id}`} className="font-medium hover:underline underline-offset-2">{k.nama}</Link>
                            <span className="block text-[13px] text-muted">{k.kelas?.nama}</span>
                          </td>
                          <td className="px-4 py-2.5">{sel(k.penjualan)}</td>
                          <td className="px-4 py-2.5 text-muted">{sel(k.biaya)}</td>
                          <td className="px-4 py-2.5 font-medium">{sel(k.laba)}</td>
                          <td className="px-4 py-2.5 text-muted">{sel(k.dikembalikan)}</td>
                          <td className="px-4 py-2.5 text-muted">{sel(k.ditarik)}</td>
                          <td className="px-4 py-2.5">{sel(k.saldo)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Paginasi halaman={d.current_page} terakhir={d.last_page} total={d.total} ke={setHal} />
              </>
            )}
          </StatusMuat>
        </div>
      </section>
    </>
  );
}

// Strip untuk nol supaya kelompok yang punya angka mudah terlihat di tabel panjang.
const sel = (n) => (Number(n) ? rp(n) : <span className="text-faint">—</span>);

const Baris = ({ label, nilai, kuat }) => (
  <div className={`flex justify-between gap-4 py-2.5 text-sm border-b border-line last:border-0 ${kuat ? 'font-semibold !border-t-ink' : ''}`}>
    <span className={kuat ? '' : 'text-muted'}>{label}</span>
    <span>{nilai}</span>
  </div>
);
