<?php

namespace Tests\Feature;

use App\Models\Kelas;
use App\Models\Kelompok;
use App\Models\NotifikasiMidtrans;
use App\Models\TagihanQris;
use App\Models\Transaksi;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AlurUangTest extends TestCase
{
    use RefreshDatabase;

    private Kelompok $kelompok;

    private User $admin;

    private User $mahasiswa;

    protected function setUp(): void
    {
        parent::setUp();
        $this->app->detectEnvironment(fn () => 'local');
        config(['services.midtrans.server_key' => 'kunci-tes', 'services.midtrans.mdr' => 0.007, 'services.midtrans.demo' => true]);

        $kelas = Kelas::create(['nama' => 'Kelas A']);
        $this->kelompok = Kelompok::create(['kelas_id' => $kelas->id, 'nama' => 'Kelompok 1', 'modal' => 1000000, 'qris_id' => 'QRIS-KEL-0001']);
        $this->admin = $this->buatUser('admin@tes.test', 'admin');
        $this->mahasiswa = $this->buatUser('mhs@tes.test', 'mahasiswa', $this->kelompok->id);
    }

    private function buatUser(string $email, string $role, ?int $kelompokId = null): User
    {
        $u = new User;
        $u->forceFill(['name' => $email, 'email' => $email, 'password' => 'rahasia', 'role' => $role, 'kelompok_id' => $kelompokId])->save();

        return $u;
    }

    private function cairkanModal(): void
    {
        Sanctum::actingAs($this->admin);
        $this->postJson("/api/admin/kelompok/{$this->kelompok->id}/distribusi")->assertOk();
        Sanctum::actingAs($this->mahasiswa);
    }

    private function kirimCallback(string $orderId, string $status = 'settlement', string $gross = '10000.00', array $tambahan = [])
    {
        return $this->postJson('/api/midtrans/callback', $tambahan + [
            'order_id' => $orderId,
            'status_code' => '200',
            'gross_amount' => $gross,
            'transaction_status' => $status,
            'signature_key' => hash('sha512', $orderId.'200'.$gross.'kunci-tes'),
        ]);
    }

    private function tagihan(string $orderId = 'MD-1-abc', int $jumlah = 10000): TagihanQris
    {
        return TagihanQris::create(['order_id' => $orderId, 'kelompok_id' => $this->kelompok->id, 'jumlah' => $jumlah]);
    }

    public function test_distribusi_modal_masuk_saldo_dan_mencatat_admin(): void
    {
        $this->cairkanModal();

        $this->assertSame(1000000, (int) $this->kelompok->fresh()->saldo);
        $this->assertSame($this->admin->id, (int) Transaksi::where('tipe', 'modal')->value('oleh'));
    }

    public function test_modal_tidak_bisa_dicairkan_dua_kali(): void
    {
        $this->cairkanModal();
        Sanctum::actingAs($this->admin);

        $this->postJson("/api/admin/kelompok/{$this->kelompok->id}/distribusi")->assertStatus(422);
        $this->assertSame(['kelompok_didanai' => 0], $this->postJson('/api/admin/distribusi-semua')->json());
        $this->assertSame(1000000, (int) $this->kelompok->fresh()->saldo);
    }

    public function test_top_up_menambah_saldo(): void
    {
        Sanctum::actingAs($this->admin);

        $this->postJson("/api/admin/kelompok/{$this->kelompok->id}/topup", ['jumlah' => 5000])->assertCreated();

        $this->assertSame(5000, (int) $this->kelompok->fresh()->saldo);
    }

    public function test_withdraw_ditolak_sampai_modal_kembali(): void
    {
        $this->cairkanModal();

        $this->postJson('/api/kelompok-saya/simulasi-bayar', ['jumlah' => 100000])->assertOk();
        $this->postJson('/api/kelompok-saya/withdraw', ['jumlah' => 100000])->assertStatus(422);
        $this->postJson('/api/kelompok-saya/kembalikan-modal')->assertCreated();
        $this->postJson('/api/kelompok-saya/withdraw', ['jumlah' => 99301])->assertStatus(422);
        $this->postJson('/api/kelompok-saya/withdraw', ['jumlah' => 99300])->assertCreated();

        $this->assertSame(0, (int) $this->kelompok->fresh()->saldo);
    }

    public function test_penjualan_mencatat_biaya_mdr(): void
    {
        Sanctum::actingAs($this->mahasiswa);

        $this->postJson('/api/kelompok-saya/simulasi-bayar', ['jumlah' => 100000])->assertOk();

        $this->assertSame(99300, (int) $this->kelompok->fresh()->saldo);
        Sanctum::actingAs($this->admin);
        $this->getJson('/api/admin/laporan')->assertJson(['penjualan' => 100000, 'biaya_midtrans' => 700, 'laba_kotor' => 99300]);
        $this->getJson('/api/admin/laporan/kelompok')->assertJsonPath('data.0.laba', 99300);
    }

    public function test_callback_ditolak_tanpa_tanda_tangan_valid(): void
    {
        $this->tagihan();

        $this->kirimCallback('MD-1-abc', tambahan: ['signature_key' => 'palsu'])->assertStatus(403);

        $this->assertSame(0, (int) $this->kelompok->fresh()->saldo);
        $this->assertSame(0, NotifikasiMidtrans::count());
    }

    public function test_tagihan_baru_langsung_berstatus_menunggu(): void
    {
        $this->assertSame('menunggu', $this->tagihan()->status);
    }

    public function test_callback_ganda_hanya_menambah_saldo_sekali(): void
    {
        $tagihan = $this->tagihan();

        $this->kirimCallback('MD-1-abc')->assertOk();
        $this->kirimCallback('MD-1-abc')->assertOk();

        $this->assertSame(9930, (int) $this->kelompok->fresh()->saldo);
        $this->assertSame('lunas', $tagihan->fresh()->status);
        $this->assertSame(2, Transaksi::count());
    }

    public function test_callback_dengan_nominal_berbeda_tidak_diproses(): void
    {
        $tagihan = $this->tagihan();

        $this->kirimCallback('MD-1-abc', gross: '500.00')->assertOk();

        $this->assertSame(0, (int) $this->kelompok->fresh()->saldo);
        $this->assertSame('menunggu', $tagihan->fresh()->status);
        $this->assertSame('ditolak', NotifikasiMidtrans::value('status'));
    }

    public function test_tagihan_kedaluwarsa_ditandai_gagal(): void
    {
        $tagihan = $this->tagihan();

        $this->kirimCallback('MD-1-abc', 'expire')->assertOk();

        $this->assertSame('gagal', $tagihan->fresh()->status);
    }

    public function test_pembayaran_yatim_bisa_ditetapkan_admin_sekali(): void
    {
        $this->kirimCallback('LAIN-1')->assertOk();
        $this->kirimCallback('LAIN-1')->assertOk();
        $notifikasi = NotifikasiMidtrans::where('status', 'yatim')->sole();
        $this->assertSame(0, (int) $this->kelompok->fresh()->saldo);

        Sanctum::actingAs($this->admin);
        $url = "/api/admin/notifikasi/{$notifikasi->id}/tetapkan";
        $this->postJson($url, ['kelompok_id' => $this->kelompok->id])->assertOk();
        $this->postJson($url, ['kelompok_id' => $this->kelompok->id])->assertStatus(422);

        $this->assertSame(9930, (int) $this->kelompok->fresh()->saldo);
    }

    public function test_pembayaran_tanpa_tagihan_dicocokkan_lewat_kode_qris(): void
    {
        $this->kirimCallback('STATIS-1', tambahan: ['qris_id' => 'QRIS-KEL-0001'])->assertOk();

        $this->assertSame(9930, (int) $this->kelompok->fresh()->saldo);
    }

    public function test_status_tagihan_kelompok_lain_tidak_bisa_dibaca(): void
    {
        $kelompokLain = Kelompok::create(['kelas_id' => $this->kelompok->kelas_id, 'nama' => 'Lain', 'qris_id' => 'QRIS-KEL-0002']);
        TagihanQris::create(['order_id' => 'MD-2-xyz', 'kelompok_id' => $kelompokLain->id, 'jumlah' => 10000]);
        Sanctum::actingAs($this->mahasiswa);

        $this->getJson('/api/qris/MD-2-xyz')->assertNotFound();
    }

    public function test_mahasiswa_tidak_bisa_memakai_api_admin(): void
    {
        Sanctum::actingAs($this->mahasiswa);

        $this->getJson('/api/admin/laporan')->assertForbidden();
    }
}
