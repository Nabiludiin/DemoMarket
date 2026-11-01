import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const VARIAN = {
  primer: 'bg-ink text-white hover:bg-[#2c3036] disabled:bg-line-strong disabled:text-white',
  kedua: 'bg-surface text-ink border border-line-strong hover:border-ink disabled:text-faint disabled:border-line',
  hantu: 'text-muted hover:text-ink hover:bg-line/60 disabled:text-faint',
};

const UKURAN = { sm: 'h-8 px-3 text-[13px]', md: 'h-10 px-4 text-sm', lg: 'h-13 px-5 text-base' };

export function Tombol({ varian = 'kedua', ukuran = 'md', className = '', type = 'button', ...p }) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed ${VARIAN[varian]} ${UKURAN[ukuran]} ${className}`}
      {...p}
    />
  );
}

const KOLOM = 'w-full h-10 px-3 rounded-md border border-line-strong bg-surface text-sm placeholder:text-faint hover:border-faint focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink';

export const Input = ({ className = '', ...p }) => <input className={`${KOLOM} ${className}`} {...p} />;

export const Pilih = ({ className = '', ...p }) => <select className={`${KOLOM} pr-8 ${className}`} {...p} />;

export function Bidang({ label, bantuan, children }) {
  return (
    <label className="block">
      <span className="block text-[13px] font-medium mb-1.5">{label}</span>
      {children}
      {bantuan && <span className="block text-[13px] text-muted mt-1.5">{bantuan}</span>}
    </label>
  );
}

export function InputRupiah({ value, onChange, className = '', ...p }) {
  const teks = value === '' || value == null ? '' : Number(value).toLocaleString('id-ID');
  return (
    <div className={`flex items-center h-10 rounded-md border border-line-strong bg-surface hover:border-faint focus-within:border-ink focus-within:ring-1 focus-within:ring-ink ${className}`}>
      <span className="pl-3 pr-1.5 text-sm text-muted">Rp</span>
      <input
        inputMode="numeric"
        autoComplete="off"
        className="w-full min-w-0 h-full pr-3 bg-transparent text-sm focus:outline-none"
        value={teks}
        onChange={(e) => {
          const angka = e.target.value.replace(/\D/g, '').slice(0, 12);
          onChange(angka === '' ? '' : Number(angka));
        }}
        {...p}
      />
    </div>
  );
}

export function Dialog({ buka, tutup, judul, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (buka && !d.open) {
      d.showModal();
      // showModal memindahkan fokus ke tombol pertama, jadi kolom pertama difokuskan setelahnya.
      (d.querySelector('input:not([type=radio]), select') ?? d.querySelector('h2')).focus();
    }
    if (!buka && d.open) d.close();
  }, [buka]);
  return (
    <dialog ref={ref} onClose={tutup} onClick={(e) => e.target === ref.current && tutup()} aria-label={judul}>
      {buka && (
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <h2 tabIndex={-1} className="text-[17px] font-semibold leading-snug focus:outline-none">{judul}</h2>
            <button type="button" onClick={tutup} aria-label="Tutup" className="-mt-1 -mr-1.5 size-8 grid place-items-center rounded-md text-muted hover:text-ink hover:bg-line/60">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M2 2l10 10M12 2L2 12" /></svg>
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

export const PesanGalat = ({ children }) =>
  children ? <p role="alert" className="text-sm text-galat bg-galat-soft rounded-md px-3 py-2.5">{children}</p> : null;

// Membungkus aksi tulis: mengurus status sibuk dan pesan galat.
export function useAksi() {
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState('');
  const jalan = useCallback(async (fn) => {
    setSibuk(true);
    setGalat('');
    try {
      return await fn();
    } catch (e) {
      setGalat(e.message);
    } finally {
      setSibuk(false);
    }
  }, []);
  return { sibuk, galat, jalan, setGalat };
}

// Data lama tetap tampil selama memuat ulang supaya tabel tidak berkedip.
export function useMuat(fn, deps = []) {
  const [s, setS] = useState({ data: null, galat: '', memuat: true });
  const urutan = useRef(0);
  const muat = useCallback(async () => {
    const ini = ++urutan.current;
    setS((l) => ({ ...l, memuat: true }));
    try {
      const data = await fn();
      if (ini === urutan.current) setS({ data, galat: '', memuat: false });
    } catch (e) {
      if (ini === urutan.current) setS((l) => ({ ...l, galat: e.message, memuat: false }));
    }
  }, deps);
  useEffect(() => { muat(); }, [muat]);
  return { ...s, muat };
}

export function StatusMuat({ q, children }) {
  if (q.data) return children(q.data);
  if (q.galat) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-galat mb-3">{q.galat}</p>
        <Tombol ukuran="sm" onClick={q.muat}>Coba lagi</Tombol>
      </div>
    );
  }
  return <p className="py-12 text-center text-sm text-muted denyut">Memuat…</p>;
}

export const Kosong = ({ judul, children }) => (
  <div className="py-12 px-6 text-center">
    <p className="font-medium">{judul}</p>
    {children && <p className="text-sm text-muted mt-1 max-w-sm mx-auto">{children}</p>}
  </div>
);

export function Paginasi({ halaman, terakhir, total, ke }) {
  if (terakhir <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 border-t border-line text-[13px] text-muted">
      <span>Halaman {halaman} dari {terakhir} · {total.toLocaleString('id-ID')} baris</span>
      <span className="flex gap-2">
        <Tombol ukuran="sm" disabled={halaman <= 1} onClick={() => ke(halaman - 1)}>Sebelumnya</Tombol>
        <Tombol ukuran="sm" disabled={halaman >= terakhir} onClick={() => ke(halaman + 1)}>Berikutnya</Tombol>
      </span>
    </div>
  );
}

const ToastKonteks = createContext(() => {});

export const useToast = () => useContext(ToastKonteks);

export function PenyediaToast({ children }) {
  const [pesan, setPesan] = useState('');
  const timer = useRef();
  const tampil = useCallback((p) => {
    setPesan(p);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setPesan(''), 3500);
  }, []);
  return (
    <ToastKonteks.Provider value={tampil}>
      {children}
      <div role="status" aria-live="polite" className="fixed z-50 bottom-4 inset-x-4 flex justify-center pointer-events-none">
        {pesan && <p className="muncul bg-ink text-white text-sm rounded-md px-4 py-2.5 shadow-lg">{pesan}</p>}
      </div>
    </ToastKonteks.Provider>
  );
}

// Tanda status kecil: titik dan teks, supaya tetap terbaca tanpa warna.
export function Tanda({ warna = 'faint', children }) {
  const titik = { faint: 'bg-line-strong', masuk: 'bg-masuk', tunggu: 'bg-[#c98a12]', galat: 'bg-galat' }[warna];
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] whitespace-nowrap">
      <span className={`size-1.5 rounded-full ${titik}`} />
      {children}
    </span>
  );
}
