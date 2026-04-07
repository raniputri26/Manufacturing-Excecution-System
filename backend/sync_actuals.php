<?php
$runs = \App\Models\CellRun::where('status', 'running')->with('shoeModel.requirements')->get();
foreach ($runs as $run) {
    foreach ($run->shoeModel->requirements as $req) {
        $actual = \App\Models\RequirementActual::firstOrCreate([
            'cell_run_id' => $run->id,
            'model_requirement_id' => $req->id
        ], ['qty_actual' => $req->qty_required]);
        $actual->update(['qty_actual' => $req->qty_required]);
    }
}
echo "Actuals synced to standard.\n";
