// app.json holds the config; this only adds the Android versionCode for local and CI builds
// (android-build/build.sh, .github/workflows/android-apk.yml). It is minutes since 1970, so
// every new APK is "newer" and installs over the previous one, keeping the saved session.
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    versionCode: Number(process.env.ANDROID_VERSION_CODE) || undefined,
  },
});
