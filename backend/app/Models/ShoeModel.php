<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ShoeModel extends Model
{
    protected $fillable = ['name', 'code'];

    public function requirements()
    {
        return $this->hasMany(ModelRequirement::class);
    }
}
