<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Transaksi extends Model 
{
    protected $guarded = [];
    protected $casts = [
        'meta' => 'array'
    ];
    public function kelompok()
    {
        return $this->belongsTo(Kelompok::class);
    }
}