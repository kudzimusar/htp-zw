export interface AdCreativeFrameInput {
  viewportWidth: number;
  naturalWidth: number | null;
  naturalHeight: number | null;
  maxWidth: number;
  fallbackAspect: number;
  horizontalGutter?: number;
}

export interface AdCreativeFrame {
  width: number;
  aspectRatio: number;
}

export function resolveAdCreativeFrame({
  viewportWidth,
  naturalWidth,
  naturalHeight,
  maxWidth,
  fallbackAspect,
  horizontalGutter = 32
}: AdCreativeFrameInput): AdCreativeFrame {
  const viewportCap = viewportWidth > 0 ? Math.max(1, viewportWidth - horizontalGutter) : maxWidth;
  const widthCap = Math.max(1, Math.min(maxWidth, viewportCap));
  const hasNaturalSize =
    typeof naturalWidth === "number" &&
    typeof naturalHeight === "number" &&
    naturalWidth > 0 &&
    naturalHeight > 0;
  const width = hasNaturalSize ? Math.min(naturalWidth, widthCap) : widthCap;
  const aspectRatio = hasNaturalSize ? naturalWidth / naturalHeight : fallbackAspect;
  return { width, aspectRatio };
}
