import type { PropsWithChildren } from "react";
import { ScrollViewStyleReset } from "expo-router/html";

const serviceWorkerRegistration =
  'if ("serviceWorker" in navigator) {' +
  'window.addEventListener("load", function () {' +
  'navigator.serviceWorker.register("/sw.js").catch(function () {});' +
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
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/healthtimes-icon.svg" />
        <ScrollViewStyleReset />
        <script dangerouslySetInnerHTML={{ __html: serviceWorkerRegistration }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
