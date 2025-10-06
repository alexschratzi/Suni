const fs = require("fs");
const path = require("path");

(async () => {
  try {
    const iosDir = path.join(process.cwd(), "ios");
    const podfilePath = path.join(iosDir, "Podfile");

    if (fs.existsSync(podfilePath)) {
      let content = fs.readFileSync(podfilePath, "utf8");

      if (!content.includes("use_frameworks!")) {
        content = content.replace(
          /require ['"].*autolinking['"].*\n/,
          `$&\nuse_frameworks! :linkage => :dynamic\nuse_modular_headers!\n`
        );
        fs.writeFileSync(podfilePath, content, "utf8");
        console.log("✅ Added use_frameworks! and use_modular_headers! to Podfile");
      } else {
        console.log("ℹ️ Podfile already contains modular header setup.");
      }
    } else {
      console.log("⚠️ No Podfile found — likely running on Windows (that’s fine, it’ll be patched in EAS cloud).");
    }
  } catch (err) {
    console.error("❌ Failed to modify Podfile:", err);
    process.exit(1);
  }
})();
