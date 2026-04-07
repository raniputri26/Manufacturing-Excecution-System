<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MachineLocation extends Model
{
    protected $fillable = ['machine_id', 'location_id', 'from_location_id', 'notes'];

    public function machine()
    {
        return $this->belongsTo(Machine::class);
    }

    public function location()
    {
        return $this->belongsTo(Location::class);
    }

    public function fromLocation()
    {
        return $this->belongsTo(Location::class, 'from_location_id');
    }
}
