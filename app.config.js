const fs = require('fs');

// app.json holds the config; this only adds what depends on the build machine:
// - the Android versionCode for local and CI builds (android-build/build.sh,
//   .github/workflows/android-apk.yml). It is minutes since 1970, so every new APK is "newer"
//   and installs over the previous one, keeping the saved session.
// - google-services.json, the Firebase config Android push needs. It isn't committed (see
//   README → "Push notifications"); without it the app builds fine and simply gets no pushes.
const googleServicesFile = process.env.GOOGLE_SERVICES_FILE || './google-services.json';

module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    versionCode: Number(process.env.ANDROID_VERSION_CODE) || undefined,
    googleServicesFile: fs.existsSync(googleServicesFile) ? googleServicesFile : undefined,
  },
});
