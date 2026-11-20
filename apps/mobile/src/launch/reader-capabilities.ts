// HT-MVP-PUBLIC-LAUNCH-01-G5: features that exist in navigation or copy but are
// not yet implemented must not be presented as working. Flip a flag only in the
// same reviewed change that ships the working feature.
export type ReaderLaunchCapabilities = {
  /** Narrated or uploaded audio with a working player. No player exists yet. */
  readonly audioPlayback: boolean;
};

export const READER_LAUNCH_CAPABILITIES: ReaderLaunchCapabilities = Object.freeze({
  audioPlayback: false
});

export function exploreFormats(options: { premiumAvailable: boolean; audioPlayback?: boolean }): string[] {
  const audio = options.audioPlayback ?? READER_LAUNCH_CAPABILITIES.audioPlayback;
  return ["Articles", "Live", "Video", ...(audio ? ["Audio"] : []), ...(options.premiumAvailable ? ["Premium"] : [])];
}

export type CapabilityGated = { readonly requires?: keyof ReaderLaunchCapabilities };

export function availableClaims<T extends CapabilityGated>(items: readonly T[], capabilities: ReaderLaunchCapabilities = READER_LAUNCH_CAPABILITIES): T[] {
  return items.filter((item) => !item.requires || capabilities[item.requires]);
}
