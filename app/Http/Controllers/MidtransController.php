<?php

namespace App\Http\Controllers;

use App\Models\Kelompok;
use App\Models\NotifikasiMidtrans;
use App\Models\TagihanQris;
use App\Models\Transaksi;
use App\Services\Ledger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Midtrans\Config;
use Midtrans\CoreApi;
use Midtrans\Transaction;

class MidtransController extends Controller
{
    public function __construct()
    {
        Config::$serverKey = config('services.midtrans.server_key');
        Config::$isProduction = (bool) config('services.midtrans.production');
        Config::$isSanitized = true;
    }

    public function generateQris(Request $request)
    {
        $amount = $request->validate(['amount' => 'required|integer|min:1000|max:10000000'])['amount'];
        $user = $request->user();
        abort_unless($user->kelompok_id, 404, 'Belum masuk kelompok');

        $tagihan = TagihanQris::create([
            'order_id' => 'MD-' . $user->kelompok_id . '-' . Str::lower(Str::random(12)),
            'kelompok_id' => $user->kelompok_id,
            'jumlah' => $amount,
            'kedaluwarsa_at' => now()->addMinutes(15),
            'oleh' => $user->id,
        ]);

        try {
            $response = CoreApi::charge([
                'payment_type' => 'qris',
                'qris' => ['acquirer' => 'gopay'],
                'transaction_details' => ['order_id' => $tagihan->order_id, 'gross_amount' => $amount],
                'customer_details' => ['first_name' => $user->name],
                'custom_expiry' => ['expiry_duration' => 15, 'unit' => 'minute'],
            ]);
        } catch (\Exception $e) {
            report($e);
            $tagihan->update(['status' => 'gagal']);
            return response()->json(['message' => 'QRIS gagal dibuat. Coba lagi sebentar lagi.'], 502);
        }

        $tagihan->update([
            'qr_string' => $response->qr_string ?? null,
            'qr_url' => collect($response->actions ?? [])->firstWhere('name', 'generate-qr-code')?->url,
        ]);

        return $this->tagihanJson($tagihan);
    }

    // Cadangan untuk callback yang tidak sampai, misalnya saat aplikasi jalan di localhost.
    public function statusTagihan(Request $request, string $orderId)
    {
        $tagihan = TagihanQris::where('order_id', $orderId)
            ->where('kelompok_id', $request->user()->kelompok_id)->firstOrFail();

        if ($tagihan->status === 'menunggu' && $tagihan->updated_at->lt(now()->subSeconds(15))) {
            $tagihan->touch();
            try {
                $status = Transaction::status($orderId);
                $this->terapkanStatus($tagihan, $status->transaction_status, (int) round((float) $status->gross_amount));
            } catch (\Exception $e) {
                Log::info('Status Midtrans belum tersedia', ['order_id' => $orderId, 'pesan' => $e->getMessage()]);
            }
        }

        return $this->tagihanJson($tagihan->fresh());
    }

    public function callback(Request $request)
    {
        $serverKey = (string) config('services.midtrans.server_key');
        $hashed = hash('sha512', $request->order_id . $request->status_code . $request->gross_amount . $serverKey);

        if ($serverKey === '' || !hash_equals($hashed, (string) $request->signature_key)) {
            Log::warning('Callback Midtrans ditolak', ['order_id' => $request->order_id, 'ip' => $request->ip()]);
            return response()->json(['message' => 'Tanda tangan tidak valid'], 403);
        }

        $orderId = (string) $request->order_id;
        $jumlah = (int) round((float) $request->gross_amount);
        $lunas = in_array($request->transaction_status, ['settlement', 'capture']);
        $tagihan = TagihanQris::where('order_id', $orderId)->first();
        $kelompokId = $tagihan?->kelompok_id;

        if ($tagihan) {
            $hasil = $this->terapkanStatus($tagihan, (string) $request->transaction_status, $jumlah);
        } elseif (!$lunas || Transaksi::where('ref', $orderId)->exists()) {
            $hasil = 'diabaikan';
        } else {
            // Pembayaran tanpa tagihan: cocokkan lewat kode QRIS kelompok, kalau tidak ada admin yang menetapkan.
            $kelompokId = Kelompok::where('qris_id', $request->input(config('services.midtrans.qris_field')))->value('id');
            $hasil = $kelompokId ? 'diproses' : 'yatim';
            if ($kelompokId) self::catatPenjualan($kelompokId, $jumlah, $orderId);
        }

        NotifikasiMidtrans::updateOrCreate(
            ['ref' => $orderId, 'status' => $hasil],
            ['jumlah' => $jumlah, 'kelompok_id' => $kelompokId, 'payload' => $request->all()]
        );

        return response()->json(['message' => 'Callback received']);
    }

    // Aman dipanggil berulang: ref yang sudah tercatat tidak menambah saldo lagi.
    public static function catatPenjualan(int $kelompokId, int $jumlah, string $ref): ?Transaksi
    {
        return DB::transaction(function () use ($kelompokId, $jumlah, $ref) {
            Kelompok::lockForUpdate()->findOrFail($kelompokId);
            if (Transaksi::where('ref', $ref)->exists()) return null;

            $penjualan = Ledger::catat($kelompokId, 'penjualan', $jumlah, $ref);
            $biaya = self::biaya($jumlah);
            if ($biaya > 0) Ledger::catat($kelompokId, 'biaya', -$biaya, $ref . '-MDR');
            return $penjualan;
        });
    }

    public static function biaya(int $jumlah): int
    {
        return (int) round($jumlah * (float) config('services.midtrans.mdr'));
    }

    private function terapkanStatus(TagihanQris $tagihan, string $status, int $jumlah): string
    {
        if (in_array($status, ['settlement', 'capture'])) {
            if ($jumlah !== (int) $tagihan->jumlah) {
                Log::warning('Nominal Midtrans tidak cocok', ['order_id' => $tagihan->order_id, 'jumlah' => $jumlah]);
                return 'ditolak';
            }
            DB::transaction(function () use ($tagihan) {
                self::catatPenjualan($tagihan->kelompok_id, (int) $tagihan->jumlah, $tagihan->order_id);
                $tagihan->update(['status' => 'lunas']);
            });
            return 'diproses';
        }
        if (in_array($status, ['cancel', 'deny', 'expire', 'failure'])) {
            if ($tagihan->status === 'menunggu') $tagihan->update(['status' => 'gagal']);
            return 'diproses';
        }
        return 'diabaikan';
    }

    private function tagihanJson(TagihanQris $t): array
    {
        return [
            'order_id' => $t->order_id,
            'jumlah' => (int) $t->jumlah,
            'biaya' => self::biaya((int) $t->jumlah),
            'status' => $t->status,
            'qr_string' => $t->qr_string,
            'qr_url' => $t->qr_url,
            'kedaluwarsa_at' => $t->kedaluwarsa_at?->toIso8601String(),
        ];
    }
}
