<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Transaksi;
use Midtrans\Config;
use Midtrans\CoreApi;

class MidtransController extends Controller
{
    public function __construct()
    {
        Config::$serverKey = env('MIDTRANS_SERVER_KEY');
        Config::$isProduction = env('MIDTRANS_IS_PRODUCTION', false);
        Config::$isSanitized = true;
        Config::$is3ds = true;
    }

    public function generateQris(Request $request)
    {
        $request->validate([
            'amount' => 'required|numeric|min:1000'
        ]);

        $user = $request->user();
        $orderId = 'QRIS-' . $user->kelompok_id . '-' . time();
        $amount = $request->amount;

        $params = [
            'payment_type' => 'gopay',
            'transaction_details' => [
                'order_id' => $orderId,
                'gross_amount' => $amount,
            ],
            'customer_details' => [
                'first_name' => $user->name,
            ]
        ];

        try {
            $response = CoreApi::charge($params);
            
            Transaksi::create([
                'kelompok_id' => $user->kelompok_id,
                'order_id' => $orderId,
                'amount' => $amount,
                'tipe' => 'qris_in',
                'status' => 'pending'
            ]);

            $qrCodeUrl = $response->actions[0]->url;

            return response()->json([
                'status' => 'success',
                'qr_url' => $qrCodeUrl,
                'order_id' => $orderId
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage()
            ], 500);
        }
    }
    public function callback(Request $request)
    {
        $serverKey = env('MIDTRANS_SERVER_KEY');
        $hashed = hash("sha512", $request->order_id . $request->status_code . $request->gross_amount . $serverKey);

        if ($hashed == $request->signature_key) {
            $transaksi = Transaksi::where('order_id', $request->order_id)->first();
            
            if ($transaksi) {
                if ($request->transaction_status == 'settlement' || $request->transaction_status == 'capture') {
                    $transaksi->update(['status' => 'success']);
                    
                    $kelompok = \App\Models\Kelompok::find($transaksi->kelompok_id);
                    if ($kelompok) {
                        $kelompok->increment('saldo', $transaksi->amount);
                    }
                } elseif (in_array($request->transaction_status, ['cancel', 'deny', 'expire'])) {
                    $transaksi->update(['status' => 'failed']);
                }
            }
        }

        return response()->json(['message' => 'Callback received']);
    }
    public static function catatPenjualan(int $kelompok_id, int $amount, $tipe = 'qris_in', $status = 'pending')
{
    return Transaksi::create([
        'kelompok_id' => $kelompok_id,
        'order_id' => 'TRX-' . $kelompok_id . '-' . time(),
        'amount' => $amount,
        'tipe' => $tipe,
        'status' => $status
    ]);
}
}