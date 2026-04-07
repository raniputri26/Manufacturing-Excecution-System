<?php

namespace App\Http\Controllers;

use App\Models\Machine;
use Illuminate\Http\Request;

class MachineController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return response()->json(Machine::all());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'qr_code' => 'required|string|unique:machines',
            'name' => 'required|string',
            'type' => 'nullable|string'
        ]);
        $machine = Machine::create($validated);
        return response()->json($machine, 201);
    }

    public function show(Machine $machine)
    {
        return response()->json($machine);
    }

    public function update(Request $request, Machine $machine)
    {
        $validated = $request->validate([
            'qr_code' => 'sometimes|string|unique:machines,qr_code,' . $machine->id,
            'name' => 'sometimes|string',
            'type' => 'nullable|string'
        ]);
        $machine->update($validated);
        return response()->json($machine);
    }

    public function destroy(Machine $machine)
    {
        $machine->delete();
        return response()->json(null, 204);
    }

    public function getExcelSheets(\Illuminate\Http\Request $request)
    {
        $request->validate([
            'file' => 'required|mimes:xlsx,csv,xls|max:2048'
        ]);

        try {
            $file = $request->file('file');
            $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($file->getPathname());
            $sheetNames = $spreadsheet->getSheetNames();
            
            return response()->json(['sheets' => $sheetNames], 200);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Error reading sheets: ' . $e->getMessage()], 500);
        }
    }

    public function importExcel(\Illuminate\Http\Request $request)
    {
        $request->validate([
            'file' => 'required|mimes:xlsx,csv,xls|max:2048',
            'sheet_index' => 'nullable|integer'
        ]);

        try {
            $sheetIndex = $request->input('sheet_index', 0); // Default to first sheet if not provided
            \Maatwebsite\Excel\Facades\Excel::import(new \App\Imports\MachineImport($sheetIndex), $request->file('file'));
            return response()->json(['message' => 'Machines imported successfully'], 200);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Error importing file: ' . $e->getMessage()], 500);
        }
    }

    public function autoGenerate()
    {
        try {
            // Find max quantity required for each machine type across all models/sections
            $requirements = \App\Models\ModelRequirement::select('machine_name', \Illuminate\Support\Facades\DB::raw('MAX(qty_required) as max_qty'))
                ->groupBy('machine_name')
                ->get();

            $generatedCount = 0;

            foreach ($requirements as $req) {
                // How many of this type do we already have in physical inventory?
                $existingCount = Machine::where('type', $req->machine_name)->count();
                $shortage = $req->max_qty - $existingCount;

                if ($shortage > 0) {
                    for ($i = 0; $i < $shortage; $i++) {
                        // Generate QR based on machine type and sequence (e.g., BALL MELT M/C (Mechanic)-001)
                        $suffix = str_pad($existingCount + $i + 1, 3, '0', STR_PAD_LEFT);
                        
                        // Clean up type name for use in QR Code (optional: remove special characters if needed, but per request keeping it as machine name - sequence)
                        $qrCode = $req->machine_name . '-' . $suffix;

                        Machine::create([
                            'qr_code' => $qrCode,
                            'name' => $req->machine_name . ' #' . $suffix,
                            'type' => $req->machine_name
                        ]);
                        $generatedCount++;
                    }
                }
            }

            return response()->json(['message' => "Successfully generated $generatedCount new physical machines based on BOM requirements."], 200);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Auto-generate failed: ' . $e->getMessage());
            return response()->json(['message' => 'Error generating machines: ' . $e->getMessage()], 500);
        }
    }

    public function lookupByQr($qrCode)
    {
        $machine = Machine::where('qr_code', $qrCode)->first();

        if (!$machine) {
            return response()->json(['message' => 'Mesin tidak ditemukan.'], 404);
        }

        $location = $machine->location_id 
            ? \App\Models\Location::find($machine->location_id) 
            : null;

        return response()->json([
            'id' => $machine->id,
            'name' => $machine->name,
            'qr_code' => $machine->qr_code,
            'type' => $machine->type,
            'location_id' => $machine->location_id,
            'location_name' => $location ? $location->name : null,
        ]);
    }
}
