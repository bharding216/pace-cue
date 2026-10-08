/**
 * Cloudflare Worker — pacecue.dev share link proxy.
 *
 * Routes:
 *   /w/<code>                                → proxy to Supabase share Edge Function
 *   /.well-known/apple-app-site-association  → iOS Universal Links config
 *   /.well-known/assetlinks.json             → Android App Links config
 *   /                                        → redirect to App Store
 */

const SUPABASE_SHARE_FN =
  'https://oakhqqrxsavmoeqlzcny.supabase.co/functions/v1/share';

const APP_STORE_URL =
  'https://apps.apple.com/us/app/pacecue-interval-timer/id6809834816';
const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.toddly.runningintervals';

const BUNDLE_ID = 'com.toddly.runningintervals';
const TEAM_ID = 'XXXXXXXXXX'; // TODO: Replace with your Apple Team ID

// ── Apple App Site Association ──────────────────────────────────────

const AASA = JSON.stringify({
  applinks: {
    apps: [],
    details: [
      {
        appIDs: [
          `${TEAM_ID}.${BUNDLE_ID}`,
          `${TEAM_ID}.${BUNDLE_ID}.dev`,
          `${TEAM_ID}.${BUNDLE_ID}.preview`,
        ],
        paths: ['/w/*'],
      },
    ],
  },
});

// ── Android Asset Links ─────────────────────────────────────────────

const ASSET_LINKS = JSON.stringify([
  {
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {
      namespace: 'android_app',
      package_name: BUNDLE_ID,
      // TODO: Replace with your app signing certificate SHA-256 fingerprint
      sha256_cert_fingerprints: ['TODO:ADD:YOUR:SHA256:FINGERPRINT:HERE'],
    },
  },
]);

// ── Worker ───────────────────────────────────────────────────────────

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;

    // Shared workout link — proxy to Supabase Edge Function
    const workoutMatch = pathname.match(/^\/w\/([A-Za-z0-9]{4,16})$/);
    if (workoutMatch) {
      const code = workoutMatch[1];
      const upstream = `${SUPABASE_SHARE_FN}?code=${code}`;
      const resp = await fetch(upstream, {
        headers: { 'User-Agent': 'pacecue-share-proxy' },
      });

      return new Response(resp.body, {
        status: resp.status,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    // iOS Universal Links
    if (pathname === '/.well-known/apple-app-site-association') {
      return new Response(AASA, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    // Android App Links
    if (pathname === '/.well-known/assetlinks.json') {
      return new Response(ASSET_LINKS, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    // Root → redirect to App Store (or a future marketing page)
    const ua = request.headers.get('User-Agent') || '';
    const isAndroid = /Android/i.test(ua);
    return Response.redirect(isAndroid ? PLAY_STORE_URL : APP_STORE_URL, 302);
  },
} satisfies ExportedHandler;
