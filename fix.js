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

        // Let's replace the broken teal- with standard ones

        // Checkboxes
        content = content.replace(/checked:bg-teal-[ \"]/g, (m) => m.replace('teal-', 'teal-500'));
        content = content.replace(/checked:border-teal-[ \"]/g, (m) => m.replace('teal-', 'teal-500'));

        // Borders and Rings
        content = content.replace(/ring-teal-[ \"]/g, (m) => m.replace('teal-', 'teal-500'));
        content = content.replace(/border-teal-[ \"]/g, (m) => m.replace('teal-', 'teal-500'));

        // Text
        content = content.replace(/text-teal-[ \"]/g, (m) => m.replace('teal-', 'teal-400'));

        // Backgrounds
        content = content.replace(/bg-teal-[ \"]/g, (m) => m.replace('teal-', 'teal-500'));

        // Specifics like /10 /30 (where teal- /10 became teal-/10)
        content = content.replace(/teal-\/30/g, 'teal-900/30');
        content = content.replace(/teal-\/10/g, 'teal-500/10');
        content = content.replace(/teal-\/5/g, 'teal-500/5');
        content = content.replace(/teal-\/20/g, 'teal-500/20');
        content = content.replace(/teal-\/40/g, 'teal-50/40');
        content = content.replace(/teal-\/60/g, 'teal-50/60');

        // Scanner gradient
        content = content.replace(/from-teal-[ \"]/g, (m) => m.replace('teal-', 'teal-600'));
        content = content.replace(/to-teal-[ \"]/g, (m) => m.replace('teal-', 'teal-800'));

        // Re-fix some remaining ones (like shadows)
        content = content.replace(/shadow-teal-[ \"]/g, (m) => m.replace('teal-', 'teal-500/20'));

        fs.writeFileSync(f, content, 'utf8');
    }
});
