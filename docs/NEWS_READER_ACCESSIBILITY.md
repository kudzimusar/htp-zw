# HealthTimes Listen — article narration

HealthTimes Listen gives readers an audio alternative on article pages. It is designed for readers who prefer listening, people using the site while commuting or multitasking, and users who benefit from text-to-speech accessibility.

## Reader experience

Every HealthTimes article includes a **Listen to this story** player near the article heading. The player provides:

- Listen / Pause / Resume
- Stop
- reading speeds of 0.75×, 1×, 1.25× and 1.5×
- current narration progress by article segment
- an approximate listening time
- the best available English voice supplied by the reader's device/browser

The feature uses the browser/device speech engine. No audio recording is uploaded by HealthTimes and the frontend does not send article text to a separate HealthTimes speech service.

## Premium boundary

HealthTimes Listen follows the same entitlement rules as visual Premium reading.

- A non-member may listen while the Premium preview is active.
- When the Premium preview expires, narration is cancelled immediately.
- The player displays **Premium preview ended — subscribe to continue listening**.
- Protected Premium paragraphs are excluded after the lock is active.
- Premium members can listen to the full article without interruption.

This is important because text-to-speech must never become a route around the Premium research gate.

## Mobile behavior

On mobile, the player is a compact article control rather than a desktop-sized audio console. It sits inside the article flow and does not compete with the native-style bottom navigation. The article action rail also exposes a Listen shortcut on desktop.

## Browser support

HealthTimes Listen uses the Web Speech API (`speechSynthesis`). Current Chromium- and WebKit-based browsers commonly provide this capability, but voice availability and quality depend on the operating system and installed voices. If the feature is unavailable, the player remains visible and explains that audio reading is not supported in that browser.

## Production evolution

For a later production phase, HealthTimes may choose to add server-generated studio-quality narration, persistent audio files, podcast/RSS distribution, background playback, chapter navigation and analytics. Those features are not required for the current client-review product.
