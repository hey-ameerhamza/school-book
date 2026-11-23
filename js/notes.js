/* notes.js: create, edit, delete, star and search notes. */
(function () {
  var KEY = 'sb_notes';
  var notes = SB.load(KEY, []);
  var editingId = null;

  var form = document.getElementById('noteForm');
  var titleEl = document.getElementById('noteTitle');
  var textEl = document.getElementById('noteText');
  var titleErr = document.getElementById('titleError');
  var textErr = document.getElementById('textError');
  var searchEl = document.getElementById('searchNotes');
  var listEl = document.getElementById('noteList');
  var countEl = document.getElementById('noteCount');
  var formTitle = document.getElementById('formTitle');
  var saveBtn = document.getElementById('saveBtn');
  var cancelBtn = document.getElementById('cancelEdit');

  /* Form validation with clear messages. */
  function validate() {
    var title = titleEl.value.trim();
    var text = textEl.value.trim();
    var ok = true;

    titleErr.textContent = '';
    textErr.textContent = '';
    titleEl.classList.remove('invalid');
    textEl.classList.remove('invalid');

    if (title.length === 0) {
      titleErr.textContent = 'Please enter a title.'; ok = false;
    } else if (title.length > 60) {
      titleErr.textContent = 'Title is too long. Use 60 characters or fewer (now ' + title.length + ').'; ok = false;
    }
    if (text.length === 0) {
      textErr.textContent = 'Please write your note.'; ok = false;
    } else if (text.length > 2000) {
      textErr.textContent = 'Note is too long. Use 2000 characters or fewer (now ' + text.length + ').'; ok = false;
    }
    if (titleErr.textContent) titleEl.classList.add('invalid');
    if (textErr.textContent) textEl.classList.add('invalid');
    return ok;
  }

  function resetForm() {
    form.reset();
    editingId = null;
    formTitle.textContent = 'Add a note';
    saveBtn.textContent = 'Save note';
    cancelBtn.hidden = true;
    titleErr.textContent = '';
    textErr.textContent = '';
    titleEl.classList.remove('invalid');
    textEl.classList.remove('invalid');
  }

  /* Draw the list. Search checks title and text. */
  function render() {
    var q = searchEl.value.trim().toLowerCase();
    var shown = notes.filter(function (n) {
      return n.title.toLowerCase().indexOf(q) !== -1 || n.text.toLowerCase().indexOf(q) !== -1;
    });

    countEl.textContent = shown.length + ' of ' + notes.length + ' notes shown.';

    if (shown.length === 0) {
      listEl.innerHTML = '<li class="muted">' + (notes.length ? 'No note matches your search.' : 'No notes yet. Add your first note above.') + '</li>';
      return;
    }

    listEl.innerHTML = shown.map(function (n) {
      return '<li class="card" data-id="' + n.id + '">' +
        '<h3>' + (n.star ? '&#9733; ' : '') + SB.esc(n.title) + '</h3>' +
        '<p>' + SB.esc(n.text) + '</p>' +
        '<div class="actions">' +
        '<button class="btn btn-alt" type="button" data-act="star">' + (n.star ? 'Unstar' : 'Star') + '</button>' +
        '<button class="btn btn-alt" type="button" data-act="edit">Edit</button>' +
        '<button class="btn btn-warn" type="button" data-act="delete">Delete</button>' +
        '</div></li>';
    }).join('');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validate()) return;

    var title = titleEl.value.trim();
    var text = textEl.value.trim();

    if (editingId) {
      notes.forEach(function (n) {
        if (n.id === editingId) { n.title = title; n.text = text; }
      });
    } else {
      notes.unshift({ id: SB.id(), title: title, text: text, star: false });
    }
    SB.save(KEY, notes);
    resetForm();
    render();
  });

  cancelBtn.addEventListener('click', resetForm);
  searchEl.addEventListener('input', render);

  /* One click handler for all buttons in the list. */
  listEl.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-act]');
    if (!btn) return;
    var id = btn.closest('li').dataset.id;
    var act = btn.dataset.act;

    if (act === 'delete') {
      if (confirm('Delete this note?')) {
        notes = notes.filter(function (n) { return n.id !== id; });
        SB.save(KEY, notes);
        if (editingId === id) resetForm();
      }
    } else if (act === 'star') {
      notes.forEach(function (n) { if (n.id === id) n.star = !n.star; });
      SB.save(KEY, notes);
    } else if (act === 'edit') {
      var note = notes.filter(function (n) { return n.id === id; })[0];
      if (note) {
        editingId = id;
        titleEl.value = note.title;
        textEl.value = note.text;
        formTitle.textContent = 'Edit note';
        saveBtn.textContent = 'Update note';
        cancelBtn.hidden = false;
        titleEl.focus();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
    render();
  });

  render();
})();