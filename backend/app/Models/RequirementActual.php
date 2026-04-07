<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\CellRun;
use App\Models\ModelRequirement;

class RequirementActual extends Model
{
    use HasFactory;

    protected $fillable = [
        'cell_run_id',
        'model_requirement_id',
        'qty_actual',
    ];

    public function cellRun()
    {
        return $this->belongsTo(CellRun::class);
    }

    public function requirement()
    {
        return $this->belongsTo(ModelRequirement::class, 'model_requirement_id');
    }
}
