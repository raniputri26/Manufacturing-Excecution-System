<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

DB::statement('SET FOREIGN_KEY_CHECKS=0;');
DB::table('shoe_models')->truncate();
DB::table('sections')->truncate();
DB::statement('SET FOREIGN_KEY_CHECKS=1;');

echo "Done! Shoe Models: " . DB::table('shoe_models')->count() . ", Sections: " . DB::table('sections')->count() . "\n";
