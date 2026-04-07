<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$existingNames = DB::table('locations')->where('type', 'Cell')->pluck('name')->toArray();

$added = 0;
for ($i = 1; $i <= 14; $i++) {
    $name = "Cell $i";
    if (!in_array($name, $existingNames)) {
        DB::table('locations')->insert([
            'name' => $name,
            'type' => 'Cell',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        echo "Added: $name\n";
        $added++;
    } else {
        echo "Skip (exists): $name\n";
    }
}

echo "\nDone! Added $added cells.\n";

// Show all cells
$all = DB::table('locations')->where('type', 'Cell')->orderByRaw('CAST(SUBSTRING(name, 6) AS UNSIGNED)')->get(['id', 'name']);
echo "\nAll cells now:\n";
foreach ($all as $c) {
    echo $c->id . ' | ' . $c->name . "\n";
}
