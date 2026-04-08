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
            'active_sections' => 'nullable|array',
            'active_sections.*' => 'numeric'
        ]);

        $shoeModel = \App\Models\ShoeModel::with('requirements')->find($validated['shoe_model_id']);
        $activeSections = $validated['active_sections'] ?? [];

        if (empty($activeSections)) {
            // Default to all unique sections linked to this model's requirements
            $activeSections = $shoeModel->requirements->pluck('section_id')->unique()->filter()->values()->toArray();
        }

        // Create new running cell run (does NOT stop existing runs)
        $cellRun = CellRun::create([
            'location_id' => $validated['location_id'],
            'shoe_model_id' => $validated['shoe_model_id'],
            'status' => 'running',
            'active_sections' => $activeSections
        ]);

        $cellRun->load('shoeModel.requirements');

        // Initialize actual qty based on standard requirements ONLY for active sections
        foreach ($cellRun->shoeModel->requirements as $req) {
            $initialCount = 0;
            
            if (in_array($req->section_id, $activeSections)) {
                // Set initial actual equal to standard as requested by user
                $initialCount = $req->qty_required;
            }

            RequirementActual::create([
                'cell_run_id' => $cellRun->id,
                'model_requirement_id' => $req->id,
                'qty_actual' => $initialCount,
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
        $cellRun->update([
            'status' => 'completed',
            'active_sections' => []
        ]);

        return response()->json(['message' => 'Model run stopped.']);
    }

    /**
     * Stop specific sections within a running model
     */
    public function stopSection(Request $request)
    {
        $validated = $request->validate([
            'cell_run_id' => 'required|exists:cell_runs,id',
            'section_ids' => 'required|array',
            'section_ids.*' => 'numeric'
        ]);

        $cellRun = CellRun::findOrFail($validated['cell_run_id']);
        $activeSections = $cellRun->active_sections ?? [];

        // Remove the stopped sections from the active array
        $activeSections = array_values(array_diff($activeSections, $validated['section_ids']));

        // If no sections are left active, mark the whole run as completed
        if (empty($activeSections)) {
            $cellRun->update([
                'status' => 'completed',
                'active_sections' => []
            ]);
        } else {
            $cellRun->update([
                'active_sections' => $activeSections
            ]);
        }

        return response()->json($cellRun->load(['location', 'shoeModel']), 200);
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
