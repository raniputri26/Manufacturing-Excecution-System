<?php
$runs = \App\Models\CellRun::where('status', 'running')->with('shoeModel.requirements')->get();

// First, reset all to 0 globally
\App\Models\RequirementActual::query()->update(['qty_actual' => 0]);

foreach ($runs as $run) {
    // Determine active sections if none exists yet (backwards compatibility for running models)
    if (empty($run->active_sections)) {
        $activeSections = $run->shoeModel->requirements->pluck('section_id')->unique()->filter()->values()->toArray();
        $run->update(['active_sections' => $activeSections]);
    } else {
        $activeSections = $run->active_sections;
    }

    // get machines in this location
    $machinesInCell = \App\Models\Machine::where('location_id', $run->location_id)->get();
    
    foreach ($run->shoeModel->requirements as $req) {
        $matchedCount = 0;
        
        // Only count actuals for machines if the requirement's section is active
        if (in_array($req->section_id, $activeSections)) {
            $matchedCount = $machinesInCell->filter(function($m) use ($req) {
                $mName = preg_replace('/\s*#\d+$/', '', $m->name);
                return stripos($mName, $req->machine_name) !== false || stripos($req->machine_name, $mName) !== false;
            })->count();
        }

        $actual = \App\Models\RequirementActual::firstOrCreate([
            'cell_run_id' => $run->id,
            'model_requirement_id' => $req->id
        ], ['qty_actual' => 0]);
        
        $actual->update(['qty_actual' => $matchedCount]);
    }
}
echo "Active sections seeded and Actuals synced to physical locations considering section states.\n";
