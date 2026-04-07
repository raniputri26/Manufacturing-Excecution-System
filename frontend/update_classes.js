import fs from 'fs';
const file = 'C:/xampp/htdocs/MES/frontend/src/pages/MasterData.jsx';
let code = fs.readFileSync(file, 'utf8');

// Replace header flex layout
code = code.replace(
    '<div className="flex items-center justify-between mb-5">',
    '<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">'
);

// Replace sm:flex-row with lg:flex-row in the filter containers
code = code.replaceAll('sm:flex-row sm:items-center gap-3', 'lg:flex-row lg:items-center gap-3');

// Replace hidden sm:block with hidden lg:block
code = code.replaceAll('hidden sm:block', 'hidden lg:block');

fs.writeFileSync(file, code);
console.log('MasterData.jsx updated successfully');
