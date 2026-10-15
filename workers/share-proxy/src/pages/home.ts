/**
 * Homepage — the most important page for AI readability.
 * Answers: What is PaceCue? Who is it for? What problems does it solve?
 */

import { renderPage, APP_STORE_URL, phoneFrame, ctaBanner } from '../layout';

export function homePage(): string {
  return renderPage(
    {
      title:
        'PaceCue — Real-Time Voice Pace Coaching and Interval Training App for Runners',
      description:
        'PaceCue is an iPhone running app that provides real-time audio pace announcements, structured interval workouts with voice coaching, GPS pace tracking, and an AI workout builder. Available on iOS.',
      path: '/',
    },
    `
    <!-- ── Hero ──────────────────────────────────────────────── -->
    <section class="hero">
      <div class="hero-bg" role="presentation"></div>
      <div class="hero-gradient" role="presentation"></div>
      <div class="hero-content">
        <img src="/icon.png" alt="PaceCue app icon" class="hero-logo" width="80" height="80">
        <h1>Real-Time <span class="green">Voice Pace Coaching</span> for Runners</h1>
        <p class="subtitle">PaceCue is an interval running app for iPhone that coaches you with audio announcements for pace, distance, elapsed time, and interval transitions — so you can focus on running, not your screen.</p>
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

    <!-- ── App Screenshots ───────────────────────────────────── -->
    <section class="section section-center">
      <div class="container-wide">
        <span class="section-label">See It In Action</span>
        <h2>Designed for Runners Who Mean Business</h2>
        <p>A clean, dark interface built for glanceable info during workouts — or no glances at all.</p>
        <div class="phone-showcase">
          <div>
            ${phoneFrame('/screenshot-workouts.png', 'PaceCue workout list showing interval workouts with start buttons')}
            <p class="phone-label">Workout Library</p>
          </div>
          <div>
            ${phoneFrame('/screenshot-ai-builder.png', 'PaceCue AI workout builder chat generating a beginner interval workout')}
            <p class="phone-label">AI Workout Builder</p>
          </div>
          <div>
            ${phoneFrame('/screenshot-history.png', 'PaceCue workout history showing completed run with split times and pace data')}
            <p class="phone-label">Run History & Splits</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ── What Is PaceCue ───────────────────────────────────── -->
    <section class="section section-alt">
      <div class="container-wide">
        <span class="section-label">What Is PaceCue</span>
        <h2>Voice-Coached Interval Training and GPS Pace Tracking</h2>
        <p>PaceCue is a running app designed for runners who want structured interval workouts with hands-free voice coaching. Instead of constantly checking your phone or watch, PaceCue announces your current pace, elapsed time, distance, and interval transitions out loud.</p>
        <p>Whether you're doing 400-meter repeats, tempo runs, fartlek sessions, or run/walk intervals, PaceCue guides you through every phase with clear audio cues.</p>

        <div class="features-grid">
          <div class="feature-card">
            <div class="feature-icon fi-green" aria-hidden="true">🎙️</div>
            <h3>Voice Pace Announcements</h3>
            <p>Hear your current pace (min/mile or min/km) at configurable intervals — every 15, 30, 60, or 120 seconds — using GPS-based tracking with a rolling average for accuracy.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon fi-red" aria-hidden="true">⏱️</div>
            <h3>Interval Timer With Audio Cues</h3>
            <p>Build structured workouts with warmup, hard, easy, and cooldown intervals. PaceCue announces each transition, tells you what's next, and gives countdown warnings.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon fi-blue" aria-hidden="true">🤖</div>
            <h3>AI Workout Builder</h3>
            <p>Describe what you want in plain English — like "a 30-minute tempo run with strides" — and PaceCue's AI generates a complete interval workout.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon fi-green" aria-hidden="true">📊</div>
            <h3>GPS Pace Tracking</h3>
            <p>Real-time GPS tracks your pace, distance, and speed throughout your run. Set target paces on individual intervals and get alerts when you drift off target.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon fi-yellow" aria-hidden="true">🔇</div>
            <h3>Runs in Background</h3>
            <p>Lock your phone and keep running. PaceCue continues tracking and announcing in the background, ducking your music volume for cues and restoring it after.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon fi-blue" aria-hidden="true">📤</div>
            <h3>Workout Sharing</h3>
            <p>Share your workout structures and completed results with other runners via a link. Recipients can import the workout directly into PaceCue.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ── More Screenshots ──────────────────────────────────── -->
    <section class="section section-center">
      <div class="container-wide">
        <span class="section-label">Fully Customizable</span>
        <h2>Build Your Perfect Workout</h2>
        <p>Design interval workouts with precise control — or let the AI handle it.</p>
        <div class="phone-showcase">
          <div>
            ${phoneFrame('/screenshot-editor.png', 'PaceCue workout editor with warmup intervals, target pace, and effort settings')}
            <p class="phone-label">Workout Editor</p>
          </div>
          <div>
            ${phoneFrame('/screenshot-audio-cues.png', 'PaceCue audio cue settings showing voice selection, music ducking, and countdown options')}
            <p class="phone-label">Audio & Voice Settings</p>
          </div>
          <div>
            ${phoneFrame('/screenshot-profile.png', 'PaceCue running profile with experience level, pace settings, and training goals')}
            <p class="phone-label">Running Profile</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Who Is It For ─────────────────────────────────────── -->
    <section class="section section-alt">
      <div class="container-wide">
        <span class="section-label">Who It's For</span>
        <h2>Built for Every Kind of Runner</h2>
        <div class="features-grid">
          <div class="feature-card">
            <h3>Interval Runners</h3>
            <p>Speed work, tempo runs, fartlek, hill repeats — PaceCue handles the timing so you can focus on effort.</p>
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

    <!-- ── Presets ────────────────────────────────────────────── -->
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
          <li class="preset-item"><strong>5K Speed</strong><span>6 × (3 min hard / 2 min easy) with warmup and cooldown</span></li>
          <li class="preset-item"><strong>Tempo Run</strong><span>20-minute sustained tempo effort with stride warmup</span></li>
          <li class="preset-item"><strong>Short Intervals</strong><span>8 × (90 sec sprint / 90 sec recovery)</span></li>
          <li class="preset-item"><strong>Pyramid</strong><span>1-2-3-2-1 minute hard intervals with equal recovery</span></li>
          <li class="preset-item"><strong>Fartlek</strong><span>Mixed-length speed bursts with jog recovery</span></li>
          <li class="preset-item"><strong>Hill Repeats</strong><span>8 × (1 min hill / 90 sec jog recovery)</span></li>
          <li class="preset-item"><strong>Run/Walk</strong><span>8 × (3 min run / 1 min walk) for beginners</span></li>
          <li class="preset-item"><strong>400m Repeats</strong><span>10 × (90 sec sprint / 90 sec recovery)</span></li>
          <li class="preset-item"><strong>Mile Intervals</strong><span>4 × (6 min race pace / 2 min recovery)</span></li>
          <li class="preset-item"><strong>5K Training</strong><span>3 × tempo + 3 × speed intervals</span></li>
          <li class="preset-item"><strong>Easy 30 Min</strong><span>Simple 30-minute easy run timer</span></li>
        </ul>
      </div>
    </section>

    <!-- ── Problems Solved ───────────────────────────────────── -->
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
          <p>Instead of manually configuring every interval, you can <strong>describe your workout in plain English</strong> and let PaceCue's AI builder create it — or pick from 11 built-in presets and customize from there.</p>

          <h3>Holding a consistent target pace</h3>
          <p>PaceCue's GPS pace tracking lets you set a <strong>target pace on any interval</strong>. The app tells you if you're ahead of or behind your target, helping you lock in the right effort level.</p>
        </div>
      </div>
    </section>

    <!-- ── Audio Options ─────────────────────────────────────── -->
    <section class="section">
      <div class="container-wide">
        <span class="section-label">Audio & Platform</span>
        <h2>Customizable Audio Cues</h2>
        <div class="prose">
          <p>PaceCue is available on <strong>iOS</strong> (iPhone). It works with wired headphones, Bluetooth earbuds, or your phone's speaker.</p>

          <h3>Audio Cue Modes</h3>
          <ul>
            <li><strong>Voice</strong> — spoken announcements for pace, intervals, and time remaining</li>
            <li><strong>Beeps</strong> — short tones to mark interval transitions</li>
            <li><strong>Both</strong> — voice announcements with beep tones at transitions</li>
            <li><strong>Silent</strong> — visual-only with haptic feedback</li>
          </ul>

          <h3>Customizable Announcements</h3>
          <ul>
            <li>Pace announcements every 15, 30, 45, 60, 90, or 120 seconds</li>
            <li>Elapsed time announcements at configurable intervals</li>
            <li>Countdown warnings at 10 seconds (configurable) before interval ends</li>
            <li>Music ducking — PaceCue lowers your music volume during cues, then restores it</li>
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

    <!-- ── CTA ───────────────────────────────────────────────── -->
    ${ctaBanner('Start Running With Real-Time Voice Coaching', 'Download PaceCue free and try a built-in workout today.')}
    `,
  );
}
