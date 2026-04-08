<?php
\App\Models\Machine::query()->update(['location_id' => null]);
echo "All machine locations have been reset to NULL (start from scratch).\n";
