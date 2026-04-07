<?php

namespace App\Http\Controllers;

use App\Models\CellRun;
use App\Models\Machine;
use App\Models\MachineLocation;
use App\Models\RequirementActual;
use Illuminate\Http\Request;

class CellRunController extends Controller
{
    /**
     * Return only running cell runs for Dashboard.
     */
    public function index()
    {
        return response()->json(
            CellRun::with(['location', 'shoeModel.requirements.section', 'actuals'])
                ->where('status', 'running')
                ->get()
        );
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'location_id' => 'required|exists:locations,id',
            'shoe_model_id' => 'required|exists:shoe_models,id',
            'status' => 'nullable|string'
        ]);
        $cellRun = CellRun::create($validated);
        return response()->json($cellRun->load(['location', 'shoeModel']), 201);
    }

    public function show(CellRun $cellRun)
    {
        return response()->json($cellRun->load(['location', 'shoeModel']));
    }

    public function update(Request $request, CellRun $cellRun)
    {
        $validated = $request->validate([
            'location_id' => 'sometimes|exists:locations,id',
            'shoe_model_id' => 'sometimes|exists:shoe_models,id',
            'status' => 'nullable|string'
        ]);
        $cellRun->update($validated);
        return response()->json($cellRun->load(['location', 'shoeModel']));
    }

    public function destroy(CellRun $cellRun)
    {
        $cellRun->delete();
        return response()->json(null, 204);
    }

    /**
     * Assign a shoe model to a cell.
     * Supports multiple concurrent models per cell.
     */
    public function assignCell(Request $request)
    {
        $validated = $request->validate([
            'location_id' => 'required|exists:locations,id',
            'shoe_model_id' => 'required|exists:shoe_models,id',
        ]);

        // Create new running cell run (does NOT stop existing runs)
        $cellRun = CellRun::create([
            'location_id' => $validated['location_id'],
            'shoe_model_id' => $validated['shoe_model_id'],
            'status' => 'running',
        ]);

        $cellRun->load('shoeModel.requirements');

        // Load all physical machines currently in this cell
        $machinesInCell = \App\Models\Machine::where('location_id', $validated['location_id'])->get();

        // Calculate actual qty based on physical machines
        foreach ($cellRun->shoeModel->requirements as $req) {
            $matchedCount = $machinesInCell->filter(function($m) use ($req) {
                // Strip serial number suffix to match requirement base name
                $mName = preg_replace('/\s*#\d+$/', '', $m->name);
                return stripos($mName, $req->machine_name) !== false || stripos($req->machine_name, $mName) !== false;
            })->count();

            RequirementActual::create([
                'cell_run_id' => $cellRun->id,
                'model_requirement_id' => $req->id,
                'qty_actual' => $matchedCount,
            ]);
        }

        return response()->json($cellRun->load(['location', 'shoeModel.requirements.section', 'actuals']), 200);
    }

    /**
     * Stop a specific running model (mark as completed).
     */
    public function stopCell(Request $request)
    {
        $validated = $request->validate([
            'cell_run_id' => 'required|exists:cell_runs,id',
        ]);

        $cellRun = CellRun::findOrFail($validated['cell_run_id']);
        $cellRun->update(['status' => 'completed']);

        return response()->json(['message' => 'Model run stopped.']);
    }

    /**
     * Get history of all completed runs for a cell.
     */
    public function getHistory($locationId)
    {
        $history = CellRun::where('location_id', $locationId)
            ->where('status', 'completed')
            ->with('shoeModel')
            ->orderBy('updated_at', 'desc')
            ->get();

        return response()->json($history);
    }

    public function getMonitorData($locationId)
    {
        $cellRuns = CellRun::where('location_id', $locationId)
                          ->where('status', 'running')
                          ->with(['shoeModel.requirements', 'actuals'])
                          ->get();
                          
        if ($cellRuns->isEmpty()) {
            return response()->json(['message' => 'No active run for this cell.'], 404);
        }

        $actualMachineIds = MachineLocation::where('location_id', $locationId)
            ->pluck('machine_id')
            ->unique();
            
        $actualMachines = Machine::whereIn('id', $actualMachineIds)->get();

        return response()->json([
            'running_models' => $cellRuns->map(fn($r) => $r->shoeModel),
            'cell_runs' => $cellRuns,
            'actual_machines' => $actualMachines
        ]);
    }

    /**
     * Update manual actual quantity.
     */
    public function updateActual(Request $request, $id)
    {
        $validated = $request->validate([
            'model_requirement_id' => 'required|exists:model_requirements,id',
            'qty_actual' => 'required|integer|min:0',
        ]);

        $cellRun = CellRun::findOrFail($id);

        $actual = RequirementActual::where('cell_run_id', $cellRun->id)
            ->where('model_requirement_id', $validated['model_requirement_id'])
            ->first();

        if ($actual) {
            $actual->update(['qty_actual' => $validated['qty_actual']]);
        } else {
            RequirementActual::create([
                'cell_run_id' => $cellRun->id,
                'model_requirement_id' => $validated['model_requirement_id'],
                'qty_actual' => $validated['qty_actual'],
            ]);
        }

        return response()->json($cellRun->load(['actuals']));
    }
}
