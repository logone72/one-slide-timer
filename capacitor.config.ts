import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.roegankim.oneslidetimer",
  appName: "One Slide Timer",
  webDir: "dist",
  ios: {
    contentInset: "automatic",
  },
};

export default config;
