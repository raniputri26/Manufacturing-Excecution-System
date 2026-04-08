<?php
\App\Models\CellRun::where('status', 'running')->update([
    'status' => 'completed',
    'active_sections' => '[]'
]);
echo "All cells stopped.\n";
