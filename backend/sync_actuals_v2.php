<?php
$runs = \App\Models\CellRun::where('status', 'running')->with('shoeModel.requirements')->get();

// First, reset all to 0 globally
\App\Models\RequirementActual::query()->update(['qty_actual' => 0]);

foreach ($runs as $run) {
    // get machines in this location
    $machinesInCell = \App\Models\Machine::where('location_id', $run->location_id)->get();
    
    foreach ($run->shoeModel->requirements as $req) {
        $matchedCount = $machinesInCell->filter(function($m) use ($req) {
            $mName = preg_replace('/\s*#\d+$/', '', $m->name);
            return stripos($mName, $req->machine_name) !== false || stripos($req->machine_name, $mName) !== false;
        })->count();

        $actual = \App\Models\RequirementActual::firstOrCreate([
            'cell_run_id' => $run->id,
            'model_requirement_id' => $req->id
        ], ['qty_actual' => 0]);
        
        $actual->update(['qty_actual' => $matchedCount]);
    }
}
echo "Actuals synced to physical locations.\n";
