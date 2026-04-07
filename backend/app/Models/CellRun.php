<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CellRun extends Model
{
    protected $fillable = ['location_id', 'shoe_model_id', 'status'];

    public function location()
    {
        return $this->belongsTo(Location::class);
    }

    public function shoeModel()
    {
        return $this->belongsTo(ShoeModel::class);
    }

    public function actuals()
    {
        return $this->hasMany(RequirementActual::class);
    }
}
