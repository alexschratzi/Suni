const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const MARKER = "allow-non-modular-includes";
const SETTING =
  "CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES";

function withNonModularHeaders(config) {
  return withDangerousMod(config, [
    "ios",
    async (mod) => {
      const podfilePath = path.join(
        mod.modRequest.platformProjectRoot,
        "Podfile"
      );
      let contents = fs.readFileSync(podfilePath, "utf8");

      if (contents.includes(MARKER) || contents.includes(SETTING)) {
        return mod;
      }

      const anchor = "post_install do |installer|";
      const insertBlock = `  # ${MARKER}\n  installer.pods_project.targets.each do |target|\n    target.build_configurations.each do |config|\n      config.build_settings['${SETTING}'] = 'YES'\n    end\n  end\n`;

      if (contents.includes(anchor)) {
        contents = contents.replace(anchor, `${anchor}\n${insertBlock}`);
      } else {
        contents = `${contents}\n\npost_install do |installer|\n${insertBlock}end\n`;
      }

      fs.writeFileSync(podfilePath, contents);
      return mod;
    },
  ]);
}

module.exports = withNonModularHeaders;
