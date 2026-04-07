<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

\Illuminate\Support\Facades\Schema::disableForeignKeyConstraints();
\App\Models\CellRun::truncate();
\App\Models\MachineLocation::truncate();
\App\Models\Machine::truncate();
\Illuminate\Support\Facades\Schema::enableForeignKeyConstraints();

echo "All machines and related tracking data have been deleted successfully.\n";
