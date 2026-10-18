<?php
namespace App\Http\Controllers;
use App\Models\Kelompok;
use App\Models\NotifikasiMidtrans;
use App\Services\Ledger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MidtransController extends Controller {
    public function __invoke(Request $r) {
        $payload = $r->all();
        $sig = hash('sha512', $r->order_id . $r->status_code . $r->gross_amount . config('services.midtrans.server_key'));
        if (!hash_equals($sig, (string) $r->signature_key)) {
            NotifikasiMidtrans::create(['status' => 'ditolak', 'payload' => $payload]);
            abort(403, 'Signature tidak valid');
        }

        $ref = (string) ($r->transaction_id ?? $r->order_id);
        $jumlah = (int) round((float) $r->gross_amount);
        if (!in_array($r->transaction_status, ['settlement', 'capture'])) {
            NotifikasiMidtrans::create(['ref' => $ref, 'status' => 'diabaikan', 'jumlah' => $jumlah, 'payload' => $payload]);
            return ['ok' => true];
        }
        if (NotifikasiMidtrans::where('ref', $ref)->whereIn('status', ['diproses', 'yatim'])->exists())
            return ['ok' => true, 'duplikat' => true];

        $kunci = config('services.midtrans.qris_field');
        $qris = $kunci ? data_get($payload, $kunci) : null;
        $k = $qris ? Kelompok::where('qris_id', $qris)->first() : null;

        DB::transaction(function () use ($k, $ref, $jumlah, $payload) {
            NotifikasiMidtrans::create(['ref' => $ref, 'status' => $k ? 'diproses' : 'yatim',
                'jumlah' => $jumlah, 'kelompok_id' => $k?->id, 'payload' => $payload]);
            if ($k) self::catatPenjualan($k->id, $jumlah, $ref);
        });
        return ['ok' => true];
    }

    public static function catatPenjualan(int $kelompokId, int $jumlah, string $ref): void {
        DB::transaction(function () use ($kelompokId, $jumlah, $ref) {
            Ledger::catat($kelompokId, 'penjualan', $jumlah, $ref);
            $biaya = (int) round($jumlah * (float) config('services.midtrans.mdr', 0.007));
            if ($biaya > 0) Ledger::catat($kelompokId, 'biaya', -$biaya, $ref . '-fee');
        });
    }
}