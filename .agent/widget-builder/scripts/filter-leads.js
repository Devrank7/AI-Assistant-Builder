const leads = require('../leads-batch.json');
const fs = require('fs');
const filtered = leads.filter(l => l.skip !== true);
fs.writeFileSync(require('path').resolve(__dirname, '../leads-to-process.json'), JSON.stringify(filtered, null, 2));
console.log('Written', filtered.length, 'leads to leads-to-process.json');
