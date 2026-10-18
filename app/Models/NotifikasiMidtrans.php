<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class NotifikasiMidtrans extends Model {
    protected $table = 'notifikasi_midtrans';
    protected $guarded = [];
    protected $casts = ['payload' => 'array'];
}