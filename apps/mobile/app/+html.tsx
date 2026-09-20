import type { PropsWithChildren } from "react";
import Constants from "expo-constants";
import { ScrollViewStyleReset } from "expo-router/html";

const configuredBaseUrl =
  ((Constants.expoConfig?.experiments as { baseUrl?: string } | undefined)?.baseUrl ?? "")
    .trim()
    .replace(/\/+$/, "");

const assetPath = (path: string) =>
  configuredBaseUrl + "/" + path.replace(/^\/+/, "");

const serviceWorkerRegistration =
  'if ("serviceWorker" in navigator) {' +
  'window.addEventListener("load", function () {' +
  'navigator.serviceWorker.register(' + JSON.stringify(assetPath("sw.js")) + ', { scope: ' +
  JSON.stringify((configuredBaseUrl || "") + "/") +
  ' }).catch(function () {});' +
  '});' +
  '}';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#071A2B" />
        <meta name="description" content="HealthTimes global health journalism." />
        <meta name="application-name" content="HealthTimes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="manifest" href={assetPath("manifest.json")} />
        <link rel="icon" href={assetPath("healthtimes-icon.svg")} />
        <ScrollViewStyleReset />
        <script dangerouslySetInnerHTML={{ __html: serviceWorkerRegistration }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
