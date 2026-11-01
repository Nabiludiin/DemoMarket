<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        // Tagihan belum tentu jadi uang, jadi disimpan terpisah dari buku besar (transaksis).
        Schema::create('tagihan_qris', function (Blueprint $t) {
            $t->id();
            $t->string('order_id')->unique();
            $t->foreignId('kelompok_id')->constrained('kelompoks')->restrictOnDelete();
            $t->unsignedBigInteger('jumlah');
            $t->string('status')->default('menunggu');  // menunggu | lunas | gagal
            $t->text('qr_string')->nullable();
            $t->text('qr_url')->nullable();
            $t->timestamp('kedaluwarsa_at')->nullable();
            $t->foreignId('oleh')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamps();
        });
    }
    public function down(): void {
        Schema::dropIfExists('tagihan_qris');
    }
};
