<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$existing = DB::table('locations')->where('type', 'Cell')->orderBy('name')->get(['id', 'name', 'type']);
foreach ($existing as $l) {
    echo $l->id . ' | ' . $l->name . ' | ' . $l->type . "\n";
}
echo "Total: " . count($existing) . " cells\n";
