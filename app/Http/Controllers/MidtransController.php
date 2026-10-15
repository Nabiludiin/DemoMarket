<?php
namespace App\Http\Controllers;
use App\Models\{Kelompok, Transaksi};
use App\Services\Ledger;
use Illuminate\Http\Request;

class MidtransController extends Controller {
    public function __invoke(Request $r) {
        $sig = hash('sha512', $r->order_id . $r->status_code . $r->gross_amount . config('services.midtrans.server_key'));
        abort_unless(hash_equals($sig, (string) $r->signature_key), 403, 'Signature tidak valid');
        if (!in_array($r->transaction_status, ['settlement', 'capture'])) return ['ok' => true];

        $ref = (string) ($r->transaction_id ?? $r->order_id);
        if (Transaksi::where('ref', $ref)->exists()) return ['ok' => true, 'duplikat' => true];

        $k = Kelompok::where('qris_id', $r->input(config('services.midtrans.qris_field')))->first();
        if (!$k) return response()->json(['ok' => false, 'pesan' => 'QRIS tidak dikenali'], 202);

        $jumlah = (int) round((float) $r->gross_amount);
        Ledger::catat($k->id, 'penjualan', $jumlah, $ref);
        $biaya = (int) round($jumlah * (float) config('services.midtrans.mdr', 0.007));
        if ($biaya > 0) Ledger::catat($k->id, 'biaya', -$biaya, $ref . '-fee');
        return ['ok' => true];
    }
}