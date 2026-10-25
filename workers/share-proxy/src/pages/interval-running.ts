/**
 * Feature page: Interval Running With Voice Guidance
 */

import { renderPage, phoneFrame, ctaBanner } from '../layout';

export function intervalRunningPage(): string {
  return renderPage(
    {
      title:
        'Interval Running With Voice Guidance — SplitCue',
      description:
        'SplitCue guides you through structured interval workouts with voice announcements for every transition. Build custom intervals or choose from 11 built-in presets including tempo runs, fartlek, hill repeats, and run/walk.',
      path: '/features/interval-running',
    },
    `
    <section class="page-header">
      <h1>Interval Running With Voice Guidance</h1>
      <p>Structured workouts with clear voice coaching at every transition — warmup, hard, easy, cooldown.</p>
    </section>

    <section class="section section-center">
      <div class="container-wide">
        <div class="phone-showcase">
          <div>
            ${phoneFrame('/screenshot-workouts.png', 'SplitCue workout list showing multiple interval workouts ready to start')}
            <p class="phone-label">Workout Library</p>
          </div>
          <div>
            ${phoneFrame('/screenshot-editor.png', 'SplitCue workout editor with customizable intervals, effort, and target pace')}
            <p class="phone-label">Workout Editor</p>
          </div>
        </div>
      </div>
    </section>

    <section class="section section-alt">
      <div class="prose">
        <h2>How SplitCue Handles Interval Workouts</h2>
        <p>SplitCue's workout model is built around <strong>interval blocks</strong>. Each block contains one or more intervals (hard, easy, warmup, or cooldown), and each block can repeat any number of times. This structure supports everything from simple run/walk programs to complex pyramid sessions.</p>

        <p>At every interval transition, SplitCue announces:</p>
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
        <p>Every interval in SplitCue has a type that determines its role in the workout:</p>
        <ul>
          <li><strong>Warmup</strong> — low-intensity start (jog, walk, drills, strides)</li>
          <li><strong>Hard</strong> — high-effort work intervals (sprint, tempo, race pace, threshold, hill)</li>
          <li><strong>Easy</strong> — recovery between hard efforts (walk, jog, float, rest)</li>
          <li><strong>Cooldown</strong> — low-intensity finish</li>
        </ul>
        <p>Each interval has a custom label, a duration, an optional effort level (1–10 scale), and an optional target pace.</p>

        <h2>Building Custom Workouts</h2>
        <p>SplitCue's workout editor lets you:</p>
        <ul>
          <li>Add multiple blocks with different interval patterns</li>
          <li>Set repeat counts on each block (e.g., "repeat 6 times")</li>
          <li>Assign labels from presets or type your own</li>
          <li>Set target paces on individual intervals</li>
          <li>Add perceived effort ratings for voice cueing</li>
          <li>Include separate warmup and cooldown phases</li>
        </ul>

        <h2>Built-In Workout Presets</h2>
        <p>SplitCue includes 11 ready-to-run presets covering common training patterns:</p>

        <h3>5K Speed</h3>
        <p>10-minute warmup → 6 × (3 minutes hard / 2 minutes easy) → 5-minute cooldown. A classic speed session for 5K race prep.</p>

        <h3>Tempo Run</h3>
        <p>8-minute warmup with strides → 20-minute sustained tempo → 5-minute cooldown. Builds lactate threshold fitness.</p>

        <h3>Fartlek</h3>
        <p>Mixed-length speed bursts — 2 min, 1 min, and 30 sec segments with jog recovery. Keeps things unpredictable and fun.</p>

        <h3>Pyramid</h3>
        <p>1-2-3-2-1 minute hard intervals with equal recovery. Builds through a peak and brings you back down.</p>

        <h3>Hill Repeats</h3>
        <p>8 × (1 minute hill / 90 seconds recovery jog). Find a hill, press start, and let SplitCue time the efforts.</p>

        <h3>Run/Walk</h3>
        <p>8 × (3 minutes run / 1 minute walk). Ideal for beginners, return-from-injury runners, or easy long run strategies.</p>

        <h3>400m Repeats</h3>
        <p>10 × (90 seconds sprint / 90 seconds recovery) with stride warmup. Track-style speed work.</p>

        <h3>Mile Intervals</h3>
        <p>4 × (6 minutes at race pace / 2 minutes recovery). Practices sustained effort at goal race speed.</p>

        <h2>How Voice Guidance Helps During Intervals</h2>
        <p>Without audio guidance, interval training requires you to repeatedly check your phone or watch. SplitCue removes all of this by announcing every transition, time check, and pace update through your headphones.</p>
        <p>This is especially useful for:</p>
        <ul>
          <li><strong>Track workouts</strong> where looking at your phone breaks form</li>
          <li><strong>Trail runs</strong> where footing matters and distractions are dangerous</li>
          <li><strong>Dark or rainy conditions</strong> where screen visibility is poor</li>
          <li><strong>Long sessions</strong> with many repeats where it's easy to lose count</li>
        </ul>

        <h2>Limitations</h2>
        <ul>
          <li>SplitCue uses time-based intervals, not distance-based. A "400m repeat" is timed rather than GPS-measured to a specific distance.</li>
          <li>The app does not import workouts from other platforms like Garmin Connect or TrainingPeaks.</li>
        </ul>
      </div>
    </section>

    ${ctaBanner('Run Your First Interval Workout', 'Download SplitCue and pick a preset or build your own — voice coaching starts immediately.')}
    `,
  );
}
