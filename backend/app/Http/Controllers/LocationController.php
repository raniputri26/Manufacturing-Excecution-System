<?php

namespace App\Http\Controllers;

use App\Models\Location;
use Illuminate\Http\Request;

class LocationController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return response()->json(Location::all());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'type' => 'required|in:Cell,Re-tag,Storage'
        ]);
        $location = Location::create($validated);
        return response()->json($location, 201);
    }

    public function show(Location $location)
    {
        return response()->json($location);
    }

    public function update(Request $request, Location $location)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string',
            'type' => 'sometimes|in:Cell,Re-tag,Storage'
        ]);
        $location->update($validated);
        return response()->json($location);
    }

    public function destroy(Location $location)
    {
        $location->delete();
        return response()->json(null, 204);
    }

    public function holdingInventory()
    {
        $holdingLocations = Location::where('name', 'like', '%Red Tag%')
                                     ->orWhere('name', 'like', '%Storing%')
                                     ->get();

        $holdingIds = $holdingLocations->pluck('id');

        // 1) Get latest machine_location log per machine (2 queries instead of N)
        $latestLogIds = \App\Models\MachineLocation::selectRaw('MAX(id) as id')
            ->groupBy('machine_id')
            ->pluck('id');

        $latestLogs = \App\Models\MachineLocation::whereIn('id', $latestLogIds)
            ->get()
            ->keyBy('machine_id');

        // 2) Batch-load all from_locations in 1 query
        $fromLocationIds = $latestLogs->pluck('from_location_id')->filter()->unique();
        $fromLocations = Location::whereIn('id', $fromLocationIds)->get()->keyBy('id');

        // 3) Get machines in holding zones and attach data (no extra queries)
        $machines = \App\Models\Machine::whereIn('location_id', $holdingIds)
            ->get()
            ->map(function($machine) use ($latestLogs, $fromLocations) {
                $log = $latestLogs->get($machine->id);
                
                $machine->notes = $log ? $log->notes : null;
                $machine->from_location = ($log && $log->from_location_id) 
                    ? $fromLocations->get($log->from_location_id) 
                    : null;
                $machine->moved_at = $log ? $log->created_at : $machine->updated_at;
                return $machine;
            })
            ->sortByDesc('moved_at')
            ->values();

        return response()->json($machines);
    }
}
