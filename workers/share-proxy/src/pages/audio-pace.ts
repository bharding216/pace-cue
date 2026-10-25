/**
 * Feature page: Audio Pace Announcements
 */

import { renderPage, phoneFrame, ctaBanner } from '../layout';

export function audioPacePage(): string {
  return renderPage(
    {
      title:
        'Audio Pace Announcements While Running — SplitCue',
      description:
        'SplitCue announces your current running pace, distance, and elapsed time through voice audio cues so you never have to look at your phone or watch during a run.',
      path: '/features/audio-pace-announcements',
    },
    `
    <section class="page-header">
      <h1>Running App With Audio Pace Announcements</h1>
      <p>Hear your pace, distance, and elapsed time out loud while you run — no screen-checking required.</p>
    </section>

    <section class="section section-center">
      <div class="container-wide">
        <div class="phone-showcase">
          <div>
            ${phoneFrame('/screenshot-audio-cues.png', 'SplitCue audio settings showing voice selection and countdown warning configuration')}
            <p class="phone-label">Audio & Cue Settings</p>
          </div>
          <div>
            ${phoneFrame('/screenshot-history.png', 'SplitCue run history showing pace data for each interval split')}
            <p class="phone-label">Pace Data Per Split</p>
          </div>
        </div>
      </div>
    </section>

    <section class="section section-alt">
      <div class="prose">
        <h2>How SplitCue's Audio Pace Announcements Work</h2>
        <p>SplitCue uses your phone's GPS to track your running speed in real time. At intervals you choose — every 15, 30, 45, 60, 90, or 120 seconds — SplitCue speaks your current pace out loud through your headphones or your phone's speaker.</p>

        <p>For example, during a run you might hear:</p>
        <ul>
          <li><em>"Current pace: 8 minutes 15 seconds per mile"</em></li>
          <li><em>"Distance: 2.4 miles"</em></li>
          <li><em>"3 minutes remaining"</em></li>
        </ul>

        <p>This lets you make adjustments without breaking stride. If you're drifting too slow on a tempo interval, the pace cue tells you immediately.</p>

        <h2>GPS Pace Tracking Details</h2>
        <p>SplitCue calculates your pace using a <strong>rolling average window</strong> — configurable at 10, 30, or 60 seconds — to smooth out GPS noise. This means you get an accurate picture of your effort rather than spiky second-by-second readings.</p>
        <p>You can display and hear pace in either <strong>minutes per mile</strong> or <strong>minutes per kilometer</strong>.</p>
        <p>SplitCue filters out inaccurate GPS samples (accuracy worse than 20 meters) to prevent phantom pace spikes when you run through tunnels, under bridges, or near tall buildings.</p>

        <h2>Target Pace Alerts</h2>
        <p>When you set a <strong>target pace</strong> on an interval, SplitCue compares your current pace to the target and tells you whether you're on pace, too fast, or too slow. This is especially useful for:</p>
        <ul>
          <li>Race-pace intervals where you need to dial in a specific speed</li>
          <li>Easy recovery intervals where you want to avoid going too fast</li>
          <li>Tempo runs where maintaining a steady effort is the goal</li>
        </ul>

        <h2>Elapsed Time Announcements</h2>
        <p>In addition to pace, SplitCue can announce the <strong>elapsed time within each interval</strong> at regular intervals (every 15, 30, 45, 60, or 120 seconds). This helps you track progress through long intervals without checking your screen.</p>

        <h2>Music Ducking</h2>
        <p>If you listen to music or podcasts while running, SplitCue temporarily <strong>lowers the volume of other audio</strong> during announcements, then restores it. You hear every cue clearly without losing your music.</p>

        <h2>Works With Screen Locked</h2>
        <p>SplitCue continues tracking your pace and making announcements while your <strong>phone screen is locked</strong> and in your pocket. The app uses background location and audio to keep running without draining your battery unnecessarily.</p>

        <h2>Audio Cue Options</h2>
        <p>SplitCue gives you full control over what you hear:</p>
        <ul>
          <li><strong>Voice mode</strong> — full spoken announcements</li>
          <li><strong>Beep mode</strong> — short tones at interval transitions only</li>
          <li><strong>Both mode</strong> — voice announcements plus transition beeps</li>
          <li><strong>Silent mode</strong> — no audio, only on-screen display and haptics</li>
        </ul>
        <p>You can also choose your preferred text-to-speech voice from your device's installed voices.</p>

        <h2>Limitations</h2>
        <ul>
          <li>GPS pace accuracy depends on satellite visibility. Indoor tracks and densely covered trails may produce less accurate readings.</li>
          <li>The first few seconds of a run may show no pace data while SplitCue collects enough GPS samples.</li>
          <li>SplitCue does not currently support external heart rate monitors or ANT+ sensors.</li>
        </ul>
      </div>
    </section>

    ${ctaBanner('Try Audio Pace Announcements', 'Download SplitCue, enable pace tracking in Settings, and hear your pace on your next run.')}
    `,
  );
}
