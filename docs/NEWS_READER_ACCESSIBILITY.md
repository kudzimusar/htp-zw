# HealthTimes Listen — article narration

HealthTimes Listen gives readers an audio alternative on article pages. It is designed for readers who prefer listening, people using the site while commuting or multitasking, and users who benefit from text-to-speech accessibility.

## Reader experience

Every HealthTimes article exposes one compact **speaker icon** in the standard article action row. The control deliberately behaves like the other article actions instead of opening a large audio console:

- tap once to start listening;
- tap again to pause;
- tap again to resume;
- the icon receives a clear active state while narration is playing;
- accessible labels announce Listen, Pause and Resume states to assistive technology.

There is no separate speed/progress panel in the reader-facing interface. The intent is to keep listening available without competing visually with the journalism.

## Voice quality

HealthTimes Listen uses the browser/device speech engine, but it does not simply select the first English voice returned by the device. It ranks available voices and prefers higher-quality English options when the operating system exposes them.

Priority signals include:

- Natural, Enhanced, Premium, Neural or Online voice variants;
- reputable platform voices supplied by Apple, Google or Microsoft;
- Zimbabwean English when a strong `en-ZW` voice is available;
- then British English, followed by other high-quality English regional voices;
- novelty, robotic and eSpeak-style voices are strongly deprioritised.

Voice quality still ultimately depends on the operating system and installed voices. The current implementation does not upload article text to a separate HealthTimes speech service.

## Premium boundary

HealthTimes Listen follows the same entitlement rules as visual Premium reading.

- A non-member may listen while the Premium preview is active.
- When the Premium preview expires, narration is cancelled immediately.
- The speaker control changes to the Premium-ended state and opens the membership route when selected.
- Protected Premium paragraphs are excluded after the lock is active.
- Premium members can listen to the full article without interruption.

Text-to-speech must never become a route around the Premium research gate.

## Mobile behavior

The same compact speaker icon is used on mobile and desktop. On phone-sized layouts it remains inside the article action row with Save, Share and Ask HealthTimes, keeping the interface proportional to the device and consistent with the native-style bottom navigation.

## Browser support

HealthTimes Listen uses the Web Speech API (`speechSynthesis`). Chromium- and WebKit-based browsers commonly provide this capability, but voice availability and quality depend on the operating system and installed voices. If speech synthesis is unavailable, the control is disabled with an accessible explanation.

## Production evolution

For a later production phase, HealthTimes may choose to add server-generated studio-quality narration, persistent audio files, podcast/RSS distribution, background playback, chapter navigation and listening analytics. Those features are not required for the current client-review product.
