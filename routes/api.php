<?php
use App\Http\Controllers\{AdminController, AuthController, KelompokController, MidtransController};
use App\Http\Middleware\Role;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);

Route::post('/midtrans/notifikasi', MidtransController::class);

Route::middleware(['auth:sanctum', Role::class . ':admin'])->prefix('admin')->controller(AdminController::class)->group(function () {
    Route::get('dosen', 'dosen'); Route::post('dosen', 'simpanDosen');
    Route::get('kelas', 'kelas'); Route::post('kelas', 'simpanKelas');
    Route::get('kelompok', 'kelompok'); Route::post('kelompok', 'simpanKelompok');
    Route::post('kelompok/{kelompok}/anggota', 'tambahAnggota');
    Route::put('kelompok/{kelompok}/modal', 'aturModal');
    Route::post('kelompok/{kelompok}/distribusi', 'distribusi');
    Route::post('distribusi-semua', 'distribusiSemua');
    Route::post('kelompok/{kelompok}/topup', 'topUp');
    Route::get('kelompok/{kelompok}/riwayat', 'riwayat');
    Route::get('laporan', 'laporan');
});

Route::middleware(['auth:sanctum', Role::class . ':mahasiswa'])->prefix('kelompok-saya')->controller(KelompokController::class)->group(function () {
    Route::get('/', 'saya'); Route::get('qris', 'qris'); Route::get('riwayat', 'riwayat');
    Route::post('withdraw', 'withdraw'); Route::post('kembalikan-modal', 'kembalikanModal');
});