<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();/*  */

use App\Models\Location;
use App\Models\ShoeModel;
use App\Models\CellRun;
use App\Models\MachineLocation;
use App\Models\Machine;

echo "=== Seeding Dummy Data ===\n\n";

// 1. Create 5 Locations (Cells)
$locations = [
    ['name' => 'Cell C2B-01', 'type' => 'Cell'],
    ['name' => 'Cell C2B-02', 'type' => 'Cell'],
    ['name' => 'Cell C2B-03', 'type' => 'Cell'],
    ['name' => 'Cell BZ-01',  'type' => 'Cell'],
    ['name' => 'Cell BZ-02',  'type' => 'Cell'],
];

foreach ($locations as $loc) {
    Location::firstOrCreate(['name' => $loc['name']], $loc);
}
echo "✓ 5 Locations (Cells) created.\n";

// 2. Create 3 Shoe Models
$models = [
    ['code' => 'NB-550',  'name' => 'New Balance 550',  'target_capacity' => 1200],
    ['code' => 'NK-AF1',  'name' => 'Nike Air Force 1',  'target_capacity' => 1500],
    ['code' => 'AD-UB22', 'name' => 'Adidas Ultraboost 22', 'target_capacity' => 1000],
];

foreach ($models as $model) {
    ShoeModel::firstOrCreate(['code' => $model['code']], $model);
}
echo "✓ 3 Shoe Models created.\n";

// 3. Create Cell Runs (assign shoe models to cells)
$allLocations = Location::all();
$allModels = ShoeModel::all();

if ($allLocations->count() >= 5 && $allModels->count() >= 3) {
    $runs = [
        ['location_id' => $allLocations[0]->id, 'shoe_model_id' => $allModels[0]->id, 'status' => 'running'],
        ['location_id' => $allLocations[1]->id, 'shoe_model_id' => $allModels[0]->id, 'status' => 'running'],
        ['location_id' => $allLocations[2]->id, 'shoe_model_id' => $allModels[1]->id, 'status' => 'running'],
        ['location_id' => $allLocations[3]->id, 'shoe_model_id' => $allModels[2]->id, 'status' => 'running'],
        ['location_id' => $allLocations[4]->id, 'shoe_model_id' => $allModels[1]->id, 'status' => 'completed'],
    ];

    // Clear old cell runs first
    CellRun::truncate();
    foreach ($runs as $run) {
        CellRun::create($run);
    }
    echo "✓ 5 Cell Runs created (4 running, 1 completed).\n";
}

// 4. Assign some machines to locations (for Cell Monitor & Scanner)
$someMachines = Machine::take(5)->get();
if ($someMachines->count() >= 5 && $allLocations->count() >= 5) {
    MachineLocation::truncate();
    $assignments = [
        ['machine_id' => $someMachines[0]->id, 'location_id' => $allLocations[0]->id, 'notes' => 'Assigned to Cell C2B-01'],
        ['machine_id' => $someMachines[1]->id, 'location_id' => $allLocations[0]->id, 'notes' => 'Assigned to Cell C2B-01'],
        ['machine_id' => $someMachines[2]->id, 'location_id' => $allLocations[1]->id, 'notes' => 'Assigned to Cell C2B-02'],
        ['machine_id' => $someMachines[3]->id, 'location_id' => $allLocations[2]->id, 'notes' => 'Assigned to Cell C2B-03'],
        ['machine_id' => $someMachines[4]->id, 'location_id' => $allLocations[3]->id, 'notes' => 'Assigned to Cell BZ-01'],
    ];

    foreach ($assignments as $a) {
        MachineLocation::create($a);
    }
    echo "✓ 5 Machine-Location assignments created.\n";
} else {
    echo "⚠ Not enough machines in DB to assign locations (need at least 5).\n";
}

echo "\n=== Done! Refresh your browser to see the data. ===\n";
