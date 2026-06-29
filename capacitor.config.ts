import type { CapacitorConfig } from "@capacitor/cli";

const serverUrl = process.env.APP_SERVER_URL?.trim();

if (!serverUrl) {
  throw new Error(
    "APP_SERVER_URL is required. Use an HTTPS deployment or your computer's LAN URL for local testing.",
  );
}

const parsedServerUrl = new URL(serverUrl);
const isCleartext = parsedServerUrl.protocol === "http:";

if (!["http:", "https:"].includes(parsedServerUrl.protocol)) {
  throw new Error("APP_SERVER_URL must use http:// or https://.");
}

if (process.env.ANDROID_RELEASE === "true" && isCleartext) {
  throw new Error("Release Android builds require an HTTPS APP_SERVER_URL.");
}

const config: CapacitorConfig = {
  appId: "app.onetaskaday.one",
  appName: "One",
  webDir: "mobile-shell",
  server: {
    url: parsedServerUrl.toString(),
    cleartext: isCleartext,
  },
  android: {
    backgroundColor: "#f7f7f2",
    allowMixedContent: false,
  },
};

export default config;
