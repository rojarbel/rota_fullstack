const { withDangerousMod, withAndroidManifest, AndroidConfig } = require('expo/config-plugins');

const fs = require('fs');
const path = require('path');

function ensureGoogleMapsString(contents, apiKey) {
  const line = `<string name="google_maps_api_key">${apiKey}</string>`;
  if (contents.includes('name="google_maps_api_key"')) {
    return contents.replace(/<string name="google_maps_api_key">.*?<\/string>/, line);
  }
  return contents.replace('</resources>', `  ${line}\n</resources>`);
}
function setGoogleMapsMetaData(androidManifest, apiKey) {
  const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(androidManifest);
  AndroidConfig.Manifest.addMetaDataItemToMainApplication(
    mainApplication,
    'com.google.android.geo.API_KEY',
    apiKey
  );
  return androidManifest;
}
module.exports = function withGoogleMapsString(config) {
const apiKey = config.extra.googleMapsApiKeyAndroid || config.extra.googleMapsApiKey || '';


  config = withAndroidManifest(config, (config) => {
    config.modResults = setGoogleMapsMetaData(config.modResults, apiKey);
    return config;
  });

  return withDangerousMod(config, [
    'android',
    async (config) => {
      const stringsPath = path.join(config.modRequest.platformProjectRoot, 'app/src/main/res/values/strings.xml');
      if (!fs.existsSync(stringsPath)) {
        return config;
      }
      let contents = fs.readFileSync(stringsPath, 'utf8');
      contents = ensureGoogleMapsString(contents, apiKey);
      fs.writeFileSync(stringsPath, contents);
      return config;
    },
  ]);
};