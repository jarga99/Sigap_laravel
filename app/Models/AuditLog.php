<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model {
    protected $guarded = [];

    protected $appends = ['createdAt', 'updatedAt'];

    public function getCreatedAtAttribute()
    {
        $val = $this->attributes['created_at'] ?? $this->attributes['createdAt'] ?? null;
        return $val ? \Illuminate\Support\Carbon::parse($val) : null;
    }

    public function getUpdatedAtAttribute()
    {
        $val = $this->attributes['updated_at'] ?? $this->attributes['updatedAt'] ?? null;
        return $val ? \Illuminate\Support\Carbon::parse($val) : null;
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'userId');
    }
}
