const fs = require('fs');

const files = [
    'frontend/src/components/Sidebar.jsx',
    'frontend/src/pages/Dashboard.jsx',
    'frontend/src/pages/MasterData.jsx',
    'frontend/src/pages/CellMonitor.jsx',
    'frontend/src/pages/Scanner.jsx'
];

files.forEach(f => {
    if (fs.existsSync(f)) {
        let content = fs.readFileSync(f, 'utf8');
        content = content.replace(/teal-/g, 'marine-');

        // Also fix the shadow if it broke
        content = content.replace(/shadow-marine-\/20/g, 'shadow-marine-500/20');

        fs.writeFileSync(f, content, 'utf8');
    }
});
