const fs = require("fs");
const path = require("path");

const podfilePath = path.join(process.cwd(), "ios", "Podfile");

if (fs.existsSync(podfilePath)) {
  let content = fs.readFileSync(podfilePath, "utf8");
  if (!content.includes("use_modular_headers!")) {
    content = content.replace("use_react_native!", "use_modular_headers!\nuse_react_native!");
    fs.writeFileSync(podfilePath, content);
    console.log("✅ Added 'use_modular_headers!' to Podfile");
  } else {
    console.log("ℹ️ Podfile already contains 'use_modular_headers!'");
  }
} else {
  console.log("⚠️ No ios/Podfile found (will be added automatically by EAS)");
}
