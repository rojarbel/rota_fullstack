const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function ensureGoogleMapsString(contents, apiKey) {
  const line = `<string name="google_maps_api_key">${apiKey}</string>`;
  if (contents.includes('name="google_maps_api_key"')) {
    return contents.replace(/<string name="google_maps_api_key">.*?<\/string>/, line);
  }
  return contents.replace('</resources>', `  ${line}\n</resources>`);
}

module.exports = function withGoogleMapsString(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const stringsPath = path.join(config.modRequest.platformProjectRoot, 'app/src/main/res/values/strings.xml');
      const apiKey = process.env.GOOGLE_MAPS_API_KEY_ANDROID || '';
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