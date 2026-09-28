# Everything needed to build the Android app, so nothing has to be installed on the host:
# Node 22, JDK 17 and the Android SDK (the NDK and CMake are fetched by Gradle on first use
# and kept in the SDK volume, see compose.yml)
FROM node:22-bookworm

RUN apt-get update \
 && apt-get install -y --no-install-recommends openjdk-17-jdk-headless unzip rsync \
 && rm -rf /var/lib/apt/lists/*

ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 \
    ANDROID_HOME=/opt/android-sdk \
    GRADLE_USER_HOME=/cache/gradle
ENV PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools

# https://developer.android.com/studio#command-line-tools-only
ARG CMDLINE_TOOLS=15859902
RUN mkdir -p $ANDROID_HOME/cmdline-tools \
 && curl -fsSL https://dl.google.com/android/repository/commandlinetools-linux-${CMDLINE_TOOLS}_latest.zip -o /tmp/tools.zip \
 && unzip -q /tmp/tools.zip -d /tmp/tools \
 && mv /tmp/tools/cmdline-tools $ANDROID_HOME/cmdline-tools/latest \
 && rm -rf /tmp/tools /tmp/tools.zip \
 && (yes | sdkmanager --licenses > /dev/null) \
 && sdkmanager "platform-tools" "platforms;android-36" "build-tools;36.0.0"
