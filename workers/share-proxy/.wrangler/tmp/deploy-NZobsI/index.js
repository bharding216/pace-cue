var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/layout.ts
var APP_STORE_URL = "https://apps.apple.com/us/app/pacecue-interval-timer/id6809834816";
var BASE_URL = "https://pacecue.dev";
var APP_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "MobileApplication",
  name: "PaceCue",
  description: "A running app for iPhone providing real-time audio pace announcements, structured interval workouts with voice coaching, and an AI workout builder. Supports GPS pace tracking, customizable audio cues, and hands-free operation for runners.",
  applicationCategory: "SportsApplication",
  operatingSystem: "iOS",
  url: BASE_URL,
  downloadUrl: APP_STORE_URL,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD"
  },
  featureList: [
    "Real-time voice pace announcements",
    "GPS pace tracking",
    "Structured interval workouts",
    "AI workout builder",
    "Customizable audio cues (voice, beeps, or both)",
    "Elapsed time announcements",
    "Countdown warnings before interval transitions",
    "Target pace alerts",
    "Workout sharing",
    "Cloud sync",
    "Background operation with screen locked",
    "Home screen widgets",
    "iOS Live Activities"
  ]
};
var NAV_LINKS = [
  { label: "Features", href: "/features/audio-pace-announcements" },
  { label: "Intervals", href: "/features/interval-running" },
  { label: "AI Builder", href: "/features/ai-workout-builder" },
  { label: "Compare", href: "/compare/pacecue-vs-nike-run-club" },
  { label: "Pace Calculator", href: "/tools/pace-calculator" },
  { label: "Guides", href: "/guides/beginner-run-walk" }
];
function renderPage(meta, body) {
  const canonical = `${BASE_URL}${meta.path}`;
  const jsonLd = meta.jsonLd ?? APP_JSON_LD;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(meta.title)}</title>
  <meta name="description" content="${escapeAttr(meta.description)}">
  <link rel="canonical" href="${canonical}">
  <link rel="icon" type="image/png" href="/favicon.png">

  <!-- Open Graph -->
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escapeAttr(meta.title)}">
  <meta property="og:description" content="${escapeAttr(meta.description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:site_name" content="PaceCue">
  <meta property="og:image" content="${BASE_URL}/banner.png">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeAttr(meta.title)}">
  <meta name="twitter:description" content="${escapeAttr(meta.description)}">
  <meta name="twitter:image" content="${BASE_URL}/banner.png">

  <!-- JSON-LD Structured Data -->
  <script type="application/ld+json">${JSON.stringify(jsonLd)}<\/script>

  <style>${CSS}</style>
</head>
<body>
  <nav class="nav" aria-label="Main navigation">
    <div class="nav-inner">
      <a href="/" class="nav-brand">
        <img src="/icon.png" alt="PaceCue logo" class="nav-logo" width="32" height="32">
        PaceCue
      </a>
      <input type="checkbox" id="nav-toggle" class="nav-toggle-input" aria-label="Toggle navigation">
      <label for="nav-toggle" class="nav-toggle" aria-hidden="true">
        <span></span><span></span><span></span>
      </label>
      <div class="nav-links">
        ${NAV_LINKS.map(
    (l) => `<a href="${l.href}" class="nav-link">${l.label}</a>`
  ).join("\n        ")}
        <a href="${APP_STORE_URL}" class="nav-cta" rel="noopener">Download</a>
      </div>
    </div>
  </nav>

  <main>
    ${body}
  </main>

  <footer class="footer">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand-col">
          <div class="footer-brand">
            <img src="/icon.png" alt="PaceCue" width="40" height="40" class="footer-logo">
            <span>PaceCue</span>
          </div>
          <p class="footer-text">Real-time voice coaching for runners. Interval training, pace tracking, and AI-powered workouts.</p>
        </div>
        <div>
          <h3 class="footer-heading">Features</h3>
          <ul class="footer-links">
            <li><a href="/features/audio-pace-announcements">Audio Pace Announcements</a></li>
            <li><a href="/features/interval-running">Interval Running</a></li>
            <li><a href="/features/ai-workout-builder">AI Workout Builder</a></li>
            <li><a href="/tools/pace-calculator">Pace Calculator</a></li>
          </ul>
        </div>
        <div>
          <h3 class="footer-heading">Guides & Compare</h3>
          <ul class="footer-links">
            <li><a href="/guides/beginner-run-walk">Beginner Run/Walk</a></li>
            <li><a href="/guides/maintain-running-pace">Maintain Running Pace</a></li>
            <li><a href="/guides/hands-free-running">Hands-Free Running</a></li>
            <li><a href="/guides/audio-coaching-vs-gps-watches">Audio vs GPS Watches</a></li>
            <li><a href="/compare/pacecue-vs-nike-run-club">vs Nike Run Club</a></li>
            <li><a href="/compare/pacecue-vs-strava">vs Strava</a></li>
            <li><a href="/compare/pacecue-vs-runna">vs Runna</a></li>
          </ul>
        </div>
        <div>
          <h3 class="footer-heading">Download</h3>
          <ul class="footer-links">
            <li><a href="${APP_STORE_URL}" rel="noopener">App Store (iPhone)</a></li>
          </ul>
        </div>
      </div>
      <p class="footer-copy">&copy; ${(/* @__PURE__ */ new Date()).getFullYear()} PaceCue. All rights reserved.</p>
    </div>
  </footer>
</body>
</html>`;
}
__name(renderPage, "renderPage");
function phoneFrame(src, alt) {
  return `<div class="phone-frame">
  <div class="phone-notch"></div>
  <img src="${src}" alt="${escapeAttr(alt)}" loading="lazy" width="280">
</div>`;
}
__name(phoneFrame, "phoneFrame");
function ctaBanner(heading, sub) {
  return `<div class="section">
  <div class="cta-banner">
    <h2>${heading}</h2>
    <p>${sub}</p>
    <a href="${APP_STORE_URL}" class="btn btn-primary btn-glow" rel="noopener">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
      Download on App Store
    </a>
  </div>
</div>`;
}
__name(ctaBanner, "ctaBanner");
function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
__name(escapeHtml, "escapeHtml");
function escapeAttr(s) {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}
__name(escapeAttr, "escapeAttr");
var CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --green: #4ADE80;
    --green-dim: #22C55E;
    --green-glow: rgba(74, 222, 128, 0.3);
    --blue: #60A5FA;
    --red: #F87171;
    --yellow: #FBBF24;
    --bg: #0A0A0F;
    --surface: #12121A;
    --card: #16161F;
    --card-border: #1E1E2A;
    --text: #F1F5F9;
    --text-secondary: #94A3B8;
    --text-muted: #475569;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.7;
    -webkit-font-smoothing: antialiased;
    overflow-x: hidden;
  }

  a { color: var(--green); text-decoration: none; transition: color 0.2s; }
  a:hover { color: #6EE7A0; text-decoration: none; }

  .container { max-width: 800px; margin: 0 auto; padding: 0 24px; }
  .container-wide { max-width: 1100px; margin: 0 auto; padding: 0 24px; }

  /* \u2500\u2500 Navigation \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
  .nav {
    border-bottom: 1px solid rgba(255,255,255,0.06);
    padding: 0 24px;
    position: sticky;
    top: 0;
    background: rgba(10, 10, 15, 0.85);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    z-index: 100;
    height: 64px;
  }
  .nav-inner {
    max-width: 1100px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 100%;
  }
  .nav-brand {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 20px;
    font-weight: 800;
    color: var(--green);
    letter-spacing: 0.5px;
  }
  .nav-brand:hover { color: var(--green); }
  .nav-logo { border-radius: 8px; }
  .nav-links { display: flex; gap: 24px; align-items: center; }
  .nav-link { color: var(--text-secondary); font-size: 14px; font-weight: 500; transition: color 0.2s; }
  .nav-link:hover { color: var(--text); }
  .nav-cta {
    background: var(--green);
    color: var(--bg) !important;
    padding: 8px 18px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.3px;
    transition: transform 0.15s, box-shadow 0.15s;
  }
  .nav-cta:hover { transform: translateY(-1px); box-shadow: 0 4px 20px var(--green-glow); }

  /* Mobile nav toggle */
  .nav-toggle-input { display: none; }
  .nav-toggle { display: none; cursor: pointer; flex-direction: column; gap: 5px; }
  .nav-toggle span { display: block; width: 22px; height: 2px; background: var(--text-secondary); border-radius: 2px; transition: 0.3s; }

  @media (max-width: 768px) {
    .nav-toggle { display: flex; }
    .nav-links {
      position: fixed; top: 64px; left: 0; right: 0;
      background: rgba(10,10,15,0.97);
      backdrop-filter: blur(20px);
      flex-direction: column;
      padding: 24px;
      gap: 16px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      transform: translateY(-120%);
      transition: transform 0.3s;
    }
    .nav-toggle-input:checked ~ .nav-links { transform: translateY(0); }
  }

  /* \u2500\u2500 Hero \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
  .hero {
    position: relative;
    padding: 100px 24px 80px;
    text-align: center;
    overflow: hidden;
  }
  .hero-bg {
    position: absolute;
    inset: 0;
    background: url('/banner.png') center center / cover no-repeat;
    opacity: 0.35;
    z-index: 0;
  }
  .hero-gradient {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, transparent 0%, var(--bg) 92%);
    z-index: 1;
  }
  .hero-content { position: relative; z-index: 2; }
  .hero-logo {
    width: 80px;
    height: 80px;
    border-radius: 20px;
    box-shadow: 0 0 60px var(--green-glow), 0 8px 32px rgba(0,0,0,0.5);
    margin-bottom: 28px;
    animation: float 4s ease-in-out infinite;
  }
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }
  .hero h1 {
    font-size: clamp(28px, 5vw, 52px);
    font-weight: 900;
    color: #fff;
    margin-bottom: 20px;
    line-height: 1.15;
    letter-spacing: -0.5px;
  }
  .hero h1 .green { color: var(--green); }
  .hero .subtitle {
    font-size: clamp(16px, 2.5vw, 20px);
    color: var(--text-secondary);
    max-width: 620px;
    margin: 0 auto 36px;
    line-height: 1.6;
  }

  /* \u2500\u2500 Buttons \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
  .btn-row { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 16px 32px;
    border-radius: 14px;
    font-size: 16px;
    font-weight: 700;
    text-decoration: none !important;
    transition: transform 0.15s, box-shadow 0.2s;
    cursor: pointer;
  }
  .btn:hover { transform: translateY(-2px); }
  .btn-primary {
    background: var(--green);
    color: var(--bg) !important;
  }
  .btn-glow:hover {
    box-shadow: 0 8px 40px var(--green-glow), 0 0 80px rgba(74,222,128,0.15);
  }
  .btn-secondary {
    background: var(--card);
    color: var(--text) !important;
    border: 1px solid var(--card-border);
  }
  .btn-secondary:hover { border-color: var(--green); }

  /* \u2500\u2500 Sections \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
  .section { padding: 80px 24px; }
  .section-alt { background: var(--surface); }
  .section-label {
    display: inline-block;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: var(--green);
    margin-bottom: 12px;
  }
  .section h2 {
    font-size: clamp(24px, 4vw, 36px);
    font-weight: 800;
    color: #fff;
    margin-bottom: 16px;
    letter-spacing: -0.3px;
  }
  .section h3 {
    font-size: 20px;
    font-weight: 700;
    color: #fff;
    margin-bottom: 8px;
  }
  .section p { margin-bottom: 16px; color: var(--text-secondary); }
  .section-center { text-align: center; }

  /* \u2500\u2500 Feature grid \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
  .features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
    margin-top: 40px;
  }
  .feature-card {
    background: var(--card);
    border: 1px solid var(--card-border);
    border-radius: 20px;
    padding: 32px;
    transition: border-color 0.3s, transform 0.2s, box-shadow 0.3s;
    position: relative;
    overflow: hidden;
  }
  .feature-card:hover {
    border-color: rgba(74,222,128,0.3);
    transform: translateY(-4px);
    box-shadow: 0 12px 40px rgba(0,0,0,0.3);
  }
  .feature-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, var(--green), transparent);
    opacity: 0;
    transition: opacity 0.3s;
  }
  .feature-card:hover::before { opacity: 1; }
  .feature-card h3 { font-size: 18px; margin-bottom: 8px; }
  .feature-card p { font-size: 15px; color: var(--text-muted); margin-bottom: 0; }
  .feature-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    margin-bottom: 16px;
  }
  .fi-green  { background: rgba(74,222,128,0.1); }
  .fi-blue   { background: rgba(96,165,250,0.1); }
  .fi-red    { background: rgba(248,113,113,0.1); }
  .fi-yellow { background: rgba(251,191,36,0.1); }

  /* \u2500\u2500 Phone mockup \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
  .phone-showcase {
    display: flex;
    justify-content: center;
    gap: 32px;
    flex-wrap: wrap;
    margin-top: 48px;
    perspective: 1200px;
  }
  .phone-frame {
    position: relative;
    width: 280px;
    background: #000;
    border-radius: 36px;
    padding: 12px;
    box-shadow: 0 24px 80px rgba(0,0,0,0.6), 0 0 40px rgba(74,222,128,0.08);
    border: 2px solid #222;
    overflow: hidden;
    transition: transform 0.4s;
  }
  .phone-frame:hover { transform: translateY(-8px) scale(1.02); }
  .phone-notch {
    position: absolute;
    top: 8px;
    left: 50%;
    transform: translateX(-50%);
    width: 120px;
    height: 28px;
    background: #000;
    border-radius: 0 0 16px 16px;
    z-index: 2;
  }
  .phone-frame img {
    width: 100%;
    border-radius: 24px;
    display: block;
  }
  .phone-label {
    text-align: center;
    margin-top: 16px;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-secondary);
  }

  /* \u2500\u2500 Preset list \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
  .preset-list {
    list-style: none;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 12px;
    margin-top: 24px;
  }
  .preset-item {
    background: var(--card);
    border: 1px solid var(--card-border);
    border-radius: 14px;
    padding: 18px 20px;
    transition: border-color 0.2s;
  }
  .preset-item:hover { border-color: rgba(74,222,128,0.3); }
  .preset-item strong { color: var(--green); display: block; margin-bottom: 4px; font-size: 15px; }
  .preset-item span { font-size: 13px; color: var(--text-muted); line-height: 1.5; }

  /* \u2500\u2500 Page header (subpages) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
  .page-header {
    padding: 80px 24px 48px;
    text-align: center;
    position: relative;
    overflow: hidden;
  }
  .page-header::before {
    content: '';
    position: absolute;
    top: -100px;
    left: 50%;
    transform: translateX(-50%);
    width: 600px;
    height: 400px;
    background: radial-gradient(ellipse, var(--green-glow) 0%, transparent 70%);
    opacity: 0.3;
    z-index: 0;
  }
  .page-header > * { position: relative; z-index: 1; }
  .page-header h1 {
    font-size: clamp(26px, 4vw, 42px);
    font-weight: 900;
    color: #fff;
    margin-bottom: 16px;
    max-width: 800px;
    margin-left: auto;
    margin-right: auto;
    letter-spacing: -0.3px;
  }
  .page-header p {
    font-size: 18px;
    color: var(--text-secondary);
    max-width: 600px;
    margin: 0 auto;
  }

  /* \u2500\u2500 Content prose \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
  .prose { max-width: 800px; margin: 0 auto; }
  .prose h2 { margin-top: 48px; }
  .prose h3 { margin-top: 32px; }
  .prose ul, .prose ol { padding-left: 24px; margin-bottom: 16px; }
  .prose li { margin-bottom: 8px; color: var(--text-secondary); }
  .prose li::marker { color: var(--green); }
  .prose strong { color: var(--text); }
  .prose em { color: var(--text-muted); font-style: italic; }

  /* \u2500\u2500 CTA banner \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
  .cta-banner {
    background: var(--card);
    border: 1px solid var(--card-border);
    border-radius: 24px;
    padding: 56px 40px;
    text-align: center;
    margin: 0 auto;
    max-width: 800px;
    position: relative;
    overflow: hidden;
  }
  .cta-banner::before {
    content: '';
    position: absolute;
    top: -2px; left: -2px; right: -2px; bottom: -2px;
    border-radius: 25px;
    background: linear-gradient(135deg, var(--green-glow), transparent 50%);
    z-index: -1;
  }
  .cta-banner h2 { margin-bottom: 12px; }
  .cta-banner p { margin-bottom: 28px; }

  /* \u2500\u2500 Stats row \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
  .stats-row {
    display: flex;
    gap: 48px;
    justify-content: center;
    flex-wrap: wrap;
    margin-top: 40px;
    padding-top: 40px;
    border-top: 1px solid rgba(255,255,255,0.06);
  }
  .stat { text-align: center; }
  .stat-value {
    font-size: 36px;
    font-weight: 900;
    color: var(--green);
    display: block;
    letter-spacing: -1px;
  }
  .stat-label {
    font-size: 13px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-top: 4px;
  }

  /* \u2500\u2500 Interval viz \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
  .interval-viz {
    display: flex;
    align-items: end;
    gap: 3px;
    height: 40px;
    margin: 20px 0;
  }
  .iv-bar {
    flex: 1;
    border-radius: 3px 3px 0 0;
    min-width: 6px;
    animation: growUp 0.6s ease-out forwards;
    transform-origin: bottom;
  }
  @keyframes growUp { from { transform: scaleY(0); } to { transform: scaleY(1); } }
  .iv-warmup { background: var(--yellow); }
  .iv-hard   { background: var(--red); }
  .iv-easy   { background: var(--green); }
  .iv-cool   { background: var(--blue); }

  /* \u2500\u2500 Footer \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
  .footer {
    border-top: 1px solid rgba(255,255,255,0.06);
    padding: 56px 24px 36px;
    background: #06060A;
  }
  .footer-grid {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr 1fr;
    gap: 40px;
    margin-bottom: 40px;
  }
  .footer-brand {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
  }
  .footer-brand span { font-size: 20px; font-weight: 800; color: var(--green); }
  .footer-logo { border-radius: 10px; }
  .footer-heading { color: var(--text); font-size: 14px; font-weight: 700; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 1px; }
  .footer-text { color: var(--text-muted); font-size: 14px; line-height: 1.6; }
  .footer-links { list-style: none; }
  .footer-links li { margin-bottom: 10px; }
  .footer-links a { color: var(--text-muted); font-size: 14px; }
  .footer-links a:hover { color: var(--green); }
  .footer-copy { color: var(--text-muted); font-size: 13px; text-align: center; border-top: 1px solid rgba(255,255,255,0.04); padding-top: 28px; }

  @media (max-width: 768px) {
    .footer-grid { grid-template-columns: 1fr 1fr; gap: 32px; }
    .footer-brand-col { grid-column: 1 / -1; }
  }
  @media (max-width: 480px) {
    .footer-grid { grid-template-columns: 1fr; }
  }
  /* \u2500\u2500 Comparison tables \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
  .compare-table-wrap { overflow-x: auto; margin-top: 24px; }
  .compare-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
  }
  .compare-table th {
    text-align: left;
    padding: 14px 16px;
    background: var(--card);
    color: var(--text);
    font-weight: 700;
    border-bottom: 2px solid var(--card-border);
    white-space: nowrap;
  }
  .compare-table td {
    padding: 12px 16px;
    border-bottom: 1px solid rgba(255,255,255,0.04);
    color: var(--text-secondary);
    vertical-align: top;
  }
  .compare-table tr:hover td { background: rgba(255,255,255,0.02); }
  .compare-table td.yes { color: var(--green); }
  .compare-table td.no { color: var(--text-muted); }
  .compare-table td.partial { color: var(--yellow); }
  .pace-ref-table td { text-align: center; font-variant-numeric: tabular-nums; }
  .pace-ref-table td:first-child,
  .pace-ref-table td:nth-child(2) { font-weight: 600; color: var(--text); text-align: left; }

  /* \u2500\u2500 Calculator \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
  .calc-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
  }
  .calc-card {
    background: var(--card);
    border: 1px solid var(--card-border);
    border-radius: 20px;
    padding: 28px;
  }
  .calc-card h2 { font-size: 20px; margin-bottom: 6px; }
  .calc-card p { font-size: 14px; color: var(--text-muted); margin-bottom: 20px; }
  .calc-row { margin-bottom: 16px; }
  .calc-row label {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-secondary);
    margin-bottom: 6px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .calc-input-group { display: flex; align-items: center; gap: 6px; }
  .calc-input-group span { color: var(--text-muted); font-size: 20px; font-weight: 700; }
  .calc-input {
    width: 72px;
    background: var(--surface);
    border: 1px solid var(--card-border);
    border-radius: 10px;
    color: var(--text);
    font-size: 18px;
    font-weight: 700;
    padding: 10px 12px;
    text-align: center;
    font-variant-numeric: tabular-nums;
    outline: none;
    transition: border-color 0.2s;
  }
  .calc-input:focus { border-color: var(--green); }
  .calc-select {
    width: 100%;
    background: var(--surface);
    border: 1px solid var(--card-border);
    border-radius: 10px;
    color: var(--text);
    font-size: 15px;
    padding: 10px 12px;
    outline: none;
    cursor: pointer;
  }
  .calc-select:focus { border-color: var(--green); }
  .calc-result {
    background: var(--surface);
    border-radius: 12px;
    padding: 16px;
    margin-top: 16px;
  }
  .calc-result-row {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    font-size: 15px;
  }
  .calc-result-row span { color: var(--text-muted); }
  .calc-result-row strong { color: var(--green); font-variant-numeric: tabular-nums; }

  @media (max-width: 640px) {
    .hero { padding: 60px 16px 48px; }
    .section { padding: 56px 16px; }
    .page-header { padding: 56px 16px 32px; }
    .cta-banner { padding: 36px 20px; border-radius: 20px; }
    .phone-showcase { gap: 20px; }
    .phone-frame { width: 240px; }
    .stats-row { gap: 32px; }
    .features-grid { grid-template-columns: 1fr; }
    .calc-grid { grid-template-columns: 1fr; }
  }
`;

// src/pages/home.ts
function homePage() {
  return renderPage(
    {
      title: "PaceCue \u2014 Real-Time Voice Pace Coaching and Interval Training App for Runners",
      description: "PaceCue is an iPhone running app that provides real-time audio pace announcements, structured interval workouts with voice coaching, GPS pace tracking, and an AI workout builder. Available on iOS.",
      path: "/"
    },
    `
    <!-- \u2500\u2500 Hero \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->
    <section class="hero">
      <div class="hero-bg" role="presentation"></div>
      <div class="hero-gradient" role="presentation"></div>
      <div class="hero-content">
        <img src="/icon.png" alt="PaceCue app icon" class="hero-logo" width="80" height="80">
        <h1>Real-Time <span class="green">Voice Pace Coaching</span> for Runners</h1>
        <p class="subtitle">PaceCue is an interval running app for iPhone that coaches you with audio announcements for pace, distance, elapsed time, and interval transitions \u2014 so you can focus on running, not your screen.</p>
        <div class="btn-row">
          <a href="${APP_STORE_URL}" class="btn btn-primary btn-glow" rel="noopener">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
            Download on App Store
          </a>
        </div>
        <div class="stats-row">
          <div class="stat"><span class="stat-value">11</span><span class="stat-label">Built-in Workouts</span></div>
          <div class="stat"><span class="stat-value">4</span><span class="stat-label">Audio Cue Modes</span></div>
          <div class="stat"><span class="stat-value">AI</span><span class="stat-label">Workout Builder</span></div>
        </div>
      </div>
    </section>

    <!-- \u2500\u2500 App Screenshots \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->
    <section class="section section-center">
      <div class="container-wide">
        <span class="section-label">See It In Action</span>
        <h2>Designed for Runners Who Mean Business</h2>
        <p>A clean, dark interface built for glanceable info during workouts \u2014 or no glances at all.</p>
        <div class="phone-showcase">
          <div>
            ${phoneFrame("/screenshot-workouts.png", "PaceCue workout list showing interval workouts with start buttons")}
            <p class="phone-label">Workout Library</p>
          </div>
          <div>
            ${phoneFrame("/screenshot-ai-builder.png", "PaceCue AI workout builder chat generating a beginner interval workout")}
            <p class="phone-label">AI Workout Builder</p>
          </div>
          <div>
            ${phoneFrame("/screenshot-history.png", "PaceCue workout history showing completed run with split times and pace data")}
            <p class="phone-label">Run History & Splits</p>
          </div>
        </div>
      </div>
    </section>

    <!-- \u2500\u2500 What Is PaceCue \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->
    <section class="section section-alt">
      <div class="container-wide">
        <span class="section-label">What Is PaceCue</span>
        <h2>Voice-Coached Interval Training and GPS Pace Tracking</h2>
        <p>PaceCue is a running app designed for runners who want structured interval workouts with hands-free voice coaching. Instead of constantly checking your phone or watch, PaceCue announces your current pace, elapsed time, distance, and interval transitions out loud.</p>
        <p>Whether you're doing 400-meter repeats, tempo runs, fartlek sessions, or run/walk intervals, PaceCue guides you through every phase with clear audio cues.</p>

        <div class="features-grid">
          <div class="feature-card">
            <div class="feature-icon fi-green" aria-hidden="true">\u{1F399}\uFE0F</div>
            <h3>Voice Pace Announcements</h3>
            <p>Hear your current pace (min/mile or min/km) at configurable intervals \u2014 every 15, 30, 60, or 120 seconds \u2014 using GPS-based tracking with a rolling average for accuracy.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon fi-red" aria-hidden="true">\u23F1\uFE0F</div>
            <h3>Interval Timer With Audio Cues</h3>
            <p>Build structured workouts with warmup, hard, easy, and cooldown intervals. PaceCue announces each transition, tells you what's next, and gives countdown warnings.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon fi-blue" aria-hidden="true">\u{1F916}</div>
            <h3>AI Workout Builder</h3>
            <p>Describe what you want in plain English \u2014 like "a 30-minute tempo run with strides" \u2014 and PaceCue's AI generates a complete interval workout.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon fi-green" aria-hidden="true">\u{1F4CA}</div>
            <h3>GPS Pace Tracking</h3>
            <p>Real-time GPS tracks your pace, distance, and speed throughout your run. Set target paces on individual intervals and get alerts when you drift off target.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon fi-yellow" aria-hidden="true">\u{1F507}</div>
            <h3>Runs in Background</h3>
            <p>Lock your phone and keep running. PaceCue continues tracking and announcing in the background, ducking your music volume for cues and restoring it after.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon fi-blue" aria-hidden="true">\u{1F4E4}</div>
            <h3>Workout Sharing</h3>
            <p>Share your workout structures and completed results with other runners via a link. Recipients can import the workout directly into PaceCue.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- \u2500\u2500 More Screenshots \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->
    <section class="section section-center">
      <div class="container-wide">
        <span class="section-label">Fully Customizable</span>
        <h2>Build Your Perfect Workout</h2>
        <p>Design interval workouts with precise control \u2014 or let the AI handle it.</p>
        <div class="phone-showcase">
          <div>
            ${phoneFrame("/screenshot-editor.png", "PaceCue workout editor with warmup intervals, target pace, and effort settings")}
            <p class="phone-label">Workout Editor</p>
          </div>
          <div>
            ${phoneFrame("/screenshot-audio-cues.png", "PaceCue audio cue settings showing voice selection, music ducking, and countdown options")}
            <p class="phone-label">Audio & Voice Settings</p>
          </div>
          <div>
            ${phoneFrame("/screenshot-profile.png", "PaceCue running profile with experience level, pace settings, and training goals")}
            <p class="phone-label">Running Profile</p>
          </div>
        </div>
      </div>
    </section>

    <!-- \u2500\u2500 Who Is It For \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->
    <section class="section section-alt">
      <div class="container-wide">
        <span class="section-label">Who It's For</span>
        <h2>Built for Every Kind of Runner</h2>
        <div class="features-grid">
          <div class="feature-card">
            <h3>Interval Runners</h3>
            <p>Speed work, tempo runs, fartlek, hill repeats \u2014 PaceCue handles the timing so you can focus on effort.</p>
          </div>
          <div class="feature-card">
            <h3>Beginners Using Run/Walk</h3>
            <p>Following a run/walk program? PaceCue tells you when to run and when to walk with clear voice cues.</p>
          </div>
          <div class="feature-card">
            <h3>Pace-Conscious Runners</h3>
            <p>Training for a race pace? Get regular audio reminders of your current speed without looking at a screen.</p>
          </div>
          <div class="feature-card">
            <h3>Self-Coached Athletes</h3>
            <p>No coach? The AI builder creates workouts tailored to your fitness level and training goals.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- \u2500\u2500 Presets \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->
    <section class="section">
      <div class="container-wide">
        <span class="section-label">Ready to Run</span>
        <h2>11 Built-In Workout Presets</h2>
        <p>Start immediately with ready-to-run workouts. Every preset can be customized or used as a starting point.</p>

        <!-- Interval visualization -->
        <div class="interval-viz" aria-hidden="true">
          <div class="iv-bar iv-warmup" style="height:35%"></div>
          <div class="iv-bar iv-warmup" style="height:40%"></div>
          <div class="iv-bar iv-hard" style="height:90%"></div>
          <div class="iv-bar iv-easy" style="height:45%"></div>
          <div class="iv-bar iv-hard" style="height:95%"></div>
          <div class="iv-bar iv-easy" style="height:40%"></div>
          <div class="iv-bar iv-hard" style="height:100%"></div>
          <div class="iv-bar iv-easy" style="height:45%"></div>
          <div class="iv-bar iv-hard" style="height:85%"></div>
          <div class="iv-bar iv-easy" style="height:40%"></div>
          <div class="iv-bar iv-hard" style="height:90%"></div>
          <div class="iv-bar iv-easy" style="height:45%"></div>
          <div class="iv-bar iv-hard" style="height:80%"></div>
          <div class="iv-bar iv-easy" style="height:42%"></div>
          <div class="iv-bar iv-cool" style="height:30%"></div>
          <div class="iv-bar iv-cool" style="height:25%"></div>
        </div>

        <ul class="preset-list">
          <li class="preset-item"><strong>5K Speed</strong><span>6 \xD7 (3 min hard / 2 min easy) with warmup and cooldown</span></li>
          <li class="preset-item"><strong>Tempo Run</strong><span>20-minute sustained tempo effort with stride warmup</span></li>
          <li class="preset-item"><strong>Short Intervals</strong><span>8 \xD7 (90 sec sprint / 90 sec recovery)</span></li>
          <li class="preset-item"><strong>Pyramid</strong><span>1-2-3-2-1 minute hard intervals with equal recovery</span></li>
          <li class="preset-item"><strong>Fartlek</strong><span>Mixed-length speed bursts with jog recovery</span></li>
          <li class="preset-item"><strong>Hill Repeats</strong><span>8 \xD7 (1 min hill / 90 sec jog recovery)</span></li>
          <li class="preset-item"><strong>Run/Walk</strong><span>8 \xD7 (3 min run / 1 min walk) for beginners</span></li>
          <li class="preset-item"><strong>400m Repeats</strong><span>10 \xD7 (90 sec sprint / 90 sec recovery)</span></li>
          <li class="preset-item"><strong>Mile Intervals</strong><span>4 \xD7 (6 min race pace / 2 min recovery)</span></li>
          <li class="preset-item"><strong>5K Training</strong><span>3 \xD7 tempo + 3 \xD7 speed intervals</span></li>
          <li class="preset-item"><strong>Easy 30 Min</strong><span>Simple 30-minute easy run timer</span></li>
        </ul>
      </div>
    </section>

    <!-- \u2500\u2500 Problems Solved \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->
    <section class="section section-alt">
      <div class="container-wide">
        <span class="section-label">Why PaceCue</span>
        <h2>Problems PaceCue Solves</h2>
        <div class="prose">
          <h3>Constantly checking your phone or watch</h3>
          <p>Most runners glance at their screen dozens of times per workout to check pace or see when to switch intervals. PaceCue eliminates this by <strong>announcing everything out loud</strong>. You hear your pace, when to speed up or slow down, and countdown warnings before each transition.</p>

          <h3>Losing track of intervals during speed work</h3>
          <p>Trying to remember "was that my 4th or 5th repeat?" is distracting. PaceCue tracks your position in the workout and <strong>announces the set number, block name, and what's coming next</strong> at every transition.</p>

          <h3>Building structured workouts is tedious</h3>
          <p>Instead of manually configuring every interval, you can <strong>describe your workout in plain English</strong> and let PaceCue's AI builder create it \u2014 or pick from 11 built-in presets and customize from there.</p>

          <h3>Holding a consistent target pace</h3>
          <p>PaceCue's GPS pace tracking lets you set a <strong>target pace on any interval</strong>. The app tells you if you're ahead of or behind your target, helping you lock in the right effort level.</p>
        </div>
      </div>
    </section>

    <!-- \u2500\u2500 Audio Options \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->
    <section class="section">
      <div class="container-wide">
        <span class="section-label">Audio & Platform</span>
        <h2>Customizable Audio Cues</h2>
        <div class="prose">
          <p>PaceCue is available on <strong>iOS</strong> (iPhone). It works with wired headphones, Bluetooth earbuds, or your phone's speaker.</p>

          <h3>Audio Cue Modes</h3>
          <ul>
            <li><strong>Voice</strong> \u2014 spoken announcements for pace, intervals, and time remaining</li>
            <li><strong>Beeps</strong> \u2014 short tones to mark interval transitions</li>
            <li><strong>Both</strong> \u2014 voice announcements with beep tones at transitions</li>
            <li><strong>Silent</strong> \u2014 visual-only with haptic feedback</li>
          </ul>

          <h3>Customizable Announcements</h3>
          <ul>
            <li>Pace announcements every 15, 30, 45, 60, 90, or 120 seconds</li>
            <li>Elapsed time announcements at configurable intervals</li>
            <li>Countdown warnings at 10 seconds (configurable) before interval ends</li>
            <li>Music ducking \u2014 PaceCue lowers your music volume during cues, then restores it</li>
            <li>Choose your preferred TTS voice from your device's available voices</li>
          </ul>

          <h3>Additional Features</h3>
          <ul>
            <li>Home screen widgets for quick workout access</li>
            <li>iOS Live Activities showing workout progress on the lock screen</li>
            <li>Haptic feedback at interval transitions</li>
            <li>Workout history with per-interval split times and distances</li>
            <li>Cloud sync to keep workouts across devices</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- \u2500\u2500 CTA \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 -->
    ${ctaBanner("Start Running With Real-Time Voice Coaching", "Download PaceCue free and try a built-in workout today.")}
    `
  );
}
__name(homePage, "homePage");

// src/pages/audio-pace.ts
function audioPacePage() {
  return renderPage(
    {
      title: "Audio Pace Announcements While Running \u2014 PaceCue",
      description: "PaceCue announces your current running pace, distance, and elapsed time through voice audio cues so you never have to look at your phone or watch during a run.",
      path: "/features/audio-pace-announcements"
    },
    `
    <section class="page-header">
      <h1>Running App With Audio Pace Announcements</h1>
      <p>Hear your pace, distance, and elapsed time out loud while you run \u2014 no screen-checking required.</p>
    </section>

    <section class="section section-center">
      <div class="container-wide">
        <div class="phone-showcase">
          <div>
            ${phoneFrame("/screenshot-audio-cues.png", "PaceCue audio settings showing voice selection and countdown warning configuration")}
            <p class="phone-label">Audio & Cue Settings</p>
          </div>
          <div>
            ${phoneFrame("/screenshot-history.png", "PaceCue run history showing pace data for each interval split")}
            <p class="phone-label">Pace Data Per Split</p>
          </div>
        </div>
      </div>
    </section>

    <section class="section section-alt">
      <div class="prose">
        <h2>How PaceCue's Audio Pace Announcements Work</h2>
        <p>PaceCue uses your phone's GPS to track your running speed in real time. At intervals you choose \u2014 every 15, 30, 45, 60, 90, or 120 seconds \u2014 PaceCue speaks your current pace out loud through your headphones or your phone's speaker.</p>

        <p>For example, during a run you might hear:</p>
        <ul>
          <li><em>"Current pace: 8 minutes 15 seconds per mile"</em></li>
          <li><em>"Distance: 2.4 miles"</em></li>
          <li><em>"3 minutes remaining"</em></li>
        </ul>

        <p>This lets you make adjustments without breaking stride. If you're drifting too slow on a tempo interval, the pace cue tells you immediately.</p>

        <h2>GPS Pace Tracking Details</h2>
        <p>PaceCue calculates your pace using a <strong>rolling average window</strong> \u2014 configurable at 10, 30, or 60 seconds \u2014 to smooth out GPS noise. This means you get an accurate picture of your effort rather than spiky second-by-second readings.</p>
        <p>You can display and hear pace in either <strong>minutes per mile</strong> or <strong>minutes per kilometer</strong>.</p>
        <p>PaceCue filters out inaccurate GPS samples (accuracy worse than 20 meters) to prevent phantom pace spikes when you run through tunnels, under bridges, or near tall buildings.</p>

        <h2>Target Pace Alerts</h2>
        <p>When you set a <strong>target pace</strong> on an interval, PaceCue compares your current pace to the target and tells you whether you're on pace, too fast, or too slow. This is especially useful for:</p>
        <ul>
          <li>Race-pace intervals where you need to dial in a specific speed</li>
          <li>Easy recovery intervals where you want to avoid going too fast</li>
          <li>Tempo runs where maintaining a steady effort is the goal</li>
        </ul>

        <h2>Elapsed Time Announcements</h2>
        <p>In addition to pace, PaceCue can announce the <strong>elapsed time within each interval</strong> at regular intervals (every 15, 30, 45, 60, or 120 seconds). This helps you track progress through long intervals without checking your screen.</p>

        <h2>Music Ducking</h2>
        <p>If you listen to music or podcasts while running, PaceCue temporarily <strong>lowers the volume of other audio</strong> during announcements, then restores it. You hear every cue clearly without losing your music.</p>

        <h2>Works With Screen Locked</h2>
        <p>PaceCue continues tracking your pace and making announcements while your <strong>phone screen is locked</strong> and in your pocket. The app uses background location and audio to keep running without draining your battery unnecessarily.</p>

        <h2>Audio Cue Options</h2>
        <p>PaceCue gives you full control over what you hear:</p>
        <ul>
          <li><strong>Voice mode</strong> \u2014 full spoken announcements</li>
          <li><strong>Beep mode</strong> \u2014 short tones at interval transitions only</li>
          <li><strong>Both mode</strong> \u2014 voice announcements plus transition beeps</li>
          <li><strong>Silent mode</strong> \u2014 no audio, only on-screen display and haptics</li>
        </ul>
        <p>You can also choose your preferred text-to-speech voice from your device's installed voices.</p>

        <h2>Limitations</h2>
        <ul>
          <li>GPS pace accuracy depends on satellite visibility. Indoor tracks and densely covered trails may produce less accurate readings.</li>
          <li>The first few seconds of a run may show no pace data while PaceCue collects enough GPS samples.</li>
          <li>PaceCue does not currently support external heart rate monitors or ANT+ sensors.</li>
        </ul>
      </div>
    </section>

    ${ctaBanner("Try Audio Pace Announcements", "Download PaceCue, enable pace tracking in Settings, and hear your pace on your next run.")}
    `
  );
}
__name(audioPacePage, "audioPacePage");

// src/pages/interval-running.ts
function intervalRunningPage() {
  return renderPage(
    {
      title: "Interval Running With Voice Guidance \u2014 PaceCue",
      description: "PaceCue guides you through structured interval workouts with voice announcements for every transition. Build custom intervals or choose from 11 built-in presets including tempo runs, fartlek, hill repeats, and run/walk.",
      path: "/features/interval-running"
    },
    `
    <section class="page-header">
      <h1>Interval Running With Voice Guidance</h1>
      <p>Structured workouts with clear voice coaching at every transition \u2014 warmup, hard, easy, cooldown.</p>
    </section>

    <section class="section section-center">
      <div class="container-wide">
        <div class="phone-showcase">
          <div>
            ${phoneFrame("/screenshot-workouts.png", "PaceCue workout list showing multiple interval workouts ready to start")}
            <p class="phone-label">Workout Library</p>
          </div>
          <div>
            ${phoneFrame("/screenshot-editor.png", "PaceCue workout editor with customizable intervals, effort, and target pace")}
            <p class="phone-label">Workout Editor</p>
          </div>
        </div>
      </div>
    </section>

    <section class="section section-alt">
      <div class="prose">
        <h2>How PaceCue Handles Interval Workouts</h2>
        <p>PaceCue's workout model is built around <strong>interval blocks</strong>. Each block contains one or more intervals (hard, easy, warmup, or cooldown), and each block can repeat any number of times. This structure supports everything from simple run/walk programs to complex pyramid sessions.</p>

        <p>At every interval transition, PaceCue announces:</p>
        <ul>
          <li>The interval label (e.g., "Sprint," "Recovery," "Tempo")</li>
          <li>The duration of the upcoming interval</li>
          <li>Which set you're on (e.g., "Set 3 of 6")</li>
          <li>What's coming next</li>
        </ul>
        <p>Before each transition, a <strong>countdown warning</strong> (default: 10 seconds) alerts you that a change is coming.</p>

        <!-- Interval visualization -->
        <div class="interval-viz" aria-hidden="true">
          <div class="iv-bar iv-warmup" style="height:30%"></div>
          <div class="iv-bar iv-warmup" style="height:35%"></div>
          <div class="iv-bar iv-warmup" style="height:40%"></div>
          <div class="iv-bar iv-hard" style="height:85%"></div>
          <div class="iv-bar iv-easy" style="height:45%"></div>
          <div class="iv-bar iv-hard" style="height:100%"></div>
          <div class="iv-bar iv-easy" style="height:45%"></div>
          <div class="iv-bar iv-hard" style="height:90%"></div>
          <div class="iv-bar iv-easy" style="height:45%"></div>
          <div class="iv-bar iv-hard" style="height:95%"></div>
          <div class="iv-bar iv-easy" style="height:45%"></div>
          <div class="iv-bar iv-cool" style="height:35%"></div>
          <div class="iv-bar iv-cool" style="height:30%"></div>
          <div class="iv-bar iv-cool" style="height:25%"></div>
        </div>

        <h2>Types of Intervals</h2>
        <p>Every interval in PaceCue has a type that determines its role in the workout:</p>
        <ul>
          <li><strong>Warmup</strong> \u2014 low-intensity start (jog, walk, drills, strides)</li>
          <li><strong>Hard</strong> \u2014 high-effort work intervals (sprint, tempo, race pace, threshold, hill)</li>
          <li><strong>Easy</strong> \u2014 recovery between hard efforts (walk, jog, float, rest)</li>
          <li><strong>Cooldown</strong> \u2014 low-intensity finish</li>
        </ul>
        <p>Each interval has a custom label, a duration, an optional effort level (1\u201310 scale), and an optional target pace.</p>

        <h2>Building Custom Workouts</h2>
        <p>PaceCue's workout editor lets you:</p>
        <ul>
          <li>Add multiple blocks with different interval patterns</li>
          <li>Set repeat counts on each block (e.g., "repeat 6 times")</li>
          <li>Assign labels from presets or type your own</li>
          <li>Set target paces on individual intervals</li>
          <li>Add perceived effort ratings for voice cueing</li>
          <li>Include separate warmup and cooldown phases</li>
        </ul>

        <h2>Built-In Workout Presets</h2>
        <p>PaceCue includes 11 ready-to-run presets covering common training patterns:</p>

        <h3>5K Speed</h3>
        <p>10-minute warmup \u2192 6 \xD7 (3 minutes hard / 2 minutes easy) \u2192 5-minute cooldown. A classic speed session for 5K race prep.</p>

        <h3>Tempo Run</h3>
        <p>8-minute warmup with strides \u2192 20-minute sustained tempo \u2192 5-minute cooldown. Builds lactate threshold fitness.</p>

        <h3>Fartlek</h3>
        <p>Mixed-length speed bursts \u2014 2 min, 1 min, and 30 sec segments with jog recovery. Keeps things unpredictable and fun.</p>

        <h3>Pyramid</h3>
        <p>1-2-3-2-1 minute hard intervals with equal recovery. Builds through a peak and brings you back down.</p>

        <h3>Hill Repeats</h3>
        <p>8 \xD7 (1 minute hill / 90 seconds recovery jog). Find a hill, press start, and let PaceCue time the efforts.</p>

        <h3>Run/Walk</h3>
        <p>8 \xD7 (3 minutes run / 1 minute walk). Ideal for beginners, return-from-injury runners, or easy long run strategies.</p>

        <h3>400m Repeats</h3>
        <p>10 \xD7 (90 seconds sprint / 90 seconds recovery) with stride warmup. Track-style speed work.</p>

        <h3>Mile Intervals</h3>
        <p>4 \xD7 (6 minutes at race pace / 2 minutes recovery). Practices sustained effort at goal race speed.</p>

        <h2>How Voice Guidance Helps During Intervals</h2>
        <p>Without audio guidance, interval training requires you to repeatedly check your phone or watch. PaceCue removes all of this by announcing every transition, time check, and pace update through your headphones.</p>
        <p>This is especially useful for:</p>
        <ul>
          <li><strong>Track workouts</strong> where looking at your phone breaks form</li>
          <li><strong>Trail runs</strong> where footing matters and distractions are dangerous</li>
          <li><strong>Dark or rainy conditions</strong> where screen visibility is poor</li>
          <li><strong>Long sessions</strong> with many repeats where it's easy to lose count</li>
        </ul>

        <h2>Limitations</h2>
        <ul>
          <li>PaceCue uses time-based intervals, not distance-based. A "400m repeat" is timed rather than GPS-measured to a specific distance.</li>
          <li>The app does not import workouts from other platforms like Garmin Connect or TrainingPeaks.</li>
        </ul>
      </div>
    </section>

    ${ctaBanner("Run Your First Interval Workout", "Download PaceCue and pick a preset or build your own \u2014 voice coaching starts immediately.")}
    `
  );
}
__name(intervalRunningPage, "intervalRunningPage");

// src/pages/ai-builder.ts
function aiBuilderPage() {
  return renderPage(
    {
      title: "AI Workout Builder for Running \u2014 PaceCue",
      description: "Describe a running workout in plain English and PaceCue's AI generates a complete structured interval workout. No more manually configuring every interval.",
      path: "/features/ai-workout-builder"
    },
    `
    <section class="page-header">
      <h1>AI Workout Builder \u2014 Describe It, Run It</h1>
      <p>Tell PaceCue what kind of workout you want in plain English, and the AI builds a complete interval workout for you.</p>
    </section>

    <section class="section section-center">
      <div class="container-wide">
        <div class="phone-showcase">
          <div>
            ${phoneFrame("/screenshot-ai-builder.png", "PaceCue AI workout builder generating a beginner interval workout from a natural language prompt")}
            <p class="phone-label">AI Builder Chat</p>
          </div>
          <div>
            ${phoneFrame("/screenshot-profile.png", "PaceCue running profile settings used by the AI builder for personalized workout generation")}
            <p class="phone-label">Running Profile for AI Context</p>
          </div>
        </div>
      </div>
    </section>

    <section class="section section-alt">
      <div class="prose">
        <h2>How the AI Builder Works</h2>
        <p>PaceCue's AI Workout Builder takes a natural-language description and generates a fully structured interval workout with warmup, work intervals, recovery, and cooldown \u2014 ready to run immediately.</p>

        <p>Examples of prompts you can use:</p>
        <ul>
          <li><em>"A 30-minute tempo run with a warmup and cooldown"</em></li>
          <li><em>"8 \xD7 400m repeats at 5K pace with 90 seconds recovery"</em></li>
          <li><em>"Something similar to what I ran last week but a bit harder"</em></li>
          <li><em>"A beginner run/walk program, 25 minutes total"</em></li>
          <li><em>"Pyramid intervals going 1-2-3-4-3-2-1 minutes"</em></li>
          <li><em>"A hill repeat workout for half marathon training"</em></li>
        </ul>

        <h2>Context-Aware Generation</h2>
        <p>The AI builder can use context from your <strong>running profile and workout history</strong> to generate workouts that fit your fitness level. If you've been running 7:30 pace in your recent workouts, the AI can set target paces accordingly rather than guessing.</p>
        <p>You can also have a <strong>conversation</strong> with the builder \u2014 ask it to make the workout harder, add more recovery, change the interval lengths, or adjust the warmup. The AI remembers what it already built and modifies it.</p>

        <h2>What the AI Generates</h2>
        <p>The output is a standard PaceCue workout with:</p>
        <ul>
          <li>Named warmup, main, and cooldown phases</li>
          <li>Interval durations, labels, and types</li>
          <li>Block repeat counts</li>
          <li>Optional target paces and effort ratings</li>
        </ul>
        <p>Once generated, the workout appears in your workout list. You can edit any part of it manually \u2014 change durations, add or remove intervals, adjust target paces \u2014 and then run it with full voice coaching like any other PaceCue workout.</p>

        <h2>Example: Generating a Speed Session</h2>
        <p>If you type <em>"6 \xD7 3 minutes hard with 2 minutes easy, plus a 10-minute warmup"</em>, the AI builder creates:</p>
        <ul>
          <li>1 \xD7 10-minute warmup</li>
          <li>6 \xD7 (3 minutes hard / 2 minutes easy)</li>
          <li>1 \xD7 5-minute cooldown</li>
        </ul>
        <p>Total: approximately 45 minutes. PaceCue assigns appropriate labels, and you can add target paces to the hard intervals before starting.</p>

        <h2>Limitations</h2>
        <ul>
          <li>The AI builder requires a PaceCue account (free to create) and an internet connection.</li>
          <li>AI-generated workouts should be reviewed before running \u2014 especially target paces, which the AI estimates from your history or your prompt.</li>
          <li>The AI builder creates time-based intervals. If you request distance-based intervals (e.g., "800m repeats"), the AI estimates an equivalent duration based on your fitness level.</li>
        </ul>
      </div>
    </section>

    ${ctaBanner("Build a Workout With AI", 'Download PaceCue, sign in, and tap "AI Builder" to describe your next workout.')}
    `
  );
}
__name(aiBuilderPage, "aiBuilderPage");

// src/pages/maintain-pace.ts
function maintainPacePage() {
  return renderPage(
    {
      title: "How to Maintain a Target Running Pace \u2014 PaceCue",
      description: "Learn how to hold a consistent running pace during training and races. PaceCue's real-time audio pace announcements help you lock in your target without checking your watch.",
      path: "/guides/maintain-running-pace"
    },
    `
    <section class="page-header">
      <h1>How to Maintain a Target Running Pace</h1>
      <p>Practical strategies for holding a consistent pace during training \u2014 and how audio pace feedback helps.</p>
    </section>

    <section class="section">
      <div class="prose">
        <h2>Why Consistent Pacing Matters</h2>
        <p>Starting too fast is the most common mistake in distance running. Whether you're doing a tempo run, a race-pace workout, or running a 5K, going out too hard leads to premature fatigue and slower overall times. Maintaining a consistent pace \u2014 sometimes called "even splits" \u2014 is a more efficient way to run.</p>
        <p>The problem is that pace <em>feels</em> different depending on conditions. Running at 8:00/mile pace feels easy at the start and much harder at mile 4. Your internal sense of effort isn't calibrated well enough to hold pace consistently without external feedback.</p>

        <h2>Traditional Ways to Track Pace</h2>
        <ul>
          <li><strong>GPS watch</strong> \u2014 accurate but requires looking at your wrist repeatedly, which breaks form and becomes habitual</li>
          <li><strong>Phone app with screen</strong> \u2014 requires holding your phone or stopping to check</li>
          <li><strong>Mile markers</strong> \u2014 feedback comes only once per mile, which is too infrequent for adjustments</li>
          <li><strong>Running by feel</strong> \u2014 works for experienced runners but is unreliable for specific pace targets</li>
        </ul>

        <h2>How Audio Pace Announcements Help</h2>
        <p>Audio pace feedback solves the core problem: you need frequent, accurate pace information without interrupting your running form. When your app announces <em>"Current pace: 7 minutes 45 seconds per mile"</em> every 30 seconds, you can make small adjustments immediately \u2014 speed up a little, or ease off \u2014 without ever looking down.</p>

        <p>This is particularly helpful in three scenarios:</p>

        <h3>1. Race-Pace Intervals</h3>
        <p>When you're practicing your goal race pace during interval training, hearing your actual pace compared to the target lets you calibrate your effort. Over time, you develop a better internal sense of what that pace feels like.</p>

        <h3>2. Tempo Runs</h3>
        <p>Tempo runs are supposed to be "comfortably hard" \u2014 a pace you could hold for about an hour. But it's easy to creep faster. Regular pace announcements keep you honest.</p>

        <h3>3. Easy Runs</h3>
        <p>Many runners run their easy days too fast, which impairs recovery. Hearing your pace keeps you accountable to actually running easy.</p>

        <h2>Using PaceCue for Pace Control</h2>
        <p>PaceCue provides three layers of pace feedback during runs:</p>
        <ol>
          <li><strong>Regular pace announcements</strong> \u2014 hear your current pace at intervals of 15\u2013120 seconds</li>
          <li><strong>Target pace alerts</strong> \u2014 set a target pace on any interval and PaceCue tells you if you're on pace, too fast, or too slow</li>
          <li><strong>Rolling average smoothing</strong> \u2014 pace is calculated over a configurable window (10, 30, or 60 seconds) to filter out GPS noise</li>
        </ol>

        <h2>Tips for Maintaining Pace</h2>
        <ul>
          <li><strong>Start conservatively.</strong> Run the first quarter of your workout 5\u201310 seconds per mile slower than target. You'll make it up as your body warms up.</li>
          <li><strong>Use shorter announcement intervals.</strong> During race-pace work, set pace announcements to every 15 or 30 seconds for tight feedback.</li>
          <li><strong>Use longer windows on hilly terrain.</strong> Set the pace averaging window to 60 seconds on rolling courses to avoid reacting to short uphills.</li>
          <li><strong>Don't chase every fluctuation.</strong> If one announcement shows you slightly off target, wait for the next one before adjusting \u2014 GPS has natural variance.</li>
          <li><strong>Run by effort on very hilly courses.</strong> Pace targets make less sense on steep terrain. Use PaceCue's effort ratings instead and save pace targets for flat routes.</li>
        </ul>
      </div>
    </section>

    ${ctaBanner("Get Real-Time Pace Feedback on Your Next Run", "PaceCue announces your pace out loud so you can focus on running, not your screen.")}
    `
  );
}
__name(maintainPacePage, "maintainPacePage");

// src/pages/hands-free.ts
function handsFreePage() {
  return renderPage(
    {
      title: "Hands-Free Running \u2014 How to Stop Checking Your Phone or Watch Mid-Run",
      description: "Voice-coached running with PaceCue eliminates the need to check your phone or watch. Hear pace, distance, interval transitions, and elapsed time through your headphones while you run.",
      path: "/guides/hands-free-running"
    },
    `
    <section class="page-header">
      <h1>Running Without Constantly Checking Your Watch</h1>
      <p>How voice-coached interval running lets you put your phone away and focus entirely on the run.</p>
    </section>

    <section class="section">
      <div class="prose">
        <h2>The Problem With Screen-Dependent Running</h2>
        <p>Runners look at their phone or watch <strong>dozens of times per workout</strong>. During interval training, the checking is near-constant: "How much time left? What's my pace? Which set is this?" Each glance breaks concentration, alters arm swing, and can even create a tripping hazard on trails.</p>

        <p>GPS watches help by putting the screen on your wrist, but you still have to look down. And if you're running with your phone, you're either holding it (awkward) or pulling it out of a pocket or armband (disruptive).</p>

        <h2>How Voice Coaching Solves This</h2>
        <p>The solution is simple: instead of looking at a screen, <strong>listen to your workout</strong>. A voice-coached running app speaks the information you need directly through your headphones or your phone's speaker. Your phone stays in your pocket with the screen locked.</p>

        <p>PaceCue announces:</p>
        <ul>
          <li><strong>Interval transitions</strong> \u2014 what's starting, how long it is, which set you're on</li>
          <li><strong>Current pace</strong> \u2014 your GPS-measured running speed at regular intervals</li>
          <li><strong>Elapsed time</strong> \u2014 how long you've been in the current interval</li>
          <li><strong>Countdown warnings</strong> \u2014 a heads-up before the next transition (e.g., "10 seconds remaining")</li>
          <li><strong>Target pace comparisons</strong> \u2014 whether you're faster or slower than your goal</li>
        </ul>

        <h2>What "Hands-Free" Actually Looks Like</h2>
        <p>Here's a typical PaceCue workout experience:</p>
        <ol>
          <li>Open PaceCue, tap a workout, tap Start</li>
          <li>Lock your phone and put it in your pocket or armband</li>
          <li>Run \u2014 PaceCue announces everything through your headphones</li>
          <li>When the workout finishes, PaceCue tells you it's done</li>
        </ol>
        <p>You never touch your phone during the run. PaceCue handles the entire workout \u2014 transitions, pace tracking, time announcements \u2014 automatically.</p>

        <h2>Key Features That Enable Hands-Free Running</h2>

        <h3>Background Operation</h3>
        <p>PaceCue runs in the background on iOS. Lock your screen and the app continues tracking GPS, timing intervals, and making announcements. Your phone's battery usage is minimal because the screen is off.</p>

        <h3>Music Ducking</h3>
        <p>If you're listening to music, PaceCue temporarily lowers the music volume during voice cues, then restores it. You never miss an announcement, and you never lose your music.</p>

        <h3>Haptic Feedback</h3>
        <p>PaceCue sends a haptic buzz at interval transitions \u2014 so even in loud environments, you feel the change. This works alongside or instead of voice cues.</p>

        <h3>iOS Live Activities</h3>
        <p>On iPhone, PaceCue displays your current interval, time remaining, and set progress on the Lock Screen and Dynamic Island through iOS Live Activities. If you do want to glance at your screen, the information is right there \u2014 no unlocking or opening the app.</p>

        <h3>Home Screen Widgets</h3>
        <p>Launch your favorite workout with a single tap from a home screen widget. Skip the app navigation entirely.</p>

        <h2>When Hands-Free Running Matters Most</h2>
        <ul>
          <li><strong>Trail running</strong> \u2014 uneven terrain demands your full attention on footing</li>
          <li><strong>Track workouts</strong> \u2014 constant screen-checking disrupts running form and arm carriage</li>
          <li><strong>Night running</strong> \u2014 bright screens ruin night vision and are distracting</li>
          <li><strong>Cold weather</strong> \u2014 checking a watch with gloves on is awkward; listening is effortless</li>
          <li><strong>Rainy conditions</strong> \u2014 wet screens are hard to read and waterproofing concerns are eliminated</li>
          <li><strong>Group runs</strong> \u2014 everyone hears the same cues at the same time</li>
        </ul>

        <h2>Limitations</h2>
        <ul>
          <li>You'll need headphones (wired or Bluetooth) or to be comfortable with your phone's speaker playing audio aloud during the run.</li>
          <li>In extremely noisy environments (heavy traffic, wind), voice announcements may be harder to hear. Haptic cues help as a backup.</li>
          <li>Pausing or stopping the workout does require interacting with your phone or the Lock Screen Live Activity.</li>
        </ul>
      </div>
    </section>

    ${ctaBanner("Put Your Phone Away and Just Run", "PaceCue handles the details. You handle the running.")}
    `
  );
}
__name(handsFreePage, "handsFreePage");

// src/pages/compare-nrc.ts
function compareNrcPage() {
  return renderPage(
    {
      title: "PaceCue vs Nike Run Club (NRC) \u2014 Running App Comparison",
      description: "An honest comparison of PaceCue and Nike Run Club. See how they differ on interval training, audio coaching, GPS tracking, price, and workout customization.",
      path: "/compare/pacecue-vs-nike-run-club"
    },
    `
    <section class="page-header">
      <h1>PaceCue vs Nike Run Club</h1>
      <p>An honest comparison of two running apps with very different strengths.</p>
    </section>

    <section class="section">
      <div class="prose">
        <h2>Overview</h2>
        <p><strong>PaceCue</strong> is an interval training app with real-time voice pace coaching, a custom workout builder, and an AI workout generator. It's focused on structured workouts and hands-free audio feedback.</p>
        <p><strong>Nike Run Club (NRC)</strong> is a free, all-purpose running app with guided audio runs narrated by Nike coaches, GPS tracking, training plans, and a social community. It covers running more broadly \u2014 from casual jogs to marathon training.</p>
        <p>These apps solve different problems. Here's where each one is stronger.</p>

        <h2>Feature Comparison</h2>
      </div>

      <div class="container-wide">
        <div class="compare-table-wrap">
          <table class="compare-table">
            <thead>
              <tr>
                <th>Feature</th>
                <th>PaceCue</th>
                <th>Nike Run Club</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Custom interval workouts</strong></td>
                <td class="yes">Yes \u2014 full editor with blocks, repeats, labels, effort, target pace</td>
                <td class="no">No \u2014 no custom interval builder</td>
              </tr>
              <tr>
                <td><strong>Voice pace announcements</strong></td>
                <td class="yes">Yes \u2014 configurable frequency (15s\u2013120s), rolling GPS average</td>
                <td class="partial">Limited \u2014 periodic audio cues during runs, not configurable</td>
              </tr>
              <tr>
                <td><strong>Guided coached runs</strong></td>
                <td class="no">No \u2014 PaceCue focuses on self-directed workouts</td>
                <td class="yes">Yes \u2014 extensive library of coach-narrated runs with motivation and tips</td>
              </tr>
              <tr>
                <td><strong>AI workout builder</strong></td>
                <td class="yes">Yes \u2014 describe a workout in plain English</td>
                <td class="no">No</td>
              </tr>
              <tr>
                <td><strong>Training plans</strong></td>
                <td class="no">No \u2014 PaceCue is workout-by-workout, not a multi-week plan</td>
                <td class="yes">Yes \u2014 5K, 10K, half marathon, full marathon plans</td>
              </tr>
              <tr>
                <td><strong>GPS tracking</strong></td>
                <td class="yes">Yes \u2014 pace, distance, splits per interval</td>
                <td class="yes">Yes \u2014 pace, distance, route map, elevation</td>
              </tr>
              <tr>
                <td><strong>Interval timer</strong></td>
                <td class="yes">Yes \u2014 core feature with voice transitions</td>
                <td class="partial">Basic \u2014 speed runs have intervals, but no custom builder</td>
              </tr>
              <tr>
                <td><strong>Social features</strong></td>
                <td class="no">No</td>
                <td class="yes">Yes \u2014 challenges, leaderboards, friends</td>
              </tr>
              <tr>
                <td><strong>Workout sharing</strong></td>
                <td class="yes">Yes \u2014 share workout structures and results via link</td>
                <td class="partial">Share completed runs, not workout structures</td>
              </tr>
              <tr>
                <td><strong>Music integration</strong></td>
                <td class="partial">Music ducking \u2014 lowers music during cues</td>
                <td class="yes">Spotify integration, curated playlists</td>
              </tr>
              <tr>
                <td><strong>Price</strong></td>
                <td class="yes">Free with optional premium features</td>
                <td class="yes">Completely free</td>
              </tr>
              <tr>
                <td><strong>Platforms</strong></td>
                <td class="partial">iOS</td>
                <td class="yes">iOS and Android</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="prose">
        <h2>Where Nike Run Club Is Better</h2>
        <p>NRC is a better choice if you want:</p>
        <ul>
          <li><strong>Guided coached runs.</strong> NRC's library of narrated runs with coaches like Coach Bennett is genuinely motivating. PaceCue doesn't have pre-recorded coach content.</li>
          <li><strong>Multi-week training plans.</strong> NRC offers structured plans that progress over weeks toward a race goal. PaceCue handles individual workouts, not periodized training.</li>
          <li><strong>Social and community features.</strong> NRC has challenges, leaderboards, and the ability to run with friends. PaceCue has no social features.</li>
          <li><strong>Music integration.</strong> NRC integrates with Spotify and offers curated playlists. PaceCue ducks your music during cues but doesn't control playback.</li>
          <li><strong>Android support.</strong> NRC is available on both iOS and Android. PaceCue is currently iOS only.</li>
          <li><strong>Completely free.</strong> NRC has no subscription or premium tier.</li>
        </ul>

        <h2>Where PaceCue Is Better</h2>
        <p>PaceCue is a better choice if you want:</p>
        <ul>
          <li><strong>Custom interval workouts.</strong> PaceCue lets you build any interval structure \u2014 any number of blocks, any durations, any labels, with repeat counts. NRC doesn't have a custom interval builder.</li>
          <li><strong>Frequent, configurable pace announcements.</strong> PaceCue can announce your pace every 15 seconds with GPS smoothing. NRC's audio feedback is less frequent and not configurable.</li>
          <li><strong>Target pace alerts.</strong> Set a target pace on individual intervals and hear whether you're on pace, too fast, or too slow. NRC doesn't offer per-interval target pacing.</li>
          <li><strong>AI-generated workouts.</strong> Describe what you want and get a structured workout instantly.</li>
          <li><strong>Hands-free operation.</strong> PaceCue is designed to run entirely in the background with all information delivered through audio. You never need to look at your phone.</li>
        </ul>

        <h2>When to Use Which</h2>
        <p><strong>Use Nike Run Club</strong> if you're looking for a general-purpose running companion with coaching motivation, training plans, and social features \u2014 especially if you're newer to running or want guided runs.</p>
        <p><strong>Use PaceCue</strong> if you do structured interval training and want precise control over your workout structure with hands-free voice coaching and real-time pace feedback.</p>
        <p>Many runners use both \u2014 NRC for easy runs and training plan guidance, PaceCue for speed work and custom interval sessions.</p>
      </div>
    </section>

    ${ctaBanner("Try PaceCue for Your Next Interval Workout", "Download free on the App Store. Includes 11 built-in presets.")}
    `
  );
}
__name(compareNrcPage, "compareNrcPage");

// src/pages/compare-strava.ts
function compareStravaPage() {
  return renderPage(
    {
      title: "PaceCue vs Strava \u2014 Running App Comparison",
      description: "An honest comparison of PaceCue and Strava. See how they differ on interval training, audio coaching, social features, GPS tracking, and workout customization.",
      path: "/compare/pacecue-vs-strava"
    },
    `
    <section class="page-header">
      <h1>PaceCue vs Strava</h1>
      <p>An honest comparison \u2014 two apps that serve very different roles in a runner's toolkit.</p>
    </section>

    <section class="section">
      <div class="prose">
        <h2>Overview</h2>
        <p><strong>PaceCue</strong> is an interval training app with real-time voice pace coaching, a custom workout builder, and an AI workout generator. It's designed to guide you <em>during</em> the run with audio cues.</p>
        <p><strong>Strava</strong> is a GPS tracking and social fitness platform. It records your runs (and rides, swims, hikes), maps routes, tracks performance over time, and connects you with a large community of athletes through segments, clubs, and leaderboards.</p>
        <p>These apps don't really compete \u2014 they complement each other. But here's a detailed comparison.</p>

        <h2>Feature Comparison</h2>
      </div>

      <div class="container-wide">
        <div class="compare-table-wrap">
          <table class="compare-table">
            <thead>
              <tr>
                <th>Feature</th>
                <th>PaceCue</th>
                <th>Strava</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Custom interval workouts</strong></td>
                <td class="yes">Yes \u2014 full editor with blocks, repeats, labels, effort, target pace</td>
                <td class="no">No \u2014 Strava records runs but doesn't coach intervals</td>
              </tr>
              <tr>
                <td><strong>Voice pace announcements</strong></td>
                <td class="yes">Yes \u2014 configurable frequency, rolling GPS average</td>
                <td class="partial">Basic audio cues for pace/distance at mile markers</td>
              </tr>
              <tr>
                <td><strong>Interval timer with coaching</strong></td>
                <td class="yes">Yes \u2014 core feature with transitions, set tracking, countdown warnings</td>
                <td class="no">No built-in interval timer</td>
              </tr>
              <tr>
                <td><strong>AI workout builder</strong></td>
                <td class="yes">Yes \u2014 describe a workout in plain English</td>
                <td class="no">No</td>
              </tr>
              <tr>
                <td><strong>GPS tracking and mapping</strong></td>
                <td class="partial">GPS pace and distance \u2014 no route map</td>
                <td class="yes">Full route mapping, elevation profiles, heatmaps</td>
              </tr>
              <tr>
                <td><strong>Segments and leaderboards</strong></td>
                <td class="no">No</td>
                <td class="yes">Yes \u2014 millions of segments with local and global leaderboards</td>
              </tr>
              <tr>
                <td><strong>Social features</strong></td>
                <td class="no">No</td>
                <td class="yes">Yes \u2014 clubs, followers, kudos, comments, group challenges</td>
              </tr>
              <tr>
                <td><strong>Training log and analytics</strong></td>
                <td class="partial">Workout history with splits</td>
                <td class="yes">Detailed training log, fitness trends, relative effort, power data</td>
              </tr>
              <tr>
                <td><strong>Route planning</strong></td>
                <td class="no">No</td>
                <td class="yes">Yes \u2014 route builder with popularity heatmap</td>
              </tr>
              <tr>
                <td><strong>Multi-sport support</strong></td>
                <td class="no">Running only</td>
                <td class="yes">Running, cycling, swimming, hiking, and 30+ activities</td>
              </tr>
              <tr>
                <td><strong>Workout sharing</strong></td>
                <td class="yes">Share workout structures and results via link</td>
                <td class="yes">Share activities, route links</td>
              </tr>
              <tr>
                <td><strong>Price</strong></td>
                <td class="yes">Free with optional premium</td>
                <td class="partial">Free tier + Strava Summit subscription ($11.99/mo) for advanced features</td>
              </tr>
              <tr>
                <td><strong>Platforms</strong></td>
                <td class="partial">iOS</td>
                <td class="yes">iOS, Android, web, watch integrations</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="prose">
        <h2>Where Strava Is Better</h2>
        <p>Strava is stronger in almost every category that isn't real-time interval coaching:</p>
        <ul>
          <li><strong>Post-run analysis.</strong> Strava's training log, pace analysis, elevation profiles, and fitness trends are far more detailed. PaceCue stores basic split data.</li>
          <li><strong>Route mapping.</strong> Strava maps every run with GPS and lets you plan routes. PaceCue doesn't map routes.</li>
          <li><strong>Social community.</strong> Strava is the social network for runners. Segments, clubs, kudos, and challenges are core to the experience.</li>
          <li><strong>Multi-sport support.</strong> Strava covers running, cycling, swimming, hiking, and more. PaceCue is running only.</li>
          <li><strong>Platform support.</strong> Strava works on iOS, Android, web, and integrates with GPS watches from Garmin, Apple, COROS, and others.</li>
          <li><strong>Watch integrations.</strong> Strava syncs with virtually every running watch and fitness tracker.</li>
        </ul>

        <h2>Where PaceCue Is Better</h2>
        <p>PaceCue fills a gap that Strava doesn't address:</p>
        <ul>
          <li><strong>Interval training with voice coaching.</strong> Strava records your run but doesn't tell you when to start your next interval or what your current set is. PaceCue guides every transition with audio.</li>
          <li><strong>Custom workout builder.</strong> Create any interval structure with blocks, repeats, and target paces. Strava has no equivalent.</li>
          <li><strong>Frequent pace announcements.</strong> Hear your pace every 15\u2013120 seconds, not just at mile markers.</li>
          <li><strong>AI workout generation.</strong> Describe a workout and get a structured plan instantly.</li>
          <li><strong>Hands-free, screen-off operation.</strong> PaceCue is designed to run entirely through audio with your phone locked in your pocket.</li>
        </ul>

        <h2>Using Them Together</h2>
        <p>PaceCue and Strava serve different roles. Many runners will benefit from both:</p>
        <ul>
          <li>Use <strong>PaceCue</strong> to coach you through interval workouts with real-time audio guidance.</li>
          <li>Use <strong>Strava</strong> to log your training, track fitness over time, plan routes, and connect with other runners.</li>
        </ul>
        <p>PaceCue doesn't try to replace Strava's tracking and social features. Strava doesn't try to coach your intervals.</p>
      </div>
    </section>

    ${ctaBanner("Add Interval Coaching to Your Training", "PaceCue handles the coaching. Strava handles the tracking. Download free.")}
    `
  );
}
__name(compareStravaPage, "compareStravaPage");

// src/pages/compare-runna.ts
function compareRunnaPage() {
  return renderPage(
    {
      title: "PaceCue vs Runna \u2014 Running App Comparison",
      description: "An honest comparison of PaceCue and Runna. See how they differ on interval training, audio coaching, training plans, workout customization, and price.",
      path: "/compare/pacecue-vs-runna"
    },
    `
    <section class="page-header">
      <h1>PaceCue vs Runna</h1>
      <p>Two running apps with voice coaching \u2014 but built for different kinds of runners.</p>
    </section>

    <section class="section">
      <div class="prose">
        <h2>Overview</h2>
        <p><strong>PaceCue</strong> is an interval training app with real-time voice pace coaching, a flexible custom workout builder, and an AI workout generator. You build or generate individual workouts and PaceCue coaches you through them with audio cues.</p>
        <p><strong>Runna</strong> is a structured training plan app. You choose a race distance and goal, and Runna generates a multi-week training program with daily workouts. Each workout includes voice guidance during the run. It's designed to take you from where you are to race day.</p>
        <p>The key difference: PaceCue gives you freedom to build any workout you want. Runna gives you a coach-designed plan and tells you what to do each day.</p>

        <h2>Feature Comparison</h2>
      </div>

      <div class="container-wide">
        <div class="compare-table-wrap">
          <table class="compare-table">
            <thead>
              <tr>
                <th>Feature</th>
                <th>PaceCue</th>
                <th>Runna</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Custom interval workouts</strong></td>
                <td class="yes">Yes \u2014 fully customizable blocks, repeats, labels, effort, target pace</td>
                <td class="no">No \u2014 workouts are plan-generated, not user-built</td>
              </tr>
              <tr>
                <td><strong>Structured training plans</strong></td>
                <td class="no">No \u2014 PaceCue is workout-by-workout</td>
                <td class="yes">Yes \u2014 multi-week plans for 5K through marathon with progressive overload</td>
              </tr>
              <tr>
                <td><strong>Voice coaching during runs</strong></td>
                <td class="yes">Yes \u2014 interval transitions, pace announcements, countdown warnings</td>
                <td class="yes">Yes \u2014 guided audio during workouts</td>
              </tr>
              <tr>
                <td><strong>Voice pace announcements</strong></td>
                <td class="yes">Yes \u2014 configurable frequency (15s\u2013120s) with GPS smoothing</td>
                <td class="partial">Pace feedback during runs, less configurable</td>
              </tr>
              <tr>
                <td><strong>AI workout builder</strong></td>
                <td class="yes">Yes \u2014 describe any workout in plain English</td>
                <td class="no">Workouts are algorithmically generated as part of plans</td>
              </tr>
              <tr>
                <td><strong>Built-in presets</strong></td>
                <td class="yes">11 presets (5K Speed, Tempo, Fartlek, Hill Repeats, Run/Walk, etc.)</td>
                <td class="partial">Workouts are part of plans, not standalone presets</td>
              </tr>
              <tr>
                <td><strong>Adaptive training</strong></td>
                <td class="no">No \u2014 workouts don't auto-adjust based on performance</td>
                <td class="yes">Yes \u2014 plans adapt based on your feedback and progress</td>
              </tr>
              <tr>
                <td><strong>Race goal pacing</strong></td>
                <td class="partial">Target pace per interval, but no race-day pacing strategy</td>
                <td class="yes">Plans are built around your goal race time</td>
              </tr>
              <tr>
                <td><strong>Watch integration</strong></td>
                <td class="no">Phone only</td>
                <td class="yes">Garmin, Apple Watch, others</td>
              </tr>
              <tr>
                <td><strong>Price</strong></td>
                <td class="yes">Free with optional premium</td>
                <td class="partial">Subscription required (~$15\u201320/month)</td>
              </tr>
              <tr>
                <td><strong>Platforms</strong></td>
                <td class="partial">iOS</td>
                <td class="yes">iOS and Android</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="prose">
        <h2>Where Runna Is Better</h2>
        <p>Runna is the stronger choice if you want a coach telling you what to do every day:</p>
        <ul>
          <li><strong>Complete training plans.</strong> Runna builds an entire training block \u2014 from base building through taper \u2014 for any race distance. PaceCue handles individual workouts, not multi-week periodization.</li>
          <li><strong>Adaptive progression.</strong> Runna adjusts your plan based on how runs go. PaceCue doesn't automatically progress your training.</li>
          <li><strong>Race-specific preparation.</strong> Runna's plans are built around your goal race time and adjust paces accordingly across all workout types.</li>
          <li><strong>Watch integration.</strong> Runna pushes workouts to Garmin and Apple Watch. PaceCue is phone-only.</li>
          <li><strong>Expert-designed programming.</strong> Runna's plans are built by running coaches with structured periodization.</li>
        </ul>

        <h2>Where PaceCue Is Better</h2>
        <p>PaceCue is the better choice if you want control over your own workouts:</p>
        <ul>
          <li><strong>Full workout customization.</strong> Build any interval structure you can imagine \u2014 any number of blocks, any durations, any labels, any repeats. Runna's workouts are plan-generated and not user-editable in the same way.</li>
          <li><strong>Configurable pace announcements.</strong> Hear your pace every 15\u2013120 seconds with adjustable GPS smoothing. Much more control than Runna's audio feedback.</li>
          <li><strong>AI workout generation.</strong> Describe a workout in natural language and get a structured plan. Useful for one-off sessions or creative training.</li>
          <li><strong>Free to use.</strong> PaceCue's core features are free. Runna requires a subscription that typically costs $15\u201320/month.</li>
          <li><strong>No commitment required.</strong> PaceCue is good for runners who don't want a rigid training plan but still want structured workouts with voice coaching.</li>
        </ul>

        <h2>When to Use Which</h2>
        <p><strong>Use Runna</strong> if you're training for a specific race and want a structured, adaptive training plan that tells you exactly what to do each day. Especially valuable for runners new to structured training or preparing for their first race at a given distance.</p>
        <p><strong>Use PaceCue</strong> if you prefer building your own workouts, want granular control over interval timing and audio feedback, or want a free tool for structured speed work without committing to a training plan subscription.</p>
        <p>Some runners use Runna for their overall plan structure and PaceCue for custom speed sessions that go beyond what the plan provides.</p>
      </div>
    </section>

    ${ctaBanner("Try PaceCue Free", "Build custom interval workouts with voice coaching \u2014 no subscription required.")}
    `
  );
}
__name(compareRunnaPage, "compareRunnaPage");

// src/pages/pace-calculator.ts
function paceCalculatorPage() {
  return renderPage(
    {
      title: "Running Pace Calculator \u2014 Convert Pace, Speed, and Race Times",
      description: "Free running pace calculator. Convert between min/mile and min/km, estimate race finish times for 5K, 10K, half marathon, and marathon, and find your target pace for interval training.",
      path: "/tools/pace-calculator"
    },
    `
    <section class="page-header">
      <h1>Running Pace Calculator</h1>
      <p>Convert between pace units, estimate race times, and find target paces for interval training.</p>
    </section>

    <section class="section">
      <div class="container-wide">
        <div class="calc-grid">

          <!-- Pace Converter -->
          <div class="calc-card">
            <h2>Pace Converter</h2>
            <p>Convert between minutes per mile and minutes per kilometer.</p>
            <div class="calc-row">
              <label for="pace-min">Min/Mile</label>
              <div class="calc-input-group">
                <input type="number" id="pace-min" min="0" max="59" value="8" class="calc-input" aria-label="Minutes">
                <span>:</span>
                <input type="number" id="pace-sec" min="0" max="59" value="0" class="calc-input" aria-label="Seconds">
              </div>
            </div>
            <div class="calc-result" id="pace-result">
              <div class="calc-result-row"><span>Min/km:</span> <strong id="pace-km">4:58</strong></div>
              <div class="calc-result-row"><span>Speed:</span> <strong id="pace-mph">7.50 mph</strong> / <strong id="pace-kph">12.07 kph</strong></div>
            </div>
          </div>

          <!-- Race Time Estimator -->
          <div class="calc-card">
            <h2>Race Time Estimator</h2>
            <p>Estimate your finish time at a given pace.</p>
            <div class="calc-row">
              <label for="race-pace-min">Your Pace (min/mile)</label>
              <div class="calc-input-group">
                <input type="number" id="race-pace-min" min="0" max="59" value="8" class="calc-input" aria-label="Minutes">
                <span>:</span>
                <input type="number" id="race-pace-sec" min="0" max="59" value="30" class="calc-input" aria-label="Seconds">
              </div>
            </div>
            <div class="calc-result" id="race-result">
              <div class="calc-result-row"><span>5K:</span> <strong id="race-5k">26:25</strong></div>
              <div class="calc-result-row"><span>10K:</span> <strong id="race-10k">52:49</strong></div>
              <div class="calc-result-row"><span>Half Marathon:</span> <strong id="race-half">1:51:29</strong></div>
              <div class="calc-result-row"><span>Marathon:</span> <strong id="race-full">3:42:58</strong></div>
            </div>
          </div>

          <!-- Interval Pace Finder -->
          <div class="calc-card">
            <h2>Interval Pace Finder</h2>
            <p>Find the pace you need to run a given distance in a given time.</p>
            <div class="calc-row">
              <label for="int-dist">Distance</label>
              <select id="int-dist" class="calc-select">
                <option value="0.25">400m (0.25 mi)</option>
                <option value="0.5">800m (0.5 mi)</option>
                <option value="1" selected>1 mile</option>
                <option value="1.5">1.5 miles</option>
                <option value="2">2 miles</option>
                <option value="3.1">5K (3.1 mi)</option>
              </select>
            </div>
            <div class="calc-row">
              <label for="int-time-min">Target Time</label>
              <div class="calc-input-group">
                <input type="number" id="int-time-min" min="0" max="59" value="6" class="calc-input" aria-label="Minutes">
                <span>:</span>
                <input type="number" id="int-time-sec" min="0" max="59" value="30" class="calc-input" aria-label="Seconds">
              </div>
            </div>
            <div class="calc-result" id="int-result">
              <div class="calc-result-row"><span>Required Pace:</span> <strong id="int-pace">6:30/mile</strong></div>
              <div class="calc-result-row"><span>Per km:</span> <strong id="int-pace-km">4:02/km</strong></div>
            </div>
          </div>

        </div>
      </div>
    </section>

    <!-- Reference tables \u2014 useful for AI and crawlers even without JS -->
    <section class="section section-alt">
      <div class="container-wide">
        <h2>Common Race Pace Reference</h2>
        <p>Quick reference: pace per mile and estimated finish times for popular race distances.</p>
        <div class="compare-table-wrap">
          <table class="compare-table pace-ref-table">
            <thead>
              <tr>
                <th>Pace (min/mile)</th>
                <th>Pace (min/km)</th>
                <th>5K</th>
                <th>10K</th>
                <th>Half Marathon</th>
                <th>Marathon</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>6:00</td><td>3:44</td><td>18:38</td><td>37:17</td><td>1:18:52</td><td>2:37:19</td></tr>
              <tr><td>7:00</td><td>4:21</td><td>21:45</td><td>43:30</td><td>1:31:54</td><td>3:03:33</td></tr>
              <tr><td>8:00</td><td>4:58</td><td>24:52</td><td>49:42</td><td>1:44:56</td><td>3:29:46</td></tr>
              <tr><td>9:00</td><td>5:35</td><td>27:58</td><td>55:55</td><td>1:57:58</td><td>3:55:59</td></tr>
              <tr><td>10:00</td><td>6:13</td><td>31:05</td><td>1:02:08</td><td>2:10:59</td><td>4:22:12</td></tr>
              <tr><td>11:00</td><td>6:50</td><td>34:11</td><td>1:08:21</td><td>2:24:01</td><td>4:48:25</td></tr>
              <tr><td>12:00</td><td>7:27</td><td>37:17</td><td>1:14:34</td><td>2:37:03</td><td>5:14:38</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="prose">
        <h2>How to Use These Paces in Training</h2>
        <p>Knowing your pace numbers is one thing \u2014 using them during a run is another. Most runners set a target pace and then try to hold it by checking their watch every few seconds.</p>
        <p>A better approach is <strong>audio pace feedback</strong>. If your running app announces your pace every 30 seconds, you can make micro-adjustments without looking at a screen. This is exactly what PaceCue does \u2014 you set a target pace on any interval and PaceCue tells you if you're on pace, too fast, or too slow.</p>

        <h2>Understanding Pace vs Speed</h2>
        <ul>
          <li><strong>Pace</strong> is measured in minutes per distance unit (min/mile or min/km). Lower is faster. A 7:00/mile pace is faster than 8:00/mile.</li>
          <li><strong>Speed</strong> is measured in distance per hour (mph or kph). Higher is faster. 8.57 mph is the same as a 7:00/mile pace.</li>
        </ul>
        <p>Most runners think in pace, not speed, because it directly tells you how long a mile will take. Running apps and GPS watches almost always display pace.</p>

        <h2>Mile vs Kilometer Paces</h2>
        <p>To convert min/mile to min/km, multiply by 0.6214. To go the other way, divide by 0.6214. Or just use the calculator above.</p>
        <p>Quick mental shortcut: your min/km pace is roughly 62% of your min/mile pace. So if you run 8:00/mile, you're running about 4:58/km.</p>
      </div>
    </section>

    ${ctaBanner("Hear Your Pace While You Run", "PaceCue announces your pace, distance, and interval transitions in real time. Download free.")}

    <script>
    (function() {
      function fmt(totalSec) {
        if (totalSec >= 3600) {
          var h = Math.floor(totalSec / 3600);
          var m = Math.floor((totalSec % 3600) / 60);
          var s = Math.round(totalSec % 60);
          return h + ':' + String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
        }
        var m = Math.floor(totalSec / 60);
        var s = Math.round(totalSec % 60);
        return m + ':' + String(s).padStart(2,'0');
      }

      // Pace converter
      var pMin = document.getElementById('pace-min');
      var pSec = document.getElementById('pace-sec');
      function updatePace() {
        var totalSec = (parseInt(pMin.value)||0)*60 + (parseInt(pSec.value)||0);
        if (totalSec <= 0) return;
        var secPerKm = totalSec * 0.621371;
        document.getElementById('pace-km').textContent = fmt(secPerKm);
        var mph = 60 / (totalSec/60);
        var kph = mph * 1.60934;
        document.getElementById('pace-mph').textContent = mph.toFixed(2) + ' mph';
        document.getElementById('pace-kph').textContent = kph.toFixed(2) + ' kph';
      }
      pMin.addEventListener('input', updatePace);
      pSec.addEventListener('input', updatePace);

      // Race time estimator
      var rMin = document.getElementById('race-pace-min');
      var rSec = document.getElementById('race-pace-sec');
      function updateRace() {
        var secPerMile = (parseInt(rMin.value)||0)*60 + (parseInt(rSec.value)||0);
        if (secPerMile <= 0) return;
        var distances = {
          '5k': 3.10686, '10k': 6.21371, 'half': 13.1094, 'full': 26.2188
        };
        for (var key in distances) {
          var time = secPerMile * distances[key];
          document.getElementById('race-' + key).textContent = fmt(time);
        }
      }
      rMin.addEventListener('input', updateRace);
      rSec.addEventListener('input', updateRace);

      // Interval pace finder
      var iDist = document.getElementById('int-dist');
      var iMin = document.getElementById('int-time-min');
      var iSec = document.getElementById('int-time-sec');
      function updateInterval() {
        var dist = parseFloat(iDist.value);
        var totalSec = (parseInt(iMin.value)||0)*60 + (parseInt(iSec.value)||0);
        if (dist <= 0 || totalSec <= 0) return;
        var secPerMile = totalSec / dist;
        var secPerKm = secPerMile * 0.621371;
        document.getElementById('int-pace').textContent = fmt(secPerMile) + '/mile';
        document.getElementById('int-pace-km').textContent = fmt(secPerKm) + '/km';
      }
      iDist.addEventListener('change', updateInterval);
      iMin.addEventListener('input', updateInterval);
      iSec.addEventListener('input', updateInterval);

      // Initial calculation
      updatePace(); updateRace(); updateInterval();
    })();
    <\/script>
    `
  );
}
__name(paceCalculatorPage, "paceCalculatorPage");

// src/pages/beginner-run-walk.ts
function beginnerRunWalkPage() {
  return renderPage(
    {
      title: "Beginner Run/Walk Training Guide \u2014 How to Start Running With Walk Breaks",
      description: "A complete guide to run/walk interval training for beginners. Learn how to alternate running and walking to build endurance safely, with sample programs from 20 to 40 minutes.",
      path: "/guides/beginner-run-walk"
    },
    `
    <section class="page-header">
      <h1>Beginner Run/Walk Training Guide</h1>
      <p>How to start running using walk breaks \u2014 the safest and most effective way to build endurance as a new runner.</p>
    </section>

    <section class="section">
      <div class="prose">
        <h2>Why Run/Walk Works</h2>
        <p>Run/walk isn't a shortcut \u2014 it's a proven training method used by beginners and experienced runners alike. The idea is simple: alternate between running and walking at set intervals. This approach has several advantages:</p>
        <ul>
          <li><strong>Reduces injury risk.</strong> Walk breaks give your muscles, tendons, and joints periodic rest, which is critical when your body isn't yet adapted to continuous running.</li>
          <li><strong>Makes running mentally approachable.</strong> Knowing you only have to run for 1\u20133 minutes before a walk break makes the effort feel manageable.</li>
          <li><strong>Builds aerobic fitness gradually.</strong> You accumulate running time without the exhaustion of trying to run continuously too soon.</li>
          <li><strong>Used by elite coaches.</strong> Jeff Galloway's run/walk method has been used to train hundreds of thousands of marathon finishers.</li>
        </ul>

        <h2>How It Works</h2>
        <p>Pick a running interval and a walking interval. Run for the set time, then walk for the set time. Repeat for your total workout duration. That's it.</p>
        <p>The key is to <strong>start conservatively</strong>. If you haven't been running regularly, begin with more walking than running and progress slowly.</p>

        <h2>Sample Run/Walk Programs</h2>

        <h3>Week 1\u20132: Getting Started (20 minutes)</h3>
        <p>If you're brand new to running or returning after a long break:</p>
        <ul>
          <li>Run 1 minute / Walk 2 minutes \xD7 7 rounds (21 minutes total)</li>
          <li>Run at a conversational pace \u2014 you should be able to speak in short sentences</li>
          <li>Walk at a normal walking pace, not a stroll</li>
          <li>3 sessions per week, with at least one rest day between sessions</li>
        </ul>

        <h3>Week 3\u20134: Building (25 minutes)</h3>
        <ul>
          <li>Run 2 minutes / Walk 1 minute \xD7 8 rounds (24 minutes total)</li>
          <li>The running intervals are longer, but the walk breaks keep things manageable</li>
          <li>If 2 minutes feels too hard, stay at the Week 1\u20132 program longer</li>
        </ul>

        <h3>Week 5\u20136: Progressing (30 minutes)</h3>
        <ul>
          <li>Run 3 minutes / Walk 1 minute \xD7 8 rounds (32 minutes total)</li>
          <li>You're now running 3\xD7 as long as you walk \u2014 significant progress from Week 1</li>
        </ul>

        <h3>Week 7\u20138: Getting Stronger (30+ minutes)</h3>
        <ul>
          <li>Run 5 minutes / Walk 1 minute \xD7 5 rounds (30 minutes total)</li>
          <li>At this point, the walk breaks are mostly mental resets</li>
          <li>When this feels comfortable, try running for 10 minutes straight</li>
        </ul>

        <h2>Tips for Beginners</h2>
        <ul>
          <li><strong>Don't skip walk breaks.</strong> The walk intervals are part of the training, not a sign of weakness. Take them every time.</li>
          <li><strong>Run slowly.</strong> Your running pace should feel easy. If you're gasping, slow down. Speed comes later.</li>
          <li><strong>Use a timer or app.</strong> Trying to guess when 2 minutes is up is distracting. Use an interval timer that tells you when to switch \u2014 ideally with audio so you don't have to watch your phone.</li>
          <li><strong>Don't increase volume too fast.</strong> Add no more than 5\u201310 minutes per week to your total running time.</li>
          <li><strong>Rest days matter.</strong> Run 3\u20134 days per week max. Your body adapts and gets stronger on rest days, not running days.</li>
          <li><strong>Any running counts.</strong> Even a 15-minute run/walk session is training. Consistency matters more than duration.</li>
        </ul>

        <h2>Common Mistakes</h2>
        <ul>
          <li><strong>Starting too fast.</strong> New runners often sprint their running intervals. Run at a jog. If you can't hold a conversation, you're going too fast.</li>
          <li><strong>Progressing too quickly.</strong> Jumping from "run 1 minute" to "run 5 minutes" in a week is a recipe for shin splints or knee pain.</li>
          <li><strong>Comparing yourself to others.</strong> Your run/walk ratios are for your body and fitness level. Everyone starts somewhere.</li>
          <li><strong>Skipping sessions.</strong> Three 20-minute sessions per week is more effective than one 60-minute session.</li>
        </ul>

        <h2>When to Drop the Walk Breaks</h2>
        <p>When you can comfortably run 5 minutes with 1-minute walk breaks for 30 minutes total, try running for 10 minutes straight. Then 15. Then 20. There's no rush.</p>
        <p>Many experienced runners <em>keep</em> walk breaks for long runs, even at marathon pace. Run/walk is a tool, not a phase you have to grow out of.</p>

        <h2>Using PaceCue for Run/Walk</h2>
        <p>PaceCue includes a built-in <strong>Run/Walk preset</strong> (8 \xD7 3 min run / 1 min walk), and you can build any run/walk ratio with the workout editor or AI builder.</p>
        <p>When you run, PaceCue announces every transition through your headphones: <em>"Run \u2014 3 minutes"</em> \u2192 <em>"10 seconds remaining"</em> \u2192 <em>"Walk \u2014 1 minute."</em> You never need to look at your phone \u2014 just listen and follow the cues.</p>
        <p>To create a beginner program, you could tell the AI builder: <em>"Run 1 minute, walk 2 minutes, repeat 7 times."</em></p>
      </div>
    </section>

    ${ctaBanner("Start Your Run/Walk Program", "PaceCue tells you when to run and when to walk \u2014 hands-free. Download free.")}
    `
  );
}
__name(beginnerRunWalkPage, "beginnerRunWalkPage");

// src/pages/audio-vs-watches.ts
function audioVsWatchesPage() {
  return renderPage(
    {
      title: "Audio Coaching Apps vs GPS Watches for Running \u2014 Which Is Better?",
      description: "A practical comparison of phone-based audio coaching apps and GPS running watches. When voice-guided running makes more sense than checking your wrist, and when a watch is the better tool.",
      path: "/guides/audio-coaching-vs-gps-watches"
    },
    `
    <section class="page-header">
      <h1>Audio Coaching Apps vs GPS Watches for Running</h1>
      <p>When voice-guided running makes more sense than a watch \u2014 and when it doesn't.</p>
    </section>

    <section class="section">
      <div class="prose">
        <h2>Two Ways to Get Feedback While Running</h2>
        <p>Runners who want real-time data during workouts have two main options:</p>
        <ol>
          <li><strong>GPS running watch</strong> \u2014 displays pace, distance, time, and heart rate on a screen strapped to your wrist</li>
          <li><strong>Audio coaching app</strong> \u2014 announces the same information through headphones or a speaker, with your phone in your pocket</li>
        </ol>
        <p>Both deliver similar information. The difference is how you consume it: <strong>visual</strong> (glancing at a screen) versus <strong>auditory</strong> (listening to announcements).</p>

        <h2>Advantages of GPS Watches</h2>
        <ul>
          <li><strong>Always-on display.</strong> Glance at your wrist anytime, no waiting for the next announcement. Useful when you want data on demand.</li>
          <li><strong>Heart rate monitoring.</strong> Most GPS watches have optical heart rate sensors. Phone apps typically don't measure heart rate without an external monitor.</li>
          <li><strong>No phone required.</strong> Run without carrying anything except a lightweight watch. No armband, no pocket.</li>
          <li><strong>Battery life.</strong> GPS watches last 10\u201330+ hours in activity mode. Phones may not survive a very long run with GPS active.</li>
          <li><strong>Durability.</strong> Watches are designed for sweat, rain, and impact. Phones in armbands are less rugged.</li>
          <li><strong>Ecosystem integration.</strong> Garmin Connect, Apple Fitness, Polar Flow, and COROS offer detailed post-run analytics, training load tracking, and long-term fitness trends.</li>
        </ul>

        <h2>Advantages of Audio Coaching Apps</h2>
        <ul>
          <li><strong>No screen-checking.</strong> Information is delivered to your ears automatically. You never break stride, alter your arm swing, or lose focus looking at a screen.</li>
          <li><strong>Better for interval training.</strong> Audio apps can announce interval transitions, set counts, countdown warnings, and what's coming next \u2014 all information that's awkward to parse from a watch mid-sprint.</li>
          <li><strong>Works with headphones you already own.</strong> No $300\u2013$600 watch purchase needed. Just a phone and earbuds.</li>
          <li><strong>Richer announcements.</strong> A voice can say "Set 4 of 6. Hard \u2014 3 minutes. Sprint." A watch shows "04/06 3:00 H" \u2014 less context at a glance.</li>
          <li><strong>Night, rain, and cold weather.</strong> When you can't easily see a screen (dark, wet, gloves on), audio keeps working perfectly.</li>
          <li><strong>Safer on trails.</strong> Eyes stay on the trail surface instead of darting to your wrist.</li>
        </ul>

        <h2>When Audio Coaching Is the Better Choice</h2>
        <p>Audio coaching tends to work better than a watch in these situations:</p>

        <h3>Structured Interval Workouts</h3>
        <p>If you're doing speed work with multiple intervals, repeats, and transitions, hearing every cue is faster and less disruptive than checking a watch. This is especially true for complex workouts like pyramids, fartlek, or multi-block sessions where tracking set numbers on a watch screen is confusing.</p>

        <h3>Pace-Focused Training</h3>
        <p>When you need to hold a specific pace (tempo runs, race-pace intervals), hearing your pace every 30 seconds keeps you locked in without the habitual wrist-glancing that can become a nervous tic during workouts.</p>

        <h3>Beginners</h3>
        <p>New runners benefit from being told what to do rather than interpreting data on a screen. "Walk \u2014 2 minutes" is clearer than trying to read a watch while out of breath.</p>

        <h3>Running Without a Watch</h3>
        <p>Not everyone owns or wants a GPS watch. A phone-based audio coaching app provides equivalent pace and interval data at no additional hardware cost.</p>

        <h2>When a GPS Watch Is the Better Choice</h2>

        <h3>Long Runs and Ultra Distances</h3>
        <p>For runs lasting 2+ hours, a watch's battery life and lightweight form factor are hard to beat. Carrying a phone for 4 hours gets old.</p>

        <h3>Heart Rate Training</h3>
        <p>If you train by heart rate zones, a watch with optical HR or a chest strap is essential. Most audio coaching apps don't measure heart rate directly.</p>

        <h3>Post-Run Analysis</h3>
        <p>Watch ecosystems (Garmin Connect, Apple Fitness, Strava) provide richer post-run data including route maps, elevation, training load, and recovery metrics. Phone apps typically offer more basic logging.</p>

        <h3>Racing</h3>
        <p>During a race, an always-on display is valuable. You can glance at your pace instantly rather than waiting 15\u201330 seconds for an audio announcement. Some races also prohibit headphones.</p>

        <h3>Swimming and Multi-Sport</h3>
        <p>Watches go where phones can't. If you train across multiple sports, a watch is the practical choice.</p>

        <h2>Using Both Together</h2>
        <p>Many runners use both a watch and an audio coaching app:</p>
        <ul>
          <li>Use an <strong>audio coaching app</strong> for interval workouts and speed sessions where hands-free guidance is most valuable.</li>
          <li>Use a <strong>GPS watch</strong> for easy runs, long runs, and races where on-demand data and battery life matter more.</li>
        </ul>
        <p>The tools aren't mutually exclusive. Use whichever gives you the best feedback for each type of run.</p>

        <h2>PaceCue as an Audio Coaching App</h2>
        <p>PaceCue is designed specifically for the scenarios where audio coaching works best: structured interval workouts with voice pace announcements, transition cues, and countdown warnings. It runs in the background with your screen locked \u2014 all information delivered through your headphones.</p>
        <p>PaceCue is not trying to replace a GPS watch for all-day tracking or heart rate training. It's a specialized tool for voice-coached interval sessions.</p>
      </div>
    </section>

    ${ctaBanner("Try Audio-Coached Interval Training", "PaceCue announces pace, intervals, and transitions. Your phone stays in your pocket. Download free.")}
    `
  );
}
__name(audioVsWatchesPage, "audioVsWatchesPage");

// src/pages/delete-account.ts
function deleteAccountPage() {
  return renderPage(
    {
      title: "Delete Your Account \u2014 PaceCue",
      description: "Learn how to permanently delete your PaceCue account and all associated data, including workouts, run history, and running profile.",
      path: "/delete-account"
    },
    `
    <section class="page-header">
      <h1>Delete Your Account</h1>
      <p>How to permanently delete your PaceCue account and all associated data.</p>
    </section>

    <section class="section">
      <div class="prose">
        <h2>How to Delete Your Account</h2>
        <p>You can delete your PaceCue account directly from the app:</p>
        <ol>
          <li>Open <strong>PaceCue</strong> on your device.</li>
          <li>Go to the <strong>Settings</strong> tab.</li>
          <li>Scroll down and tap <strong>Delete Account</strong>.</li>
          <li>Confirm the deletion when prompted.</li>
        </ol>

        <h2>What Gets Deleted</h2>
        <p>When you delete your account, the following data is <strong>permanently removed</strong> from our servers:</p>
        <ul>
          <li>Your user profile and authentication credentials</li>
          <li>All saved workouts and custom interval plans</li>
          <li>Your complete run history and per-interval splits</li>
          <li>AI conversation history and generated workouts</li>
          <li>Your running profile (race times, experience level, preferences)</li>
          <li>Training plans and progress</li>
          <li>Shared workout links</li>
        </ul>

        <h2>What Is Not Affected</h2>
        <p>Local data stored on your device (such as cached workouts) is not automatically removed when you delete your account. You can remove this by uninstalling the app.</p>

        <h2>Account Deletion Is Permanent</h2>
        <p>This action <strong>cannot be undone</strong>. Once your account is deleted, all cloud data is permanently erased and cannot be recovered. If you decide to use PaceCue again, you will need to create a new account.</p>

        <h2>Need Help?</h2>
        <p>If you are unable to access the app and need to delete your account, contact us at <a href="mailto:brandon@getsurmount.com">brandon@getsurmount.com</a> with the email address associated with your account, and we will process the deletion for you.</p>
      </div>
    </section>
    `
  );
}
__name(deleteAccountPage, "deleteAccountPage");

// src/static.ts
var BASE_URL2 = "https://pacecue.dev";
var PAGES = [
  "/",
  "/features/audio-pace-announcements",
  "/features/interval-running",
  "/features/ai-workout-builder",
  "/compare/pacecue-vs-nike-run-club",
  "/compare/pacecue-vs-strava",
  "/compare/pacecue-vs-runna",
  "/tools/pace-calculator",
  "/guides/beginner-run-walk",
  "/guides/maintain-running-pace",
  "/guides/hands-free-running",
  "/guides/audio-coaching-vs-gps-watches",
  "/delete-account"
];
function robotsTxt() {
  const body = `# pacecue.dev robots.txt

# Allow all search engine crawlers
User-agent: Googlebot
Allow: /

User-agent: bingbot
Allow: /

# Allow AI search crawlers (ChatGPT search results)
User-agent: OAI-SearchBot
Allow: /

# Allow other AI-related crawlers
User-agent: ChatGPT-User
Allow: /

User-agent: Applebot
Allow: /

User-agent: Bytespider
Allow: /

User-agent: DuckDuckBot
Allow: /

# Block AI model training crawlers (not search)
User-agent: GPTBot
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: Google-Extended
Disallow: /

User-agent: anthropic-ai
Disallow: /

# Default: allow everything
User-agent: *
Allow: /

Sitemap: ${BASE_URL2}/sitemap.xml
`;
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400"
    }
  });
}
__name(robotsTxt, "robotsTxt");
function sitemapXml() {
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const urls = PAGES.map(
    (path) => `  <url>
    <loc>${BASE_URL2}${path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${path === "/" ? "weekly" : "monthly"}</changefreq>
    <priority>${path === "/" ? "1.0" : "0.8"}</priority>
  </url>`
  ).join("\n");
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400"
    }
  });
}
__name(sitemapXml, "sitemapXml");
function llmsTxt() {
  const body = `# PaceCue

> PaceCue is a running app that provides real-time voice coaching for interval workouts and pace tracking.

## What PaceCue Does

PaceCue is an iPhone app designed for runners who do structured interval training. It announces interval transitions, current pace, elapsed time, and countdown warnings through voice audio \u2014 so runners don't need to check their phone or watch during workouts.

## Key Features

- Real-time GPS pace tracking with voice announcements (min/mile or min/km)
- Structured interval workouts with warmup, hard, easy, and cooldown phases
- Configurable audio cues: voice, beeps, both, or silent with haptics
- AI workout builder: describe a workout in plain English, get a structured plan
- Target pace alerts on individual intervals
- 11 built-in workout presets (5K Speed, Tempo Run, Fartlek, Hill Repeats, Run/Walk, etc.)
- Background operation with screen locked
- Music ducking during announcements
- Workout sharing via links
- iOS Live Activities and home screen widgets
- Cloud sync across devices
- Workout history with per-interval splits and distances

## Who It's For

- Interval runners doing speed work, tempo runs, fartlek, or hill repeats
- Beginners using run/walk programs
- Pace-conscious runners who want audio feedback without screen-checking
- Self-coached runners who want structured workout guidance

## Platforms

- iOS (iPhone): available on the App Store

## Links

- Website: ${BASE_URL2}
- App Store: https://apps.apple.com/us/app/pacecue-interval-timer/id6809834816

## Comparison with Other Apps

- PaceCue is better than Nike Run Club for custom interval workouts and configurable pace announcements. NRC is better for guided coached runs, training plans, and social features.
- PaceCue is better than Strava for real-time interval coaching with voice guidance. Strava is better for post-run analytics, social features, route mapping, and multi-sport tracking.
- PaceCue is better than Runna for fully custom workout building and free-form interval design. Runna is better for structured multi-week training plans with adaptive progression.
- PaceCue is free. NRC is free. Strava has a subscription for advanced features. Runna requires a subscription.

## Pages

- [Home](${BASE_URL2}/)
- [Audio Pace Announcements](${BASE_URL2}/features/audio-pace-announcements)
- [Interval Running With Voice Guidance](${BASE_URL2}/features/interval-running)
- [AI Workout Builder](${BASE_URL2}/features/ai-workout-builder)
- [PaceCue vs Nike Run Club](${BASE_URL2}/compare/pacecue-vs-nike-run-club)
- [PaceCue vs Strava](${BASE_URL2}/compare/pacecue-vs-strava)
- [PaceCue vs Runna](${BASE_URL2}/compare/pacecue-vs-runna)
- [Running Pace Calculator](${BASE_URL2}/tools/pace-calculator)
- [Beginner Run/Walk Guide](${BASE_URL2}/guides/beginner-run-walk)
- [How to Maintain a Target Running Pace](${BASE_URL2}/guides/maintain-running-pace)
- [Hands-Free Running](${BASE_URL2}/guides/hands-free-running)
- [Audio Coaching vs GPS Watches](${BASE_URL2}/guides/audio-coaching-vs-gps-watches)
`;
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400"
    }
  });
}
__name(llmsTxt, "llmsTxt");

// src/index.ts
var SUPABASE_SHARE_FN = "https://oakhqqrxsavmoeqlzcny.supabase.co/functions/v1/share";
var BUNDLE_ID = "com.toddly.runningintervals";
var TEAM_ID = "XXXXXXXXXX";
var AASA = JSON.stringify({
  applinks: {
    apps: [],
    details: [
      {
        appIDs: [
          `${TEAM_ID}.${BUNDLE_ID}`,
          `${TEAM_ID}.${BUNDLE_ID}.dev`,
          `${TEAM_ID}.${BUNDLE_ID}.preview`
        ],
        paths: ["/w/*"]
      }
    ]
  }
});
var ASSET_LINKS = JSON.stringify([
  {
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      package_name: BUNDLE_ID,
      // TODO: Replace with your app signing certificate SHA-256 fingerprint
      sha256_cert_fingerprints: ["TODO:ADD:YOUR:SHA256:FINGERPRINT:HERE"]
    }
  }
]);
function htmlResponse(html, status = 200) {
  return new Response(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400"
    }
  });
}
__name(htmlResponse, "htmlResponse");
var PAGE_ROUTES = {
  "/": homePage,
  "/features/audio-pace-announcements": audioPacePage,
  "/features/interval-running": intervalRunningPage,
  "/features/ai-workout-builder": aiBuilderPage,
  "/guides/maintain-running-pace": maintainPacePage,
  "/guides/hands-free-running": handsFreePage,
  "/guides/beginner-run-walk": beginnerRunWalkPage,
  "/guides/audio-coaching-vs-gps-watches": audioVsWatchesPage,
  "/compare/pacecue-vs-nike-run-club": compareNrcPage,
  "/compare/pacecue-vs-strava": compareStravaPage,
  "/compare/pacecue-vs-runna": compareRunnaPage,
  "/tools/pace-calculator": paceCalculatorPage,
  "/delete-account": deleteAccountPage
};
var index_default = {
  async fetch(request) {
    const url = new URL(request.url);
    let { pathname } = url;
    if (pathname.length > 1 && pathname.endsWith("/")) {
      pathname = pathname.slice(0, -1);
    }
    if (pathname === "/robots.txt") return robotsTxt();
    if (pathname === "/sitemap.xml") return sitemapXml();
    if (pathname === "/llms.txt") return llmsTxt();
    const workoutMatch = pathname.match(/^\/w\/([A-Za-z0-9]{4,16})$/);
    if (workoutMatch) {
      const code = workoutMatch[1];
      const upstream = `${SUPABASE_SHARE_FN}?code=${code}`;
      const resp = await fetch(upstream, {
        headers: { "User-Agent": "pacecue-share-proxy" }
      });
      return new Response(resp.body, {
        status: resp.status,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=3600"
        }
      });
    }
    if (pathname === "/.well-known/apple-app-site-association") {
      return new Response(AASA, {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=86400"
        }
      });
    }
    if (pathname === "/.well-known/assetlinks.json") {
      return new Response(ASSET_LINKS, {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=86400"
        }
      });
    }
    const pageGenerator = PAGE_ROUTES[pathname];
    if (pageGenerator) {
      return htmlResponse(pageGenerator());
    }
    return htmlResponse(notFoundPage(), 404);
  }
};
function notFoundPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Page Not Found \u2014 PaceCue</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #0f0f0f; color: #e0e0e0; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .box { text-align: center; }
    h1 { font-size: 48px; color: #4ADE80; margin-bottom: 8px; }
    p { color: #888; margin-bottom: 24px; }
    a { color: #4ADE80; text-decoration: none; font-weight: 600; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="box">
    <h1>404</h1>
    <p>This page doesn't exist.</p>
    <a href="/">Back to PaceCue</a>
  </div>
</body>
</html>`;
}
__name(notFoundPage, "notFoundPage");
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
