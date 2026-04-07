<?php

namespace App\Imports;

use App\Models\Machine;
use Maatwebsite\Excel\Concerns\ToArray;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;

class MachineImport implements WithMultipleSheets
{
    protected $sheetIndex;

    public function __construct(int $sheetIndex = 0)
    {
        $this->sheetIndex = $sheetIndex;
    }

    public function sheets(): array
    {
        return [
            $this->sheetIndex => new MachineSheetImport(),
        ];
    }
}

class MachineSheetImport implements ToArray
{
    public function array(array $rows)
    {
        $currentSection = 'General';

        foreach ($rows as $index => $row) {
            // Check if this row is a section header (e.g. "CUTTING SECTION")
            // Iterate through the first few columns to find 'SECTION', because merged cells
            // might shift the text to column B, C, or D in the array.
            $foundSection = false;
            for ($c = 0; $c < 5; $c++) {
                if (isset($row[$c]) && stripos(trim((string)$row[$c]), 'SECTION') !== false) {
                    $currentSection = trim((string)$row[$c]);
                    $foundSection = true;
                    break;
                }
            }
            if ($foundSection) {
                continue; // Skip the rest of the loop for section header rows
            }

            // Skip empty rows or rows that don't have a Machine Name in Column C (index 2)
            if (empty($row[2]) || trim((string)$row[2]) === 'Machine Name' || trim((string)$row[2]) === 'TARGET') {
                continue;
            }

            // Data rows usually have a number in col 16 (0-based: A=0, B=1, C=2 ..., Q=16)
            $asetQty = isset($row[16]) ? (int)$row[16] : 0;
                
                if ($asetQty > 0) {
                    
                    // The machine name might be a formula string like: ="='[46]Summary MCP '!C25"
                    // We need to clean this up. Let's just strip everything up to the exclamation mark !
                    $machineName = trim($row[2]);
                    
                    if (str_starts_with($machineName, '=')) {
                        // If it has an exclamation mark, take everything after it
                        $parts = explode('!', $machineName);
                        if (count($parts) > 1) {
                            $machineName = trim(end($parts));
                        } else {
                            // If no exclamation mark, just remove the equals sign
                            $machineName = trim(substr($machineName, 1));
                        }
                        
                        // It might still look like C25, which is just a cell reference
                        // Actually, if it's a formula, Maatwebsite without CalculatedFormulas will 
                        // just return the formula string. We can't really guess what 'C25' contains.
                        // However, based on the user's screenshot, the text they WANT is actually 
                        // what was rendering inside the formula before. 
                        // Wait, the previous screenshot showed: ="='[46]Summary MCP '!C25" as the literal text on screen.
                    }
                    
                    // Some basic cleanup just in case
                    $machineName = str_replace(["='", "='[46]Summary MCP '!"], "", $machineName);

                    // Count how many we already have of this name to continue the sequence
                    $existingCount = Machine::where('name', 'like', $machineName . ' #%')->count();

                    for ($i = 0; $i < $asetQty; $i++) {
                        $sequence = $existingCount + $i + 1;
                        $suffix = str_pad($sequence, 3, '0', STR_PAD_LEFT);
                        
                        $qrCode = $machineName . '-' . $suffix;
                        
                        Machine::firstOrCreate(
                            ['qr_code' => $qrCode],
                            [
                                'name' => $machineName . ' #' . $suffix,
                                'type' => $currentSection
                            ]
                        );
                    }
                }
        }
    }
}
