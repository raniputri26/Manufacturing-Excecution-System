<?php

namespace App\Http\Controllers;

use App\Models\ModelRequirement;
use Illuminate\Http\Request;

class ModelRequirementController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return response()->json(ModelRequirement::with(['shoeModel', 'section'])->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'shoe_model_id' => 'required|exists:shoe_models,id',
            'section_id' => 'required|exists:sections,id',
            'machine_name' => 'required|string',
            'qty_required' => 'required|integer|min:1'
        ]);
        $modelRequirement = ModelRequirement::create($validated);
        return response()->json($modelRequirement->load(['shoeModel', 'section']), 201);
    }

    public function show(ModelRequirement $modelRequirement)
    {
        return response()->json($modelRequirement->load(['shoeModel', 'section']));
    }

    public function update(Request $request, ModelRequirement $modelRequirement)
    {
        $validated = $request->validate([
            'shoe_model_id' => 'sometimes|exists:shoe_models,id',
            'section_id' => 'sometimes|exists:sections,id',
            'machine_name' => 'sometimes|string',
            'qty_required' => 'sometimes|integer|min:1'
        ]);
        $modelRequirement->update($validated);
        return response()->json($modelRequirement->load(['shoeModel', 'section']));
    }

    public function destroy(ModelRequirement $modelRequirement)
    {
        $modelRequirement->delete();
        return response()->json(null, 204);
    }

    public function importExcel(Request $request)
    {
        $request->validate([
            'file' => 'required|mimes:xlsx,csv,xls|max:2048'
        ]);

        try {
            $sheets = \Maatwebsite\Excel\Facades\Excel::toArray(new \stdClass, $request->file('file'));
            
            $shoeModels = [];
            $currentSectionId = null;
            $capaRowIndex = -1;
            $capaColIndex = -1;
            $headerFound = false;
            
            // First loop: Find the CAPA header to parse shoe models. 
            // We assume it's somewhere in the first sheet.
            foreach ($sheets as $sheetIndex => $rows) {
                if ($headerFound) break;
                
                foreach ($rows as $index => $row) {
                    foreach ($row as $colIndex => $cellValue) {
                        if (is_string($cellValue) && str_contains(strtoupper(trim($cellValue)), 'CAPA')) {
                            $capaRowIndex = $index;
                            $capaColIndex = $colIndex;
                            
                            $modelRowIndex = $capaRowIndex - 1;
                            $modelRow = $rows[$modelRowIndex];
                            $capaRow = $rows[$capaRowIndex];

                            $startCol = $capaColIndex + 1;
                            for ($c = $startCol; $c < count($modelRow); $c++) {
                                $modelCode = trim((string)($modelRow[$c] ?? ''));
                                if (empty($modelCode)) continue;
                                
                                $capa = trim((string)($capaRow[$c] ?? '0'));
                                if (!is_numeric($capa)) $capa = 0;
                                
                                $shoeModel = \App\Models\ShoeModel::firstOrCreate(
                                    ['code' => $modelCode],
                                    ['name' => $modelCode, 'target_capacity' => (int)$capa]
                                );
                                
                                $shoeModels[$c] = $shoeModel->id;
                            }
                            $headerFound = true;
                            break 2;
                        }
                    }
                }
            }

            if (!$headerFound) {
                return response()->json(['message' => "Invalid Format: 'CAPA' capacity row anchor was not found on any sheet."], 400);
            }

            $totalProcessed = 0;
            // Second loop: Process data rows across all sheets
            foreach ($sheets as $sheetIndex => $rows) {
                $startIndex = ($sheetIndex === 0 && $headerFound) ? $capaRowIndex + 1 : 0;
                
                for ($r = $startIndex; $r < count($rows); $r++) {
                    $row = $rows[$r];
                    $colA = trim((string)($row[0] ?? ''));
                    $colB = trim((string)($row[1] ?? ''));
                    $colC = trim((string)($row[2] ?? ''));

                    if (strtoupper($colA) === 'TOTAL' || strtoupper($colB) === 'TOTAL' || strtoupper($colC) === 'TOTAL') {
                        continue;
                    }

                    $combinedRowStart = strtoupper($colA . ' ' . $colB . ' ' . $colC);
                    if (str_contains($combinedRowStart, 'SECTION')) {
                        $sectionStr = !empty($colA) ? $colA : (!empty($colB) ? $colB : $colC);
                        $sectionName = ucwords(strtolower(trim($sectionStr)));
                        
                        $section = \App\Models\Section::firstOrCreate(['name' => $sectionName]);
                        $currentSectionId = $section->id;
                        continue;
                    }

                    $candidates = [trim((string)($row[0] ?? '')), trim((string)($row[1] ?? '')), trim((string)($row[2] ?? ''))];
                    $machineName = '';
                    $maxLength = -1;
                    
                    foreach ($candidates as $candidate) {
                        // ignore formulas starting with equal unless it's the only thing there
                        if (str_starts_with($candidate, '=')) continue;
                        if (strlen($candidate) > $maxLength && !is_numeric($candidate)) {
                            $maxLength = strlen($candidate);
                            $machineName = $candidate;
                        }
                    }

                    if (empty($machineName) || is_numeric($machineName) || strlen($machineName) < 3) {
                        continue;
                    }

                    if (!$currentSectionId) {
                        $section = \App\Models\Section::firstOrCreate(['name' => 'General Requirement']);
                        $currentSectionId = $section->id;
                    }

                    // Read quantities for each mapped shoe model column
                    foreach ($shoeModels as $colIndex => $modelId) {
                        $qtyRaw = $row[$colIndex] ?? '';
                        
                        // If cell was computed formula `=7+2`, Excel::toArray might leave it as string "=7+2" 
                        // or it might resolve it. If it starts with `=`, attempt basic eval or just store 0
                        // Since we just need number, if it's strictly an equation String like '=7+2' from the raw array
                        $qty = trim((string)$qtyRaw);
                        if (str_starts_with($qty, '=')) {
                            // extremely basic parser to try and get int from something like =7+2
                            $clean = preg_replace('/[^0-9\+\-\*\/]/', '', $qty);
                            try {
                                $qty = eval("return $clean;"); 
                            } catch (\Throwable $t) {
                                $qty = 0;
                            }
                        }

                        if ($qty !== '' && is_numeric($qty) && (float)$qty > 0) {
                            \App\Models\ModelRequirement::updateOrCreate([
                                'shoe_model_id' => $modelId,
                                'section_id' => $currentSectionId,
                                'machine_name' => $machineName
                            ], [
                                'qty_required' => (int)$qty
                            ]);
                            $totalProcessed++;
                        }
                    }
                }
            }
            
            return response()->json(['message' => "BOM/Requirements imported successfully. $totalProcessed requirements saved across " . count($sheets) . " sheets."], 200);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Error importing file: ' . $e->getMessage()], 500);
        }
    }
}
