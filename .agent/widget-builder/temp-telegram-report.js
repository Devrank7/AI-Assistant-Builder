const { execSync } = require('child_process');

const message = `📊 <b>Mass Quick Widget Report</b>
📅 Date: 05.03.2026
📋 Sheet: DFW Home Services Leads

✅ Created: 100 widgets
❌ Failed: 0 leads
⏭ Skipped: 0 leads

<b>Results (first 20):</b>
1. Pro American Roofing — proamericanroofing.com ✅
2. Swan Roofing LLC — swanroofing.com ✅
3. CottageCare Plano — cottagecare.com ✅
4. Flip the Switch Electric — fts-electric.com ✅
5. America One Electric — americaoneelectric.com ✅
6. Oxi Fresh Carpet Cleaning — oxifresh.com ✅
7. Richardson Ready Electric — richardsonreadyelectric.com ✅
8. Aptive Pest Control — aptivepestcontrol.com ✅
9. Smith's Painting — smiths-painting.com ✅
10. Luxury Home Remodeling — luxuryhomeremodeling.net ✅
11. Crest Painting — crestpainting.net ✅
12. Honest Abe's Construction — hacdfw.com ✅
13. DFW Bathroom Remodeling — dfwbathroomremodeling.com ✅
14. Victory Landscapes — victorylandscapes.com ✅
15. Splendid Gardens — splendidgardens.net ✅
16. Texas Sage Landscaping — txsagelandscaping.com ✅
17. Doffdon Bedbug Exterminator — doffdon.com ✅
18. Floor Coverings International — floorcoveringsinternational.com ✅
19. Surface Pro Power Wash — surfacepropowerwash.com ✅
20. Green Blast Solutions — greenblastsolutions.com ✅
... and 80 more ✅

📝 Columns added: hasWidget, Demo, JavaScript
🔗 <a href="https://docs.google.com/spreadsheets/d/18apf1zoVhHDUU3tpQu0jNnNgC2l1Mzv85U_JmD6jFtw">Open Sheet</a>`;

const payload = JSON.stringify({ message });
const fs = require('fs');
fs.writeFileSync('/tmp/telegram-report.json', payload);

try {
  const result = execSync(
    'curl -s -X POST "http://localhost:3000/api/telegram/notify" -H "Content-Type: application/json" -H "Cookie: admin_token=admin-secret-2026" -d @/tmp/telegram-report.json',
    { encoding: 'utf8', timeout: 15000 }
  );
  console.log('Result:', result);
} catch (e) {
  console.error('Failed:', e.message);
}
