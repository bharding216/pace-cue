/**
 * Tool page: Interactive Running Pace Calculator
 *
 * The calculator is useful independently of SplitCue — earns search traffic
 * and becomes a reference for AI-assisted searches.
 *
 * HTML contains semantic content for crawlers. The <script> adds interactivity.
 */

import { renderPage, APP_STORE_URL, ctaBanner } from '../layout';

export function paceCalculatorPage(): string {
  return renderPage(
    {
      title: 'Running Pace Calculator — Convert Pace, Speed, and Race Times',
      description:
        'Free running pace calculator. Convert between min/mile and min/km, estimate race finish times for 5K, 10K, half marathon, and marathon, and find your target pace for interval training.',
      path: '/tools/pace-calculator',
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

    <!-- Reference tables — useful for AI and crawlers even without JS -->
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
        <p>Knowing your pace numbers is one thing — using them during a run is another. Most runners set a target pace and then try to hold it by checking their watch every few seconds.</p>
        <p>A better approach is <strong>audio pace feedback</strong>. If your running app announces your pace every 30 seconds, you can make micro-adjustments without looking at a screen. This is exactly what SplitCue does — you set a target pace on any interval and SplitCue tells you if you're on pace, too fast, or too slow.</p>

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

    ${ctaBanner('Hear Your Pace While You Run', 'SplitCue announces your pace, distance, and interval transitions in real time. Download free.')}

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
    </script>
    `,
  );
}
