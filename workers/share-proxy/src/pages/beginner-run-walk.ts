/**
 * Guide page: Beginner Run/Walk Training Guide
 */

import { renderPage, APP_STORE_URL, ctaBanner } from '../layout';

export function beginnerRunWalkPage(): string {
  return renderPage(
    {
      title:
        'Beginner Run/Walk Training Guide — How to Start Running With Walk Breaks',
      description:
        'A complete guide to run/walk interval training for beginners. Learn how to alternate running and walking to build endurance safely, with sample programs from 20 to 40 minutes.',
      path: '/guides/beginner-run-walk',
    },
    `
    <section class="page-header">
      <h1>Beginner Run/Walk Training Guide</h1>
      <p>How to start running using walk breaks — the safest and most effective way to build endurance as a new runner.</p>
    </section>

    <section class="section">
      <div class="prose">
        <h2>Why Run/Walk Works</h2>
        <p>Run/walk isn't a shortcut — it's a proven training method used by beginners and experienced runners alike. The idea is simple: alternate between running and walking at set intervals. This approach has several advantages:</p>
        <ul>
          <li><strong>Reduces injury risk.</strong> Walk breaks give your muscles, tendons, and joints periodic rest, which is critical when your body isn't yet adapted to continuous running.</li>
          <li><strong>Makes running mentally approachable.</strong> Knowing you only have to run for 1–3 minutes before a walk break makes the effort feel manageable.</li>
          <li><strong>Builds aerobic fitness gradually.</strong> You accumulate running time without the exhaustion of trying to run continuously too soon.</li>
          <li><strong>Used by elite coaches.</strong> Jeff Galloway's run/walk method has been used to train hundreds of thousands of marathon finishers.</li>
        </ul>

        <h2>How It Works</h2>
        <p>Pick a running interval and a walking interval. Run for the set time, then walk for the set time. Repeat for your total workout duration. That's it.</p>
        <p>The key is to <strong>start conservatively</strong>. If you haven't been running regularly, begin with more walking than running and progress slowly.</p>

        <h2>Sample Run/Walk Programs</h2>

        <h3>Week 1–2: Getting Started (20 minutes)</h3>
        <p>If you're brand new to running or returning after a long break:</p>
        <ul>
          <li>Run 1 minute / Walk 2 minutes × 7 rounds (21 minutes total)</li>
          <li>Run at a conversational pace — you should be able to speak in short sentences</li>
          <li>Walk at a normal walking pace, not a stroll</li>
          <li>3 sessions per week, with at least one rest day between sessions</li>
        </ul>

        <h3>Week 3–4: Building (25 minutes)</h3>
        <ul>
          <li>Run 2 minutes / Walk 1 minute × 8 rounds (24 minutes total)</li>
          <li>The running intervals are longer, but the walk breaks keep things manageable</li>
          <li>If 2 minutes feels too hard, stay at the Week 1–2 program longer</li>
        </ul>

        <h3>Week 5–6: Progressing (30 minutes)</h3>
        <ul>
          <li>Run 3 minutes / Walk 1 minute × 8 rounds (32 minutes total)</li>
          <li>You're now running 3× as long as you walk — significant progress from Week 1</li>
        </ul>

        <h3>Week 7–8: Getting Stronger (30+ minutes)</h3>
        <ul>
          <li>Run 5 minutes / Walk 1 minute × 5 rounds (30 minutes total)</li>
          <li>At this point, the walk breaks are mostly mental resets</li>
          <li>When this feels comfortable, try running for 10 minutes straight</li>
        </ul>

        <h2>Tips for Beginners</h2>
        <ul>
          <li><strong>Don't skip walk breaks.</strong> The walk intervals are part of the training, not a sign of weakness. Take them every time.</li>
          <li><strong>Run slowly.</strong> Your running pace should feel easy. If you're gasping, slow down. Speed comes later.</li>
          <li><strong>Use a timer or app.</strong> Trying to guess when 2 minutes is up is distracting. Use an interval timer that tells you when to switch — ideally with audio so you don't have to watch your phone.</li>
          <li><strong>Don't increase volume too fast.</strong> Add no more than 5–10 minutes per week to your total running time.</li>
          <li><strong>Rest days matter.</strong> Run 3–4 days per week max. Your body adapts and gets stronger on rest days, not running days.</li>
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

        <h2>Using SplitCue for Run/Walk</h2>
        <p>SplitCue includes a built-in <strong>Run/Walk preset</strong> (8 × 3 min run / 1 min walk), and you can build any run/walk ratio with the workout editor or AI builder.</p>
        <p>When you run, SplitCue announces every transition through your headphones: <em>"Run — 3 minutes"</em> → <em>"10 seconds remaining"</em> → <em>"Walk — 1 minute."</em> You never need to look at your phone — just listen and follow the cues.</p>
        <p>To create a beginner program, you could tell the AI builder: <em>"Run 1 minute, walk 2 minutes, repeat 7 times."</em></p>
      </div>
    </section>

    ${ctaBanner('Start Your Run/Walk Program', 'SplitCue tells you when to run and when to walk — hands-free. Download free.')}
    `,
  );
}
