#!/usr/bin/env bash
# CI staging egress control (docs/cost-recovery/CI_STAGING_EGRESS_CONTROL.md).
#
# HealthTimes staging runs on Supabase Free, whose cached-egress quota is shared by
# every CI browser and emulator pass. Builds that render the Reader in CI use the
# verified Cloudflare Pages mirror for public archive media (migrated-media and
# allowlisted newsroom-public keys only; see apps/mobile/src/services/public-media-origin.ts).
# Restricted and private media, REST, RPC, Auth and Functions still use staging.
#
#   enable          Export the mirror origin to later steps of this job via $GITHUB_ENV,
#                   after confirming the mirror serves a verified archive object.
#                   Place it after unit-test steps (they keep the default Supabase
#                   configuration they assert) and before any build or Metro start.
#   verify [dir]    Fail unless the mirror origin was compiled into the exported web
#                   bundle under dir (default apps/mobile/dist). Metro inlines
#                   EXPO_PUBLIC_* at transform time, so a stale cache could hide it.
#
# There is no fallback to Supabase: an unreachable mirror fails the job instead of
# silently moving the egress back to staging.
set -euo pipefail

ORIGIN="https://healthtimes-media.pages.dev"
# A manifest-verified archive object (docs/cost-recovery/PUBLIC_MEDIA_CLOUDFLARE.md).
PROBE_PATH="wordpress/2026/09/zimbabwe-social-contracting-hiv-financing-dialogue.jpg"

case "${1:-}" in
  enable)
    : "${GITHUB_ENV:?GITHUB_ENV is required; run this inside a GitHub Actions job}"
    content_type="$(curl -fsSI -o /dev/null -w '%{content_type}' --retry 3 --retry-delay 5 --max-time 30 "$ORIGIN/$PROBE_PATH")" || {
      echo "PUBLIC_MEDIA_MIRROR_UNREACHABLE: $ORIGIN/$PROBE_PATH" >&2
      exit 1
    }
    case "$content_type" in
      image/jpeg*) ;;
      *) echo "PUBLIC_MEDIA_MIRROR_UNEXPECTED_CONTENT_TYPE: $content_type" >&2; exit 1 ;;
    esac
    echo "EXPO_PUBLIC_HEALTHTIMES_MEDIA_BASE_URL=$ORIGIN" >> "$GITHUB_ENV"
    echo "HEALTHTIMES_CI_PUBLIC_MEDIA_ORIGIN=$ORIGIN" >> "$GITHUB_ENV"
    echo "CI egress control: public archive media for later builds in this job will use $ORIGIN"
    ;;
  verify)
    dir="${2:-apps/mobile/dist}"
    test -d "$dir/_expo" || { echo "MEDIA_ORIGIN_VERIFY_NO_BUNDLE: $dir/_expo" >&2; exit 1; }
    grep -rqF "$ORIGIN" "$dir/_expo" || { echo "MEDIA_ORIGIN_NOT_COMPILED: $dir" >&2; exit 1; }
    echo "CI egress control: $ORIGIN is compiled into $dir"
    ;;
  *)
    echo "usage: $0 enable | verify [dir]" >&2
    exit 2
    ;;
esac
