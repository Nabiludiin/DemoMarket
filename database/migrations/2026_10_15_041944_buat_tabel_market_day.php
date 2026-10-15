<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('dosens', function (Blueprint $t) {
            $t->id(); $t->string('nama'); $t->string('email')->nullable(); $t->timestamps();
        });
        Schema::create('kelas', function (Blueprint $t) {
            $t->id(); $t->string('nama');
            $t->foreignId('dosen_id')->nullable()->constrained('dosens')->nullOnDelete();
            $t->timestamps();
        });
        Schema::create('kelompoks', function (Blueprint $t) {
            $t->id();
            $t->foreignId('kelas_id')->constrained('kelas')->cascadeOnDelete();
            $t->string('nama');
            $t->unsignedBigInteger('modal')->default(0);
            $t->unsignedBigInteger('saldo')->default(0);
            $t->timestamp('modal_cair_at')->nullable();
            $t->string('qris_id')->unique();
            $t->timestamps();
        });
        Schema::table('users', function (Blueprint $t) {
            $t->string('role')->default('mahasiswa');
            $t->foreignId('kelompok_id')->nullable()->constrained('kelompoks')->nullOnDelete();
        });
        Schema::create('transaksis', function (Blueprint $t) {
            $t->id();
            $t->foreignId('kelompok_id')->constrained('kelompoks')->cascadeOnDelete();
            $t->string('tipe');
            $t->bigInteger('jumlah');
            $t->bigInteger('saldo_akhir');
            $t->string('ref')->nullable()->unique();
            $t->json('meta')->nullable();
            $t->timestamps();
        });
    }
    public function down(): void {
        Schema::dropIfExists('transaksis');
        Schema::table('users', function (Blueprint $t) { $t->dropConstrainedForeignId('kelompok_id'); $t->dropColumn('role'); });
        Schema::dropIfExists('kelompoks'); Schema::dropIfExists('kelas'); Schema::dropIfExists('dosens');
    }
};