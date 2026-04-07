<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ModelRequirement extends Model
{
    protected $fillable = ['shoe_model_id', 'section_id', 'machine_name', 'qty_required'];

    public function shoeModel()
    {
        return $this->belongsTo(ShoeModel::class);
    }

    public function section()
    {
        return $this->belongsTo(Section::class);
    }
}
