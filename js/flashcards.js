/* flashcards.js: build cards, flip, mark known or review again, filter, star. */
(function () {
  var KEY = 'sb_cards';
  var cards = SB.load(KEY, []);
  var index = 0;
  var showingAnswer = false;

  var form = document.getElementById('cardForm');
  var qEl = document.getElementById('cardQ');
  var aEl = document.getElementById('cardA');
  var qErr = document.getElementById('qError');
  var aErr = document.getElementById('aError');
  var filterEl = document.getElementById('filterCards');
  var studyEl = document.getElementById('studyCard');
  var counterEl = document.getElementById('cardCounter');
  var listEl = document.getElementById('cardList');
  var starBtn = document.getElementById('starCard');

  /* Cards that match the filter. "review" means not yet known. */
  function visible() {
    var f = filterEl.value;
    return cards.filter(function (c) {
      if (f === 'known') return c.known;
      if (f === 'review') return !c.known;
      return true;
    });
  }

  function validate() {
    var q = qEl.value.trim();
    var a = aEl.value.trim();
    var ok = true;
    qErr.textContent = ''; aErr.textContent = '';
    qEl.classList.remove('invalid'); aEl.classList.remove('invalid');

    if (q.length === 0) { qErr.textContent = 'Please enter a question.'; ok = false; }
    else if (q.length > 200) { qErr.textContent = 'Question is too long. Use 200 characters or fewer (now ' + q.length + ').'; ok = false; }

    if (a.length === 0) { aErr.textContent = 'Please enter an answer.'; ok = false; }
    else if (a.length > 500) { aErr.textContent = 'Answer is too long. Use 500 characters or fewer (now ' + a.length + ').'; ok = false; }

    if (qErr.textContent) qEl.classList.add('invalid');
    if (aErr.textContent) aEl.classList.add('invalid');
    return ok;
  }

  function renderStudy() {
    var list = visible();
    if (list.length === 0) {
      studyEl.textContent = 'No cards to show. Add a card or change the filter.';
      studyEl.classList.remove('answer');
      counterEl.textContent = '';
      starBtn.textContent = 'Star';
      return;
    }
    if (index >= list.length) index = 0;
    if (index < 0) index = list.length - 1;

    var c = list[index];
    studyEl.textContent = showingAnswer ? c.a : c.q;
    studyEl.classList.toggle('answer', showingAnswer);
    counterEl.textContent = 'Card ' + (index + 1) + ' of ' + list.length + ' | Showing ' + (showingAnswer ? 'answer' : 'question') + ' | ' + (c.known ? 'Known' : 'Review again');
    starBtn.textContent = c.star ? 'Unstar' : 'Star';
  }

  function renderList() {
    if (cards.length === 0) {
      listEl.innerHTML = '<li class="muted">No cards yet.</li>';
      return;
    }
    listEl.innerHTML = cards.map(function (c) {
      return '<li class="card" data-id="' + c.id + '">' +
        '<h3>' + (c.star ? '&#9733; ' : '') + SB.esc(c.q) + '</h3>' +
        '<p>' + SB.esc(c.a) + '</p>' +
        '<p><span class="badge">' + (c.known ? 'Known' : 'Review again') + '</span></p>' +
        '<div class="actions">' +
        '<button class="btn btn-alt" type="button" data-act="star">' + (c.star ? 'Unstar' : 'Star') + '</button>' +
        '<button class="btn btn-warn" type="button" data-act="delete">Delete</button>' +
        '</div></li>';
    }).join('');
  }

  function renderAll() { renderStudy(); renderList(); }

  function current() {
    var list = visible();
    return list.length ? list[index] : null;
  }

  function move(step) {
    var list = visible();
    if (!list.length) return;
    index = (index + step + list.length) % list.length;
    showingAnswer = false;
    renderStudy();
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validate()) return;
    cards.push({ id: SB.id(), q: qEl.value.trim(), a: aEl.value.trim(), star: false, known: false });
    SB.save(KEY, cards);
    form.reset();
    renderAll();
  });

  document.getElementById('flipCard').addEventListener('click', function () {
    if (!current()) return;
    showingAnswer = !showingAnswer;
    renderStudy();
  });
  document.getElementById('prevCard').addEventListener('click', function () { move(-1); });
  document.getElementById('nextCard').addEventListener('click', function () { move(1); });

  /* Mark the current card. If the filter hides it afterwards, the index stays valid. */
  function mark(known) {
    var c = current();
    if (!c) return;
    c.known = known;
    SB.save(KEY, cards);
    showingAnswer = false;
    if (filterEl.value === 'all') { index++; }
    renderAll();
  }
  document.getElementById('markKnown').addEventListener('click', function () { mark(true); });
  document.getElementById('markReview').addEventListener('click', function () { mark(false); });

  starBtn.addEventListener('click', function () {
    var c = current();
    if (!c) return;
    c.star = !c.star;
    SB.save(KEY, cards);
    renderAll();
  });

  filterEl.addEventListener('change', function () {
    index = 0; showingAnswer = false; renderStudy();
  });

  listEl.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-act]');
    if (!btn) return;
    var id = btn.closest('li').dataset.id;
    if (btn.dataset.act === 'delete') {
      if (!confirm('Delete this card?')) return;
      cards = cards.filter(function (c) { return c.id !== id; });
    } else if (btn.dataset.act === 'star') {
      cards.forEach(function (c) { if (c.id === id) c.star = !c.star; });
    }
    SB.save(KEY, cards);
    renderAll();
  });

  renderAll();
})();