/* timer.js: study timer (start, pause, reset) and focus mode. */
(function () {
  var display = document.getElementById('timerDisplay');
  var progress = document.getElementById('timerProgress');
  var status = document.getElementById('timerStatus');
  var startBtn = document.getElementById('startBtn');
  var pauseBtn = document.getElementById('pauseBtn');
  var resetBtn = document.getElementById('resetBtn');
  var focusBtn = document.getElementById('focusBtn');
  var form = document.getElementById('timeForm');
  var minutesEl = document.getElementById('minutes');
  var minutesErr = document.getElementById('minutesError');
  var sessionEl = document.getElementById('sessionCount');

  var total = SB.load('sb_minutes', 25) * 60;   /* total seconds */
  var remaining = total;                         /* seconds left */
  var endTime = 0;                               /* time when the timer finishes */
  var tid = null;                                /* interval id */

  minutesEl.value = total / 60;
  sessionEl.textContent = SB.load('sb_sessions', 0);

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  function draw() {
    display.textContent = pad(Math.floor(remaining / 60)) + ':' + pad(remaining % 60);
    progress.value = total > 0 ? ((total - remaining) / total) * 100 : 0;
    document.title = 'SchoolBook | ' + display.textContent;
  }

  function tick() {
    /* Use the clock time so the timer stays correct if the tab is slow. */
    remaining = Math.max(0, Math.round((endTime - Date.now()) / 1000));
    draw();
    if (remaining === 0) {
      clearInterval(tid); tid = null;
      status.textContent = 'Time is up. Take a short break.';
      var count = SB.load('sb_sessions', 0) + 1;
      SB.save('sb_sessions', count);
      sessionEl.textContent = count;
      alert('Study time is finished. Well done!');
    }
  }

  startBtn.addEventListener('click', function () {
    if (tid || remaining === 0) return;
    endTime = Date.now() + remaining * 1000;
    tid = setInterval(tick, 1000);
    status.textContent = 'Studying. Stay focused.';
  });

  pauseBtn.addEventListener('click', function () {
    if (!tid) return;
    clearInterval(tid); tid = null;
    status.textContent = 'Paused.';
  });

  resetBtn.addEventListener('click', function () {
    clearInterval(tid); tid = null;
    remaining = total;
    status.textContent = 'Ready.';
    draw();
  });

  /* Validate the minutes field: whole number from 1 to 180. */
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var raw = minutesEl.value.trim();
    var n = Number(raw);
    minutesErr.textContent = '';
    minutesEl.classList.remove('invalid');

    if (raw === '') {
      minutesErr.textContent = 'Please enter the minutes.';
    } else if (!Number.isInteger(n)) {
      minutesErr.textContent = 'Use a whole number, for example 25.';
    } else if (n < 1 || n > 180) {
      minutesErr.textContent = 'Minutes must be between 1 and 180.';
    }
    if (minutesErr.textContent) { minutesEl.classList.add('invalid'); return; }

    clearInterval(tid); tid = null;
    total = n * 60;
    remaining = total;
    SB.save('sb_minutes', n);
    status.textContent = 'Time set to ' + n + ' minutes.';
    draw();
  });

  /* Focus mode: hides menu, footer and extra items. */
  focusBtn.addEventListener('click', function () {
    var on = document.body.classList.toggle('focus-mode');
    focusBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    focusBtn.textContent = on ? 'Turn off focus mode' : 'Turn on focus mode';
  });

  draw();
})();