const fs = require('node:fs/promises');
const path = require('node:path');

const { withDangerousMod } = require('expo/config-plugins');

const RN_FIREBASE_COCOAPODS_SETTING = '$RNFirebaseDisableSPM = true';

module.exports = function withRnFirebaseCocoaPods(config) {
  return withDangerousMod(config, [
    'ios',
    async (modConfig) => {
      const podfilePath = path.join(
        modConfig.modRequest.platformProjectRoot,
        'Podfile',
      );
      const podfile = await fs.readFile(podfilePath, 'utf8');

      if (!podfile.includes(RN_FIREBASE_COCOAPODS_SETTING)) {
        await fs.writeFile(
          podfilePath,
          `${RN_FIREBASE_COCOAPODS_SETTING}\n\n${podfile}`,
        );
      }

      return modConfig;
    },
  ]);
};
