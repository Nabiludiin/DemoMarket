import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { api, hari, jam, keluar, LABEL_TIPE, rp, rpTanda } from '../api';
import { Bidang, Dialog, InputRupiah, PesanGalat, StatusMuat, Tombol, useAksi, useMuat, useToast } from '../ui';

const CEPAT = [5000, 10000, 15000, 20000, 25000, 50000];

export default function Mahasiswa() {
  const saya = useMuat(() => api('/kelompok-saya'));
  const [menerima, setMenerima] = useState(false);
  const [riwayatKe, setRiwayatKe] = useState(0);
  const segarkan = () => { saya.muat(); setRiwayatKe((n) => n + 1); };

  if (menerima && saya.data) {
    return <Terima info={saya.data} selesai={() => { setMenerima(false); segarkan(); }} />;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-10">
      <header className="flex items-center justify-between h-14 mb-2 lg:mb-6">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <span aria-hidden className="size-2.5 bg-brand" />
          Market Day
        </p>
        <Tombol varian="hantu" ukuran="sm" className="-mr-3" onClick={keluar}>Keluar</Tombol>
      </header>
      <StatusMuat q={saya}>
        {(d) => (
          <div className="lg:grid lg:grid-cols-[380px_1fr] lg:gap-14 lg:items-start">
            <div className="lg:sticky lg:top-6">
              <Ringkasan d={d} terima={() => setMenerima(true)} segarkan={segarkan} />
            </div>
            <Riwayat kunci={riwayatKe} />
          </div>
        )}
      </StatusMuat>
    </div>
  );
}

function Ringkasan({ d, terima, segarkan }) {
  const [dialog, setDialog] = useState(null);
  const k = d.kelompok;
  const modal = Number(k.modal);
  const kembali = k.modal_cair_at ? modal - d.modal_belum_kembali : 0;
  const lunas = k.modal_cair_at && d.modal_belum_kembali === 0;

  return (
    <section>
      <h1 className="font-semibold">{k.nama}</h1>
      <p className="text-[13px] text-muted">{k.kelas?.nama}{k.kelas?.dosen && ` · ${k.kelas.dosen.nama}`}</p>

      <p className="text-sm text-muted mt-6">Saldo</p>
      <p className="text-[44px] leading-[1.1] font-semibold tracking-tight">{rp(k.saldo)}</p>

      <Tombol varian="primer" ukuran="lg" className="w-full mt-6" onClick={terima}>Terima pembayaran</Tombol>

      <dl className="mt-6 border-t border-line text-sm">
        <div className="flex justify-between py-3 border-b border-line">
          <dt className="text-muted">Bisa ditarik</dt>
          <dd className="font-medium">{rp(d.bisa_ditarik)}</dd>
        </div>
        <div className="py-3 border-b border-line">
          <div className="flex justify-between">
            <dt className="text-muted">Modal yang harus kembali</dt>
            <dd className="font-medium">{k.modal_cair_at ? rp(d.modal_belum_kembali) : '—'}</dd>
          </div>
          {k.modal_cair_at ? (
            <>
              <div className="h-1 bg-line rounded-full mt-2.5 overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={modal} aria-valuenow={kembali} aria-label="Modal yang sudah kembali">
                <div className="h-full bg-ink" style={{ width: `${modal ? (kembali / modal) * 100 : 0}%` }} />
              </div>
              <p className="text-[13px] text-muted mt-1.5">{lunas ? 'Modal sudah lunas.' : `${rp(kembali)} dari ${rp(modal)} sudah kembali.`}</p>
            </>
          ) : (
            <p className="text-[13px] text-muted mt-1">Modal belum disalurkan BPA. Anda tetap bisa berjualan.</p>
          )}
        </div>
      </dl>

      <div className="grid grid-cols-2 gap-2 mt-4">
        <Tombol disabled={d.modal_belum_kembali < 1 || k.saldo < 1} onClick={() => setDialog('modal')}>Kembalikan modal</Tombol>
        <Tombol disabled={d.bisa_ditarik < 1} onClick={() => setDialog('tarik')}>Tarik saldo</Tombol>
      </div>
      {d.bisa_ditarik < 1 && d.modal_belum_kembali > 0 && (
        <p className="text-[13px] text-muted mt-2">Saldo bisa ditarik setelah modal kembali seluruhnya.</p>
      )}

      <p className="text-[13px] text-muted mt-5">Kode QRIS kelompok: <span className="font-mono text-ink">{k.qris_id}</span></p>

      <DialogKembalikan buka={dialog === 'modal'} tutup={() => setDialog(null)} d={d} selesai={segarkan} />
      <DialogTarik buka={dialog === 'tarik'} tutup={() => setDialog(null)} d={d} selesai={segarkan} />
    </section>
  );
}

function DialogKembalikan({ buka, tutup, d, selesai }) {
  const { sibuk, galat, jalan } = useAksi();
  const toast = useToast();
  const saldo = Number(d.kelompok.saldo);
  const jumlah = Math.min(d.modal_belum_kembali, saldo);
  const sisa = d.modal_belum_kembali - jumlah;

  const kirim = () => jalan(async () => {
    await api('/kelompok-saya/kembalikan-modal', 'POST');
    tutup(); selesai(); toast(`${rp(jumlah)} dikembalikan ke BPA`);
  });

  return (
    <Dialog buka={buka} tutup={tutup} judul={`Kembalikan ${rp(jumlah)} ke BPA?`}>
      <p className="text-sm text-muted">
        {sisa > 0
          ? `Saldo belum cukup untuk melunasi modal. Masih tersisa ${rp(sisa)} yang harus dikembalikan nanti.`
          : 'Modal lunas setelah ini, dan keuntungan kelompok bisa ditarik.'}
      </p>
      <dl className="my-4 text-sm border-y border-line py-3 flex justify-between">
        <dt className="text-muted">Saldo setelahnya</dt>
        <dd className="font-medium">{rp(saldo - jumlah)}</dd>
      </dl>
      <PesanGalat>{galat}</PesanGalat>
      <div className="flex gap-2 justify-end mt-4">
        <Tombol onClick={tutup}>Batal</Tombol>
        <Tombol varian="primer" disabled={sibuk} onClick={kirim}>{sibuk ? 'Memproses…' : 'Kembalikan'}</Tombol>
      </div>
    </Dialog>
  );
}

function DialogTarik({ buka, tutup, d, selesai }) {
  const [jumlah, setJumlah] = useState('');
  const { sibuk, galat, jalan } = useAksi();
  const toast = useToast();
  const lebih = jumlah > d.bisa_ditarik;

  function kirim(e) {
    e.preventDefault();
    jalan(async () => {
      await api('/kelompok-saya/withdraw', 'POST', { jumlah });
      tutup(); setJumlah(''); selesai(); toast(`Penarikan ${rp(jumlah)} dicatat`);
    });
  }

  return (
    <Dialog buka={buka} tutup={tutup} judul="Tarik saldo">
      <form onSubmit={kirim} className="space-y-4">
        <Bidang label="Jumlah" bantuan={lebih ? `Melebihi batas ${rp(d.bisa_ditarik)}.` : `Maksimal ${rp(d.bisa_ditarik)}.`}>
          <div className="flex gap-2">
            <InputRupiah className="flex-1" autoFocus value={jumlah} onChange={setJumlah} />
            <Tombol onClick={() => setJumlah(d.bisa_ditarik)}>Semua</Tombol>
          </div>
        </Bidang>
        <p className="text-[13px] text-tunggu bg-tunggu-soft rounded-md px-3 py-2.5">Tahap demo: penarikan hanya dicatat di sistem. Belum ada uang yang dikirim ke rekening.</p>
        <PesanGalat>{galat}</PesanGalat>
        <div className="flex gap-2 justify-end">
          <Tombol onClick={tutup}>Batal</Tombol>
          <Tombol type="submit" varian="primer" disabled={sibuk || !jumlah || lebih}>{sibuk ? 'Memproses…' : 'Tarik saldo'}</Tombol>
        </div>
      </form>
    </Dialog>
  );
}

function Riwayat({ kunci }) {
  const [baris, setBaris] = useState([]);
  const [hal, setHal] = useState({ kini: 0, akhir: 1 });
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState('');

  async function ambil(n) {
    setMemuat(true); setGalat('');
    try {
      const r = await api(`/kelompok-saya/riwayat?page=${n}`);
      setBaris((b) => (n === 1 ? r.data : [...b, ...r.data]));
      setHal({ kini: r.current_page, akhir: r.last_page });
    } catch (e) { setGalat(e.message); } finally { setMemuat(false); }
  }
  useEffect(() => { ambil(1); }, [kunci]);

  const perHari = baris.reduce((g, t) => {
    const h = hari(t.created_at);
    (g[h] ||= []).push(t);
    return g;
  }, {});

  return (
    <section className="mt-10 lg:mt-0">
      <h2 className="font-semibold mb-1">Riwayat</h2>
      {!memuat && !galat && baris.length === 0 && (
        <p className="text-sm text-muted py-6 border-t border-line mt-3">Belum ada transaksi. Pembayaran pertama akan muncul di sini.</p>
      )}
      {Object.entries(perHari).map(([h, daftar]) => (
        <div key={h} className="mt-4">
          <h3 className="text-[13px] text-muted pb-1.5 border-b border-line">{h}</h3>
          <ul>
            {daftar.map((t) => (
              <li key={t.id} className="flex items-baseline justify-between gap-4 py-2.5 border-b border-line">
                <span className="text-sm min-w-0">
                  {LABEL_TIPE[t.tipe] ?? t.tipe}
                  {t.meta?.status === 'simulasi' && <span className="text-muted"> (dicatat)</span>}
                  <span className="block text-[13px] text-muted">{jam(t.created_at)}</span>
                </span>
                <span className={`text-sm font-medium ${t.jumlah > 0 ? 'text-masuk' : ''}`}>{rpTanda(t.jumlah)}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {galat && <div className="mt-4"><PesanGalat>{galat}</PesanGalat></div>}
      {hal.kini < hal.akhir && (
        <Tombol className="w-full mt-4" disabled={memuat} onClick={() => ambil(hal.kini + 1)}>{memuat ? 'Memuat…' : 'Tampilkan lebih banyak'}</Tombol>
      )}
    </section>
  );
}

// Layar penuh: dipakai di depan pembeli, jadi tidak ada informasi keuangan kelompok di sini.
function Terima({ info, selesai }) {
  const [tagihan, setTagihan] = useState(null);
  const [terbayar, setTerbayar] = useState(null);

  const ulang = () => { setTagihan(null); setTerbayar(null); };

  return (
    <main className="min-h-dvh flex flex-col max-w-md mx-auto px-5 pb-6">
      {terbayar ? (
        <Berhasil jumlah={terbayar.jumlah} biaya={terbayar.biaya} lagi={ulang} selesai={selesai} />
      ) : tagihan ? (
        <TampilQr tagihan={tagihan} nama={info.kelompok.nama} batal={ulang} lunas={setTerbayar} />
      ) : (
        <IsiNominal info={info} batal={selesai} dibuat={setTagihan} terbayar={setTerbayar} />
      )}
    </main>
  );
}

function IsiNominal({ info, batal, dibuat, terbayar }) {
  const [jumlah, setJumlah] = useState('');
  const { sibuk, galat, jalan } = useAksi();
  const [menyimulasi, setMenyimulasi] = useState(false);
  const valid = jumlah >= 1000;

  function buat(e) {
    e.preventDefault();
    jalan(async () => dibuat(await api('/qris/generate', 'POST', { amount: jumlah })));
  }
  const simulasi = () => {
    setMenyimulasi(true);
    jalan(async () => {
      await api('/kelompok-saya/simulasi-bayar', 'POST', { jumlah });
      terbayar({ jumlah, biaya: Math.round(jumlah * info.mdr) });
    }).finally(() => setMenyimulasi(false));
  };

  return (
    <form onSubmit={buat} className="flex flex-col flex-1">
      <div className="flex items-center h-14 -ml-3">
        <Tombol varian="hantu" ukuran="sm" onClick={batal}>← Kembali</Tombol>
      </div>
      <h1 className="text-lg font-semibold mt-4">Berapa yang harus dibayar?</h1>
      <div className="flex items-baseline gap-2 border-b-2 border-ink mt-6 pb-1 focus-within:border-brand">
        <span className="text-2xl font-medium text-muted">Rp</span>
        <input
          autoFocus
          inputMode="numeric"
          autoComplete="off"
          aria-label="Nominal pembayaran"
          placeholder="0"
          className="w-full min-w-0 bg-transparent text-[40px] leading-tight font-semibold tracking-tight placeholder:text-line-strong focus:outline-none"
          value={jumlah === '' ? '' : Number(jumlah).toLocaleString('id-ID')}
          onChange={(e) => {
            const a = e.target.value.replace(/\D/g, '').slice(0, 8);
            setJumlah(a === '' ? '' : Number(a));
          }}
        />
      </div>
      <div className="grid grid-cols-3 gap-2 mt-5">
        {CEPAT.map((n) => (
          <Tombol key={n} aria-pressed={jumlah === n} className={jumlah === n ? '!border-ink ring-1 ring-ink' : ''} onClick={() => setJumlah(n)}>
            {n / 1000}rb
          </Tombol>
        ))}
      </div>
      <p className="text-[13px] text-muted mt-3">
        {valid ? `Masuk ke saldo ${rp(jumlah - Math.round(jumlah * info.mdr))} setelah biaya QRIS ${(info.mdr * 100).toLocaleString('id-ID')}%.` : 'Minimal Rp1.000.'}
      </p>
      <div className="mt-auto pt-8 space-y-3">
        <PesanGalat>{galat}</PesanGalat>
        <Tombol type="submit" varian="primer" ukuran="lg" className="w-full" disabled={!valid || sibuk}>{sibuk && !menyimulasi ? 'Membuat QRIS…' : 'Tampilkan QRIS'}</Tombol>
        {info.demo && (
          <Tombol varian="hantu" className="w-full" disabled={!valid || jumlah > 100000 || sibuk} onClick={simulasi}>{menyimulasi ? 'Menyimulasikan…' : 'Simulasikan pembayaran (mode demo)'}</Tombol>
        )}
      </div>
    </form>
  );
}

function TampilQr({ tagihan, nama, batal, lunas }) {
  const [status, setStatus] = useState(tagihan.status);
  const [sisa, setSisa] = useState(() => detikSisa(tagihan));

  useEffect(() => {
    if (status !== 'menunggu') return;
    const tanya = setInterval(async () => {
      try {
        const t = await api(`/qris/${tagihan.order_id}`);
        setStatus(t.status);
        if (t.status === 'lunas') lunas(t);
      } catch { /* koneksi ponsel di stan sering putus; dicoba lagi di putaran berikutnya */ }
    }, 4000);
    const detik = setInterval(() => setSisa(detikSisa(tagihan)), 1000);
    return () => { clearInterval(tanya); clearInterval(detik); };
  }, [status]);

  const habis = status === 'gagal' || sisa <= 0;

  return (
    <div className="flex flex-col flex-1">
      <div className="flex items-center h-14 -ml-3">
        <Tombol varian="hantu" ukuran="sm" onClick={batal}>← Ubah nominal</Tombol>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center text-center py-4">
        <p className="text-sm text-muted">{nama}</p>
        <p className="text-[34px] leading-tight font-semibold tracking-tight">{rp(tagihan.jumlah)}</p>
        <div className={`mt-5 p-4 bg-white rounded-lg border border-line w-full max-w-[320px] aspect-square grid place-items-center ${habis ? 'opacity-25' : ''}`}>
          {tagihan.qr_string
            ? <QRCodeSVG value={tagihan.qr_string} size={280} level="M" className="w-full h-full" title="Kode QRIS pembayaran" />
            : <img src={tagihan.qr_url} alt="Kode QRIS pembayaran" className="w-full h-full object-contain" />}
        </div>
        {habis ? (
          <div className="mt-5">
            <p className="font-medium">QRIS ini sudah tidak berlaku</p>
            <Tombol varian="primer" className="mt-3" onClick={batal}>Buat QRIS baru</Tombol>
          </div>
        ) : (
          <p className="mt-5 text-sm flex items-center gap-2" aria-live="polite">
            <span className="size-2 rounded-full bg-[#c98a12] denyut" />
            Menunggu pembayaran · {Math.floor(sisa / 60)}:{String(sisa % 60).padStart(2, '0')}
          </p>
        )}
      </div>
    </div>
  );
}

const detikSisa = (t) => Math.max(0, Math.floor((new Date(t.kedaluwarsa_at) - Date.now()) / 1000));

function Berhasil({ jumlah, biaya, lagi, selesai }) {
  return (
    <div className="muncul flex flex-col flex-1">
      <div className="flex-1 flex flex-col justify-center" role="status">
        <span className="size-14 rounded-full bg-masuk grid place-items-center mb-6">
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 13.5l5.5 5.5L21 8" /></svg>
        </span>
        <p className="text-sm text-muted">Pembayaran diterima</p>
        <p className="text-[44px] leading-[1.1] font-semibold tracking-tight">{rp(jumlah)}</p>
        <p className="text-sm text-muted mt-2">{rp(jumlah - biaya)} masuk ke saldo setelah biaya QRIS {rp(biaya)}.</p>
      </div>
      <div className="space-y-2">
        <Tombol varian="primer" ukuran="lg" className="w-full" onClick={lagi}>Terima pembayaran lagi</Tombol>
        <Tombol varian="hantu" className="w-full" onClick={selesai}>Selesai</Tombol>
      </div>
    </div>
  );
}
