<?php
namespace App\Http\Controllers;
use App\Models\Kelompok;
use App\Services\Ledger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class KelompokController extends Controller {
    private function k(Request $r): Kelompok {
        return $r->user()->kelompok_id ? Kelompok::findOrFail($r->user()->kelompok_id) : abort(404, 'Belum masuk kelompok');
    }
    private function demoAktif(): bool {
        return config('services.midtrans.demo') && app()->environment('local');
    }
    public function saya(Request $r) {
        $k = $this->k($r)->load('kelas.dosen');
        return ['kelompok' => $k, 'modal_belum_kembali' => $k->modalBelumKembali(), 'bisa_ditarik' => $k->bisaDitarik(),
            'mdr' => (float) config('services.midtrans.mdr'), 'demo' => $this->demoAktif()];
    }
    public function qris(Request $r) { $k = $this->k($r); return ['nama' => $k->nama, 'qris_id' => $k->qris_id]; }
    public function riwayat(Request $r) { return $this->k($r)->transaksis()->latest()->latest('id')->paginate(30); }

    public function withdraw(Request $r) {
        $id = $this->k($r)->id; $j = $r->validate(['jumlah' => 'required|integer|min:1'])['jumlah'];
        return DB::transaction(function () use ($id, $j) {
            $k = Kelompok::lockForUpdate()->findOrFail($id);
            abort_if($j > $k->bisaDitarik(), 422, 'Melebihi saldo yang boleh ditarik (modal harus kembali dulu)');
            // Tahap demo: dicatat saja. Pencairan sungguhan (Midtrans Iris) bisa ditambahkan nanti.
            return Ledger::catat($k->id, 'withdraw', -$j, null, ['status' => 'simulasi']);
        });
    }
    public function kembalikanModal(Request $r) {
        $id = $this->k($r)->id;
        return DB::transaction(function () use ($id) {
            $k = Kelompok::lockForUpdate()->findOrFail($id);
            $j = min($k->modalBelumKembali(), $k->saldo);
            abort_if($j < 1, 422, 'Tidak ada modal yang perlu dikembalikan');
            return Ledger::catat($k->id, 'pengembalian', -$j);
        });
    }
    public function simulasiBayar(Request $r) {
        abort_unless($this->demoAktif(), 403, 'Mode demo tidak aktif');
        $k = $this->k($r);
        $j = $r->validate(['jumlah' => 'required|integer|min:1000|max:100000'])['jumlah'];
        MidtransController::catatPenjualan($k->id, $j, 'DEMO-' . uniqid());
        return $this->saya($r);
    }
}
