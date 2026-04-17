<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ClickLog extends Model
{
    use HasFactory;

    protected $guarded = [];

    const UPDATED_AT = null; // No updated_at in ClickLogs per prisma schema

    public function link()
    {
        return $this->belongsTo(Link::class, 'linkId');
    }
}
