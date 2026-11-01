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

const themeInitScript =
  '(function(){try{' +
  'var key="ht:nm04:reader:appearance:v1";' +
  'var raw=localStorage.getItem(key);' +
  'var mode="system";' +
  'if(raw){try{var p=JSON.parse(raw);mode=typeof p==="string"?p:(p&&p.mode)||mode;}catch(_){mode=raw;}}' +
  'var systemDark=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches;' +
  'var isDark=mode==="dark"||(mode==="system"&&systemDark);' +
  'var root=document.documentElement;' +
  'root.setAttribute("data-theme",isDark?"dark":"light");' +
  'var bg=isDark?"#0B1622":"#FFFFFF";' +
  'var fg=isDark?"#F3F7FA":"#0B1F33";' +
  'root.style.backgroundColor=bg;' +
  'root.style.color=fg;' +
  'root.style.setProperty("--ht-paper",bg);' +
  'root.style.setProperty("--ht-ink",fg);' +
  '}catch(_){}})();';

const rootCss =
  ':root{--ht-paper:#FFFFFF;--ht-paper-muted:#F6F8FA;--ht-ink:#0B1F33;--ht-ink-muted:#5B6776;--ht-border:#DCE3EA;--ht-navy:#071A2B;}' +
  ':root[data-theme="dark"]{--ht-paper:#0B1622;--ht-paper-muted:#122233;--ht-ink:#F3F7FA;--ht-ink-muted:#A9B7C5;--ht-border:#2A3C4F;--ht-navy:#050F19;}' +
  '@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--ht-paper:#0B1622;--ht-paper-muted:#122233;--ht-ink:#F3F7FA;--ht-ink-muted:#A9B7C5;--ht-border:#2A3C4F;--ht-navy:#050F19;}}' +
  ':root[data-theme="dark"] [aria-label="HealthTimes Home"] [dir="auto"]{color:var(--ht-ink,#F3F7FA)!important;}' +
  '@media (prefers-color-scheme: dark){:root:not([data-theme="light"]) [aria-label="HealthTimes Home"] [dir="auto"]{color:var(--ht-ink,#F3F7FA)!important;}}' +
  ':root[data-theme="light"] [aria-label="HealthTimes Home"] [dir="auto"]{color:var(--ht-ink,#0B1F33)!important;}' +
  'html,body,#root{max-width:100%;overflow-x:hidden}' +
  'html,body,#root{min-height:100%;background-color:var(--ht-paper);color:var(--ht-ink);}';

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
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <style dangerouslySetInnerHTML={{
          __html: rootCss
        }} />
        <script dangerouslySetInnerHTML={{ __html: deepLinkRestoreScript }} />
        <script dangerouslySetInnerHTML={{ __html: serviceWorkerRegistration }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
