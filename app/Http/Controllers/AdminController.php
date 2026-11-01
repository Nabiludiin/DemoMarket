<?php
namespace App\Http\Controllers;

use Illuminate\Support\Facades\DB;
use App\Models\Dosen;
use App\Models\Kelas;
use App\Models\Kelompok;
use App\Models\Transaksi;
use App\Models\User;
use App\Models\NotifikasiMidtrans;
use App\Services\Ledger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AdminController extends Controller {
    
    public function dosen() { 
        return Dosen::orderBy('nama')->get(); 
    }
    
    public function simpanDosen(Request $r) { 
        return Dosen::create($r->validate(['nama' => 'required', 'email' => 'nullable|email'])); 
    }
    
    public function kelas() { 
        return Kelas::with('dosen')->withCount('kelompoks')->get(); 
    }
    
    public function simpanKelas(Request $r) { 
        return Kelas::create($r->validate(['nama' => 'required', 'dosen_id' => 'nullable|exists:dosens,id'])); 
    }

    public function kelompok(Request $r) {
        return Kelompok::with('kelas.dosen')->withCount('anggota')
            ->when($r->kelas_id, fn($q, $id) => $q->where('kelas_id', $id))
            ->when($r->q, fn($q, $cari) => $q->where(fn($w) => $w->where('nama', 'like', "%$cari%")->orWhere('qris_id', 'like', "%$cari%")))
            ->when($r->status === 'belum_cair', fn($q) => $q->whereNull('modal_cair_at'))
            ->when($r->status === 'cair', fn($q) => $q->whereNotNull('modal_cair_at'))
            ->orderBy('id')->paginate(50);
    }

    public function ringkasan(Request $r) {
        $q = fn() => Kelompok::query()->when($r->kelas_id, fn($q, $id) => $q->where('kelas_id', $id));
        $siap = fn() => $q()->whereNull('modal_cair_at')->where('modal', '>', 0);
        return ['kelompok' => $q()->count(), 'sudah_cair' => $q()->whereNotNull('modal_cair_at')->count(),
            'siap_cair' => $siap()->count(), 'modal_siap_cair' => (int) $siap()->sum('modal'), 'saldo' => (int) $q()->sum('saldo'),
            'notifikasi_yatim' => NotifikasiMidtrans::where('status', 'yatim')->count()];
    }
    
    public function simpanKelompok(Request $r) {
        $d = $r->validate(['kelas_id' => 'required|exists:kelas,id', 'nama' => 'required', 'modal' => 'nullable|integer|min:0']);
        $k = Kelompok::create($d + ['qris_id' => 'TMP-' . uniqid()]);
        $k->update(['qris_id' => 'QRIS-KEL-' . str_pad($k->id, 4, '0', STR_PAD_LEFT)]);
        return $k;
    }
    
    public function tambahAnggota(Request $r, Kelompok $kelompok) {
        $d = $r->validate(['name' => 'required', 'email' => 'required|email|unique:users', 'password' => 'required|min:6']);
        (new User)->forceFill(['name' => $d['name'], 'email' => $d['email'], 'password' => Hash::make($d['password']),
            'role' => 'mahasiswa', 'kelompok_id' => $kelompok->id])->save();
        return $kelompok->anggota()->get();
    }

    public function aturModal(Request $r, Kelompok $kelompok) {
        abort_if(!is_null($kelompok->modal_cair_at), 422, 'Modal sudah didistribusikan');
        $kelompok->update($r->validate(['modal' => 'required|integer|min:0']));
        return $kelompok;
    }
    
    // Dicek ulang di dalam lock supaya klik ganda tidak mencairkan modal dua kali.
    private function cairkan(int $id): bool {
        return DB::transaction(function () use ($id) {
            $k = Kelompok::lockForUpdate()->findOrFail($id);
            if (!is_null($k->modal_cair_at) || $k->modal < 1) return false;
            Ledger::catat($k->id, 'modal', $k->modal);
            $k->update(['modal_cair_at' => now()]);
            return true;
        });
    }

    public function distribusi(Kelompok $kelompok) {
        abort_unless($this->cairkan($kelompok->id), 422, 'Modal kosong atau sudah didistribusikan');
        return $kelompok->fresh();
    }
    
    public function ubahKelas(Request $r, Kelas $kelas) {
        $kelas->update($r->validate(['dosen_id' => 'nullable|exists:dosens,id']));
        return $kelas->load('dosen');
    }
    
    public function distribusiSemua(Request $r) {
        $ids = Kelompok::whereNull('modal_cair_at')->where('modal', '>', 0)
            ->when($r->kelas_id, fn($q, $id) => $q->where('kelas_id', $id))
            ->pluck('id');

        return ['kelompok_didanai' => $ids->filter(fn($id) => $this->cairkan($id))->count()];
    }
    
    public function topUp(Request $r, Kelompok $kelompok) {
        $d = $r->validate(['jumlah' => 'required|integer|min:1']);
        return Ledger::catat($kelompok->id, 'topup', $d['jumlah']);
    }

    public function riwayat(Kelompok $kelompok) { 
        $kelompok->load('kelas.dosen', 'anggota:id,name,email,kelompok_id');
        return ['kelompok' => $kelompok, 'modal_belum_kembali' => $kelompok->modalBelumKembali(), 'bisa_ditarik' => $kelompok->bisaDitarik(),
            'transaksi' => $kelompok->transaksis()->latest()->latest('id')->paginate(30)];
    }
    
    public function laporan() {
        $sum = fn($tipe) => (int) Transaksi::where('tipe', $tipe)->sum('jumlah');
        $penjualan = $sum('penjualan'); $biaya = $sum('biaya');
        return ['modal_tersalur' => $sum('modal'), 'topup' => $sum('topup'), 'penjualan' => $penjualan, 'biaya_midtrans' => -$biaya,
            'laba_kotor' => $penjualan + $biaya, 'modal_kembali' => -$sum('pengembalian'), 'withdraw' => -$sum('withdraw'),
            'saldo_semua' => (int) Kelompok::sum('saldo')];
    }

    public function laporanKelompok(Request $r) {
        $jumlah = fn($tipe) => fn($q) => $q->whereIn('tipe', (array) $tipe);
        return Kelompok::with('kelas:id,nama')
            ->withSum(['transaksis as penjualan' => $jumlah('penjualan')], 'jumlah')
            ->withSum(['transaksis as biaya' => $jumlah('biaya')], 'jumlah')
            ->withSum(['transaksis as laba' => $jumlah(['penjualan', 'biaya'])], 'jumlah')
            ->withSum(['transaksis as dikembalikan' => $jumlah('pengembalian')], 'jumlah')
            ->withSum(['transaksis as ditarik' => $jumlah('withdraw')], 'jumlah')
            ->when($r->kelas_id, fn($q, $id) => $q->where('kelas_id', $id))
            ->orderByDesc('laba')->orderBy('id')->paginate(50);
    }

    // Yang masih perlu tindakan admin ditampilkan paling atas.
    public function notifikasi() {
        return NotifikasiMidtrans::orderByRaw("case when status = 'yatim' then 0 else 1 end")->latest()->latest('id')->limit(50)
            ->get(['id', 'ref', 'status', 'jumlah', 'kelompok_id', 'created_at']);
    }
    
    public function tetapkan(Request $r, NotifikasiMidtrans $notifikasi) {
        abort_unless($notifikasi->status === 'yatim', 422, 'Notifikasi ini sudah diproses');
        $d = $r->validate(['kelompok_id' => 'required|exists:kelompoks,id']);
        DB::transaction(function () use ($notifikasi, $d) {
            MidtransController::catatPenjualan($d['kelompok_id'], $notifikasi->jumlah, $notifikasi->ref);
            $notifikasi->update(['status' => 'diproses', 'kelompok_id' => $d['kelompok_id']]);
        });
        return $notifikasi->fresh();
    }
}