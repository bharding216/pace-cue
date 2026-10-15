/**
 * Guide page: How to Maintain a Target Running Pace
 */

import { renderPage, ctaBanner } from '../layout';

export function maintainPacePage(): string {
  return renderPage(
    {
      title:
        'How to Maintain a Target Running Pace — PaceCue',
      description:
        'Learn how to hold a consistent running pace during training and races. PaceCue\'s real-time audio pace announcements help you lock in your target without checking your watch.',
      path: '/guides/maintain-running-pace',
    },
    `
    <section class="page-header">
      <h1>How to Maintain a Target Running Pace</h1>
      <p>Practical strategies for holding a consistent pace during training — and how audio pace feedback helps.</p>
    </section>

    <section class="section">
      <div class="prose">
        <h2>Why Consistent Pacing Matters</h2>
        <p>Starting too fast is the most common mistake in distance running. Whether you're doing a tempo run, a race-pace workout, or running a 5K, going out too hard leads to premature fatigue and slower overall times. Maintaining a consistent pace — sometimes called "even splits" — is a more efficient way to run.</p>
        <p>The problem is that pace <em>feels</em> different depending on conditions. Running at 8:00/mile pace feels easy at the start and much harder at mile 4. Your internal sense of effort isn't calibrated well enough to hold pace consistently without external feedback.</p>

        <h2>Traditional Ways to Track Pace</h2>
        <ul>
          <li><strong>GPS watch</strong> — accurate but requires looking at your wrist repeatedly, which breaks form and becomes habitual</li>
          <li><strong>Phone app with screen</strong> — requires holding your phone or stopping to check</li>
          <li><strong>Mile markers</strong> — feedback comes only once per mile, which is too infrequent for adjustments</li>
          <li><strong>Running by feel</strong> — works for experienced runners but is unreliable for specific pace targets</li>
        </ul>

        <h2>How Audio Pace Announcements Help</h2>
        <p>Audio pace feedback solves the core problem: you need frequent, accurate pace information without interrupting your running form. When your app announces <em>"Current pace: 7 minutes 45 seconds per mile"</em> every 30 seconds, you can make small adjustments immediately — speed up a little, or ease off — without ever looking down.</p>

        <p>This is particularly helpful in three scenarios:</p>

        <h3>1. Race-Pace Intervals</h3>
        <p>When you're practicing your goal race pace during interval training, hearing your actual pace compared to the target lets you calibrate your effort. Over time, you develop a better internal sense of what that pace feels like.</p>

        <h3>2. Tempo Runs</h3>
        <p>Tempo runs are supposed to be "comfortably hard" — a pace you could hold for about an hour. But it's easy to creep faster. Regular pace announcements keep you honest.</p>

        <h3>3. Easy Runs</h3>
        <p>Many runners run their easy days too fast, which impairs recovery. Hearing your pace keeps you accountable to actually running easy.</p>

        <h2>Using PaceCue for Pace Control</h2>
        <p>PaceCue provides three layers of pace feedback during runs:</p>
        <ol>
          <li><strong>Regular pace announcements</strong> — hear your current pace at intervals of 15–120 seconds</li>
          <li><strong>Target pace alerts</strong> — set a target pace on any interval and PaceCue tells you if you're on pace, too fast, or too slow</li>
          <li><strong>Rolling average smoothing</strong> — pace is calculated over a configurable window (10, 30, or 60 seconds) to filter out GPS noise</li>
        </ol>

        <h2>Tips for Maintaining Pace</h2>
        <ul>
          <li><strong>Start conservatively.</strong> Run the first quarter of your workout 5–10 seconds per mile slower than target. You'll make it up as your body warms up.</li>
          <li><strong>Use shorter announcement intervals.</strong> During race-pace work, set pace announcements to every 15 or 30 seconds for tight feedback.</li>
          <li><strong>Use longer windows on hilly terrain.</strong> Set the pace averaging window to 60 seconds on rolling courses to avoid reacting to short uphills.</li>
          <li><strong>Don't chase every fluctuation.</strong> If one announcement shows you slightly off target, wait for the next one before adjusting — GPS has natural variance.</li>
          <li><strong>Run by effort on very hilly courses.</strong> Pace targets make less sense on steep terrain. Use PaceCue's effort ratings instead and save pace targets for flat routes.</li>
        </ul>
      </div>
    </section>

    ${ctaBanner('Get Real-Time Pace Feedback on Your Next Run', 'PaceCue announces your pace out loud so you can focus on running, not your screen.')}
    `,
  );
}
