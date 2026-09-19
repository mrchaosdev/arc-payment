const fs = require("fs");
let content = fs.readFileSync("src/lib/arc.ts", "utf8");
const matches = content.match(/eurc:[^,\n]+/g) || [];
console.log("EURC entries:");
for (const m of matches) console.log("  " + m.trim());
