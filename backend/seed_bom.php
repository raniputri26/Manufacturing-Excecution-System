<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Section;
use App\Models\ShoeModel;
use App\Models\ModelRequirement;

echo "=== Seeding BOM/Requirements Data ===\n\n";

// 1. Create Sections if they don't exist
$sections = [
    'CUTTING SECTION',
    'STITCHING SECTION',
    'ASSEMBLING SECTION',
];

foreach ($sections as $sName) {
    Section::firstOrCreate(['name' => $sName]);
}
echo "✓ Sections created.\n";

$cutting = Section::where('name', 'CUTTING SECTION')->first();
$stitching = Section::where('name', 'STITCHING SECTION')->first();
$assembling = Section::where('name', 'ASSEMBLING SECTION')->first();

// 2. Get shoe models
$models = ShoeModel::all();

if ($models->isEmpty()) {
    echo "⚠ No shoe models found. Run seed_dummy.php first.\n";
    exit;
}

// 3. Seed BOM for each model
foreach ($models as $model) {
    // Skip if already has requirements
    if ($model->requirements()->count() > 0) {
        echo "  → {$model->name} already has BOM, skipping.\n";
        continue;
    }

    $bom = [
        ['section_id' => $cutting->id, 'machine_name' => 'Cutting Press', 'qty_required' => 2],
        ['section_id' => $cutting->id, 'machine_name' => 'Cutting Swing Arm', 'qty_required' => 3],
        ['section_id' => $stitching->id, 'machine_name' => 'Flat Sewing Machine', 'qty_required' => 5],
        ['section_id' => $stitching->id, 'machine_name' => 'Post Bed Machine', 'qty_required' => 2],
        ['section_id' => $assembling->id, 'machine_name' => 'Toe Lasting Machine', 'qty_required' => 1],
        ['section_id' => $assembling->id, 'machine_name' => 'Heel Lasting Machine', 'qty_required' => 1],
    ];

    foreach ($bom as $item) {
        ModelRequirement::create(array_merge($item, ['shoe_model_id' => $model->id]));
    }
    echo "  ✓ BOM for {$model->name} created (6 items).\n";
}

echo "\n=== Done! Refresh Dashboard to see BOM tables. ===\n";
