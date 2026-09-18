const { execSync } = require("child_process");
const diff = execSync("git diff src/components/payments/PaymentStudio.tsx", { encoding: "utf8" });
console.log(diff);
