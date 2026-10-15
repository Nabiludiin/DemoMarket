<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Kelompok extends Model 
{
    protected $guarded = [];
    protected $casts = ['modal_cair_at' => 'datetime'];
    public function kelas()
    {
        return $this->belongsTo(Kelas::class);
    }
    public function anggota() 
    {
        return $this->hasMany(User::class);
    }
    public function transaksis() 
    { 
        return $this->hasMany(Transaksi::class)->latest();
    }

    public function modalBelumKembali(): int 
    {
        if (!$this->modal_cair_at) return 0;
        $kembali = -$this->transaksis()->where('tipe', 'pengembalian')->sum('jumlah');
        return max(0, $this->modal - $kembali);
    }
    public function bisaDitarik(): int 
    {
        return max(0, $this->saldo - $this->modalBelumKembali());
    }
}