<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Feedback extends Model {
    protected $table = 'feedbacks';
    protected $guarded = [];

    protected $appends = ['createdAt', 'updatedAt'];

    public function getCreatedAtAttribute()
    {
        return $this->attributes['created_at'] ?? $this->attributes['createdAt'] ?? null;
    }

    public function getUpdatedAtAttribute()
    {
        return $this->attributes['updated_at'] ?? $this->attributes['updatedAt'] ?? null;
    }
}
