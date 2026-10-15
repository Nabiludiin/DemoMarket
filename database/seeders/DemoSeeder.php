<?php
namespace Database\Seeders;
use App\Models\{Dosen, Kelas, Kelompok, User};
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DemoSeeder extends Seeder {
    public function run(): void {
        $mk = fn($n, $e, $role, $kid = null) => (new User)->forceFill(['name' => $n, 'email' => $e,
            'password' => Hash::make('password'), 'role' => $role, 'kelompok_id' => $kid])->save();
        $mk('Admin BPA', 'admin@bpa.test', 'admin');

        $dosen = collect(['Dosen Pengampu A', 'Dosen Pengampu B'])->map(fn($n) => Dosen::create(['nama' => $n]));
        $kelas = $dosen->values()->map(fn($d, $i) => Kelas::create(['nama' => 'Kelas ' . chr(65 + $i), 'dosen_id' => $d->id]));

        for ($i = 1; $i <= 416; $i++) {
            $k = Kelompok::create(['kelas_id' => $kelas[$i % 2]->id, 'nama' => 'Kelompok ' . $i,
                'modal' => random_int(4, 20) * 250000, 'qris_id' => 'QRIS-KEL-' . str_pad($i, 4, '0', STR_PAD_LEFT)]);
            if ($i <= 3) $mk("Mahasiswa $i", "mhs$i@kelompok.test", 'mahasiswa', $k->id);
        }
    }
}