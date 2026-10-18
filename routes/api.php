<?php

use App\Http\Controllers\{AdminController, AuthController, KelompokController, MidtransController};
use App\Http\Middleware\Role;
use Illuminate\Support\Facades\Route;

// Auth & Midtrans
Route::post('/login', [AuthController::class, 'login']);
Route::post('/midtrans/callback', [MidtransController::class, 'callback']);

// Endpoint Generate QRIS dari frontend
Route::middleware(['auth:sanctum'])->group(function () {
    Route::post('/qris/generate', [MidtransController::class, 'generateQris']);
});

// Endpoint Admin
Route::middleware(['auth:sanctum', Role::class . ':admin'])->prefix('admin')->controller(AdminController::class)->group(function () {
    Route::get('dosen', 'dosen'); Route::post('dosen', 'simpanDosen');
    Route::get('kelas', 'kelas'); Route::post('kelas', 'simpanKelas');
    Route::put('kelas/{kelas}', 'ubahKelas');
    Route::get('kelompok', 'kelompok'); Route::post('kelompok', 'simpanKelompok');
    Route::post('kelompok/{kelompok}/anggota', 'tambahAnggota');
    Route::put('kelompok/{kelompok}/modal', 'aturModal');
    Route::post('kelompok/{kelompok}/distribusi', 'distribusi');
    Route::post('distribusi-semua', 'distribusiSemua');
    Route::post('kelompok/{kelompok}/topup', 'topUp');
    Route::get('kelompok/{kelompok}/riwayat', 'riwayat');
    Route::get('laporan', 'laporan');
    Route::get('notifikasi', 'notifikasi');
    Route::post('notifikasi/{notifikasi}/tetapkan', 'tetapkan');
});

// Endpoint Mahasiswa
Route::middleware(['auth:sanctum', Role::class . ':mahasiswa'])->prefix('kelompok-saya')->controller(KelompokController::class)->group(function () {
    Route::get('/', 'saya'); Route::get('qris', 'qris'); Route::get('riwayat', 'riwayat');
    Route::post('withdraw', 'withdraw'); Route::post('kembalikan-modal', 'kembalikanModal');
    Route::post('simulasi-bayar', 'simulasiBayar');
});