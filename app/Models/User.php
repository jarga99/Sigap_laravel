<?php
 
namespace App\Models;
 
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use HasFactory, Notifiable;
 
    protected $fillable = [
        'username',
        'password',
        'email',
        'fullName',
        'role',
        'image_url',
        'category_id',
        'sessionId',
        'is_active',
    ];

    protected $appends = ['createdAt', 'updatedAt'];

    public function getCreatedAtAttribute()
    {
        return $this->attributes['created_at'] ?? $this->attributes['createdAt'] ?? null;
    }

    public function getUpdatedAtAttribute()
    {
        return $this->attributes['updated_at'] ?? $this->attributes['updatedAt'] ?? null;
    }
 
    protected $hidden = [
        'password',
    ];
 
    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'is_active' => 'boolean',
        ];
    }

    public function category()
    {
        return $this->belongsTo(Category::class, 'category_id');
    }
}
