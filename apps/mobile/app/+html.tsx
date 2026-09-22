import type { PropsWithChildren } from "react";
import Constants from "expo-constants";
import { ScrollViewStyleReset } from "expo-router/html";
import {
  CANONICAL_WEB_ANALYTICS_HOSTS,
  VERIFIED_WEB_GROWTH_IDENTITIES
} from "../src/growth/config";

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

const deepLinkRestoreScript =
  '(function(){try{' +
  'var key="ht:nm04:pwa-deep-link";' +
  'var base=' + JSON.stringify(configuredBaseUrl) + ';' +
  'var route=sessionStorage.getItem(key);' +
  'if(!route)return;' +
  'sessionStorage.removeItem(key);' +
  'var allowed=base?(route===base||route.indexOf(base+"/")===0):route.charAt(0)==="/";' +
  'if(allowed)history.replaceState(null,"",route);' +
  '}catch(_){}})();';

const webAnalyticsBootstrap =
  '(function(){try{' +
  'var hosts=' + JSON.stringify(CANONICAL_WEB_ANALYTICS_HOSTS) + ';' +
  'if(hosts.indexOf(location.hostname)<0)return;' +
  'var id=' + JSON.stringify(VERIFIED_WEB_GROWTH_IDENTITIES.ga4WebMeasurementId) + ';' +
  'window.dataLayer=window.dataLayer||[];' +
  'window.gtag=window.gtag||function(){window.dataLayer.push(arguments);};' +
  'window.gtag("js",new Date());' +
  'window.gtag("config",id,{send_page_view:false});' +
  'var script=document.createElement("script");' +
  'script.async=true;' +
  'script.src="https://www.googletagmanager.com/gtag/js?id="+encodeURIComponent(id);' +
  'document.head.appendChild(script);' +
  '}catch(_){}})();';

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
        <script dangerouslySetInnerHTML={{ __html: webAnalyticsBootstrap }} />
        <script dangerouslySetInnerHTML={{ __html: deepLinkRestoreScript }} />
        <script dangerouslySetInnerHTML={{ __html: serviceWorkerRegistration }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
