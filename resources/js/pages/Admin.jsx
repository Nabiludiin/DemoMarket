import React from 'react';
import { NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { api, auth, keluar } from '../api';
import { Tombol, useMuat } from '../ui';
import Kelompok from './admin/Kelompok';
import KelompokDetail from './admin/KelompokDetail';
import KelasDosen from './admin/KelasDosen';
import Laporan from './admin/Laporan';
import Notifikasi from './admin/Notifikasi';

export default function Admin() {
  const { pathname } = useLocation();
  const ringkas = useMuat(() => api('/admin/ringkasan'), [pathname]);
  const yatim = ringkas.data?.notifikasi_yatim ?? 0;

  const tautan = ({ isActive }) =>
    `flex items-center justify-between gap-2 h-9 px-3 rounded-md text-sm whitespace-nowrap ${isActive ? 'bg-line/70 font-medium' : 'text-muted hover:text-ink hover:bg-line/40'}`;

  return (
    <div className="lg:grid lg:grid-cols-[216px_1fr] min-h-dvh">
      <aside className="lg:sticky lg:top-0 lg:h-dvh flex flex-col border-b lg:border-b-0 lg:border-r border-line px-3 lg:py-4">
        <div className="flex items-center justify-between h-13 lg:h-auto lg:mb-6 px-1 lg:px-3">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <span aria-hidden className="size-2.5 bg-brand" />
            Market Day
          </p>
          <Tombol varian="hantu" ukuran="sm" className="lg:hidden" onClick={keluar}>Keluar</Tombol>
        </div>
        <nav aria-label="Utama" className="flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0 -mx-1 px-1">
          <NavLink to="/admin" end className={tautan}>Kelompok</NavLink>
          <NavLink to="/admin/kelas" className={tautan}>Kelas &amp; dosen</NavLink>
          <NavLink to="/admin/laporan" className={tautan}>Laporan</NavLink>
          <NavLink to="/admin/notifikasi" className={tautan}>
            Pembayaran masuk
            {yatim > 0 && <span className="text-xs font-medium text-tunggu bg-tunggu-soft rounded px-1.5" aria-label={`${yatim} perlu ditetapkan`}>{yatim}</span>}
          </NavLink>
        </nav>
        <div className="hidden lg:block mt-auto px-3">
          <p className="text-[13px] truncate">{auth.nama}</p>
          <button onClick={keluar} className="text-[13px] text-muted hover:text-ink">Keluar</button>
        </div>
      </aside>
      <main className="min-w-0 px-4 sm:px-8 py-6 lg:py-8">
        <div className="max-w-[1120px] mx-auto">
          <Routes>
            <Route index element={<Kelompok />} />
            <Route path="kelompok/:id" element={<KelompokDetail />} />
            <Route path="kelas" element={<KelasDosen />} />
            <Route path="laporan" element={<Laporan />} />
            <Route path="notifikasi" element={<Notifikasi />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
