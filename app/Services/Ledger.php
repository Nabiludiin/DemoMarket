<?php
namespace App\Services;
use App\Models\{Kelompok, Transaksi};
use Illuminate\Support\Facades\DB;

class Ledger {
    public static function catat(int $kelompokId, string $tipe, int $jumlah, ?string $ref = null, array $meta = []): Transaksi {
        return DB::transaction(function () use ($kelompokId, $tipe, $jumlah, $ref, $meta) {
            $k = Kelompok::lockForUpdate()->findOrFail($kelompokId);
            $baru = $k->saldo + $jumlah;
            if ($baru < 0) throw new \DomainException('Saldo tidak cukup');
            $k->update(['saldo' => $baru]);
            return Transaksi::create(['kelompok_id' => $k->id, 'tipe' => $tipe, 'jumlah' => $jumlah,
                'saldo_akhir' => $baru, 'ref' => $ref, 'meta' => $meta ?: null]);
        });
    }
}