<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Category extends Model {
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

    public function links()
    {
        return $this->hasMany(Link::class, 'category_id');
    }

    public function users()
    {
        return $this->hasMany(User::class, 'category_id');
    }
}
