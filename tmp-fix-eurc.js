const fs = require("fs");
let content = fs.readFileSync("src/lib/arc.ts", "utf8");

// Fix mainnet EURC address
content = content.replace(
  'eurc: null,',
  'eurc: "0xbEf5f6d51CB62b58e6A8f77868681825C6fe21c1" as Address,'
);

fs.writeFileSync("src/lib/arc.ts", content);
console.log("arc.ts EURC fixed");
