<?php
namespace App\Http\Controllers;
use App\Models\{Dosen, Kelas, Kelompok, Transaksi, User};
use App\Services\Ledger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AdminController extends Controller {
    // Dosen pengampu dan kelas
    public function dosen() { return Dosen::orderBy('nama')->get(); }
    public function simpanDosen(Request $r) { return Dosen::create($r->validate(['nama' => 'required', 'email' => 'nullable|email'])); }
    public function kelas() { return Kelas::with('dosen')->withCount('kelompoks')->get(); }
    public function simpanKelas(Request $r) { return Kelas::create($r->validate(['nama' => 'required', 'dosen_id' => 'nullable|exists:dosens,id'])); }

    // Kelompok dan anggota (mahasiswa)
    public function kelompok(Request $r) {
        return Kelompok::with('kelas.dosen')->when($r->kelas_id, fn($q, $id) => $q->where('kelas_id', $id))
            ->orderBy('id')->paginate(50);
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

    // Modal: atur nilai (hasil pitching), distribusi manual, top up saldo
    public function aturModal(Request $r, Kelompok $kelompok) {
        abort_if($kelompok->modal_cair_at, 422, 'Modal sudah didistribusikan');
        $kelompok->update($r->validate(['modal' => 'required|integer|min:0']));
        return $kelompok;
    }
    public function distribusi(Kelompok $kelompok) {
        abort_if($kelompok->modal_cair_at || $kelompok->modal < 1, 422, 'Modal kosong atau sudah didistribusikan');
        Ledger::catat($kelompok->id, 'modal', $kelompok->modal);
        $kelompok->update(['modal_cair_at' => now()]);
        return $kelompok->fresh();
    }
    public function distribusiSemua() {
        $n = 0;
        Kelompok::whereNull('modal_cair_at')->where('modal', '>', 0)->each(function ($k) use (&$n) { $this->distribusi($k); $n++; });
        return ['kelompok_didanai' => $n];
    }
    public function topUp(Request $r, Kelompok $kelompok) {
        $d = $r->validate(['jumlah' => 'required|integer|min:1']);
        return Ledger::catat($kelompok->id, 'topup', $d['jumlah']);
    }

    // Monitor dan laporan
    public function riwayat(Kelompok $kelompok) { return ['kelompok' => $kelompok, 'transaksi' => $kelompok->transaksis()->paginate(50)]; }
    public function laporan() {
        $sum = fn($tipe) => (int) Transaksi::where('tipe', $tipe)->sum('jumlah');
        $penjualan = $sum('penjualan'); $biaya = $sum('biaya');
        return ['modal_tersalur' => $sum('modal'), 'penjualan' => $penjualan, 'biaya_midtrans' => -$biaya,
            'laba_kotor' => $penjualan + $biaya, 'modal_kembali' => -$sum('pengembalian'), 'withdraw' => -$sum('withdraw'),
            'saldo_semua' => (int) Kelompok::sum('saldo')];
    }
}