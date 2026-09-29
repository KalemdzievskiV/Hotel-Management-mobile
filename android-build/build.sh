#!/usr/bin/env bash
# Builds a release APK inside the builder container (android-build/compose.yml).
# The project is copied from /src into /work, a Docker volume, so node_modules, the generated
# android/ project and Gradle's outputs stay on a fast Linux disk and survive between builds.
set -euo pipefail

# Everything is inside main, so bash reads the whole script before running it: editing this file
# during a build (it's mounted from the project) can't break the build that's running
main() {

# Modern phones are all arm64; building one architecture instead of four is ~4x faster.
# ANDROID_ARCHS=armeabi-v7a,arm64-v8a,x86,x86_64 builds a universal APK (e.g. for an emulator).
ARCHS="${ANDROID_ARCHS:-arm64-v8a}"

# The committed .env points at the deployed backend; .env.local (a LAN address for Expo Go)
# is left out on purpose, since a release APK can't talk plain HTTP anyway
if [ -z "${EXPO_PUBLIC_API_URL:-}" ]; then
  EXPO_PUBLIC_API_URL="$(grep -E '^EXPO_PUBLIC_API_URL=' /src/.env | cut -d= -f2- | tr -d '\r')"
fi
export EXPO_PUBLIC_API_URL
# Minutes since 1970: always higher than the last build's, wherever it was built (see app.config.js)
export ANDROID_VERSION_CODE="$(( $(date +%s) / 60 ))"
export CI=1

echo "==> Syncing project"
rsync -a --delete \
  --exclude node_modules --exclude android --exclude ios --exclude .git --exclude .expo \
  --exclude dist --exclude '.env*.local' --exclude .build-stamps \
  /src/ /work/
cd /work
mkdir -p .build-stamps

deps_hash="$(sha256sum package-lock.json | cut -d' ' -f1)"
if [ "$(cat .build-stamps/deps 2>/dev/null)" != "$deps_hash" ] || [ ! -d node_modules ]; then
  echo "==> Installing dependencies"
  # Not `npm ci`: npm on Windows leaves Linux-only optional packages (@emnapi/*) out of the
  # lockfile, and ci refuses such a lockfile. install keeps the locked versions and adds them.
  npm install --no-audit --no-fund
  echo "$deps_hash" > .build-stamps/deps
fi

# Regenerate android/ from scratch only when native config changes; otherwise update it in
# place so Gradle can reuse what it already compiled
native_hash="$(cat package-lock.json app.json app.config.js | sha256sum | cut -d' ' -f1)"
clean=""
if [ "$(cat .build-stamps/native 2>/dev/null)" != "$native_hash" ] || [ ! -d android ]; then
  clean="--clean"
fi
echo "==> Generating the Android project ${clean:+(clean)}"
npx expo prebuild --platform android --no-install $clean
echo "$native_hash" > .build-stamps/native

echo "==> Building release APK for $ARCHS (API: $EXPO_PUBLIC_API_URL)"
cd android
# Memory: with 8 workers and a separate Kotlin compiler JVM the build needs more RAM than a 16 GB
# laptop has spare (the kernel kills Gradle). Two workers and Kotlin inside Gradle's JVM fit;
# raise GRADLE_WORKERS on a bigger machine.
./gradlew assembleRelease \
  -PreactNativeArchitectures="$ARCHS" \
  -Dorg.gradle.jvmargs="-Xmx4g -XX:MaxMetaspaceSize=1g" \
  -Pkotlin.compiler.execution.strategy=in-process \
  --max-workers="${GRADLE_WORKERS:-2}" \
  --build-cache --no-daemon

version="$(node -p "require('/work/app.json').expo.version")"
mkdir -p /src/dist
cp app/build/outputs/apk/release/app-release.apk "/src/dist/hotel-management-${version}-${ANDROID_VERSION_CODE}.apk"
cp app/build/outputs/apk/release/app-release.apk /src/dist/hotel-management.apk
echo
echo "==> Done: dist/hotel-management-${version}-${ANDROID_VERSION_CODE}.apk"
echo "    Put it on your phone with: npm run serve:apk"

}
main "$@"
