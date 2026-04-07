<?php

namespace App\Http\Controllers;

use App\Models\MachineLocation;
use App\Models\CellRun;
use App\Models\RequirementActual;
use Illuminate\Http\Request;

class MachineLocationController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return response()->json(MachineLocation::with(['machine', 'location', 'fromLocation'])->latest()->take(100)->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'machine_id' => 'required|exists:machines,id',
            'location_id' => 'required|exists:locations,id',
            'notes' => 'nullable|string'
        ]);
        $machineLocation = MachineLocation::create($validated);
        return response()->json($machineLocation->load(['machine', 'location']), 201);
    }

    public function show(MachineLocation $machineLocation)
    {
        return response()->json($machineLocation->load(['machine', 'location']));
    }

    public function update(Request $request, MachineLocation $machineLocation)
    {
        $validated = $request->validate([
            'machine_id' => 'sometimes|exists:machines,id',
            'location_id' => 'sometimes|exists:locations,id',
            'notes' => 'nullable|string'
        ]);
        $machineLocation->update($validated);
        return response()->json($machineLocation->load(['machine', 'location']));
    }

    public function destroy(MachineLocation $machineLocation)
    {
        $machineLocation->delete();
        return response()->json(null, 204);
    }

    public function scan(Request $request)
    {
        $validated = $request->validate([
            'qr_code' => 'required|exists:machines,qr_code',
            'location_id' => 'required|exists:locations,id',
            'from_location_id' => 'nullable|exists:locations,id',
            'notes' => 'nullable|string'
        ]);

        $machine = \App\Models\Machine::where('qr_code', $validated['qr_code'])->first();
        // Strip serial number suffix (e.g. "#004") to get base name for BOM matching
        $machineName = preg_replace('/\s*#\d+$/', '', $machine->name);
        $destination = \App\Models\Location::find($validated['location_id']);

        // Use machine's known location. For initial placement (no location_id), accept manual from_location_id
        $fromLocationId = $machine->location_id ?: ($validated['from_location_id'] ?? null);

        // Check if destination is a holding zone (Red Tag / Storing) — always allowed
        $isHoldingZone = preg_match('/red\s*tag|storing/i', $destination->name);

        // For production cells: validate that destination has a running model
        if (!$isHoldingZone && $destination->type === 'Cell') {
            $hasRunningModel = CellRun::where('location_id', $destination->id)
                ->where('status', 'running')
                ->exists();

            if (!$hasRunningModel) {
                return response()->json([
                    'message' => 'Cell ' . $destination->name . ' belum memiliki model yang aktif. Assign model terlebih dahulu sebelum memindahkan mesin.'
                ], 422);
            }
        }

        // Create movement log
        $machineLocation = MachineLocation::create([
            'machine_id' => $machine->id,
            'location_id' => $validated['location_id'],
            'from_location_id' => $fromLocationId,
            'notes' => $validated['notes'] ?? null
        ]);

        // Update machine's current location
        $machine->update(['location_id' => $validated['location_id']]);

        // Helper to update actuals for running cells
        $updateActuals = function($locationId, $machineName, $amount) {
            if (!$locationId) return;
            $cellRuns = CellRun::where('location_id', $locationId)
                ->where('status', 'running')
                ->with('shoeModel.requirements')
                ->get();
                
            foreach ($cellRuns as $run) {
                foreach ($run->shoeModel->requirements as $req) {
                    if (stripos($machineName, $req->machine_name) !== false || stripos($req->machine_name, $machineName) !== false) {
                        $actual = RequirementActual::where('cell_run_id', $run->id)
                            ->where('model_requirement_id', $req->id)->first();
                            
                        if ($actual) {
                            $actual->update(['qty_actual' => max(0, $actual->qty_actual + $amount)]);
                        } else {
                            RequirementActual::create([
                                'cell_run_id' => $run->id,
                                'model_requirement_id' => $req->id,
                                'qty_actual' => max(0, $req->qty_required + $amount),
                            ]);
                        }
                    }
                }
            }
        };

        // Decrease actual at source (auto-detected or manual)
        if ($fromLocationId && $fromLocationId != $validated['location_id']) {
            $updateActuals($fromLocationId, $machineName, -1);
        }
        
        // Increase actual at destination
        $updateActuals($validated['location_id'], $machineName, 1);

        return response()->json($machineLocation->load(['machine', 'location', 'fromLocation']), 200);
    }

    public function historyByLocation($locationId)
    {
        $history = MachineLocation::with(['machine', 'location', 'fromLocation'])
            ->where(function($q) use ($locationId) {
                $q->where('location_id', $locationId)
                  ->orWhere('from_location_id', $locationId);
            })
            ->latest()
            ->take(50)
            ->get()
            ->map(function($log) use ($locationId) {
                // Tentukan arah pergerakan
                if ($log->location_id == $locationId) {
                    $log->movement_type = 'IN';
                } else {
                    $log->movement_type = 'OUT';
                }
                return $log;
            });
            
        return response()->json($history);
    }
}
