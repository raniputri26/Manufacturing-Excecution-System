<?php
$storingLoc = \App\Models\Location::where('name', 'like', '%Storing%')->orWhere('type', 'Holding')->first();
if ($storingLoc) {
    \App\Models\Machine::query()->update(['location_id' => $storingLoc->id]);
    echo "All machines physically reset to: " . $storingLoc->name . "\n";
} else {
    echo "No holding location found.\n";
}
