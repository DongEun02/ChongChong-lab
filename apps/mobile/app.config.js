module.exports = ({ config }) => {
  const targetSdkVersion = Number(
    process.env.ANDROID_TARGET_SDK_VERSION ?? 36,
  );

  return {
    ...config,
    plugins: [
      ...(config.plugins ?? []).filter(
        (plugin) =>
          plugin !== 'expo-build-properties' &&
          plugin !== './plugins/with-rn-firebase-cocoapods',
      ),
      './plugins/with-rn-firebase-cocoapods',
      [
        'expo-build-properties',
        {
          android: {
            targetSdkVersion,
          },
          ios: {
            useFrameworks: 'static',
          },
        },
      ],
    ],
  };
};
