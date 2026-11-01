<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TagihanQris extends Model
{
    protected $table = 'tagihan_qris';

    protected $guarded = [];

    protected $attributes = ['status' => 'menunggu'];

    protected $casts = ['kedaluwarsa_at' => 'datetime'];
}
