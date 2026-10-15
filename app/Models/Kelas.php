<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Kelas extends Model 
{
    protected $table = 'kelas';
    protected $guarded = [];
    public function dosen() 
    { 
        return $this->belongsTo(Dosen::class);
    }
    public function kelompoks()
    {
         return $this->hasMany(Kelompok::class);
    }
}