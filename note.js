const NOTE_STORAGE_KEY = "pastel-class-notes-v1";

const noteForm = document.getElementById("noteForm");
const noteTitleInput = document.getElementById("noteTitleInput");
const noteSubjectInput = document.getElementById("noteSubjectInput");
const noteDateInput = document.getElementById("noteDateInput");
const noteContentInput = document.getElementById("noteContentInput");
const noteSearchInput = document.getElementById("noteSearchInput");
const noteList = document.getElementById("noteList");
const newNoteBtn = document.getElementById("newNoteBtn");
const noteTotalCount = document.getElementById("noteTotalCount");
const noteSubjectCount = document.getElementById("noteSubjectCount");
const noteTodayCount = document.getElementById("noteTodayCount");

let notes = JSON.parse(localStorage.getItem(NOTE_STORAGE_KEY) || "[]");
let editingNoteId = null;

noteDateInput.value = getTodayKey();

function getTodayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function saveNotes() {
  localStorage.setItem(NOTE_STORAGE_KEY, JSON.stringify(notes));
}

function resetNoteForm() {
  editingNoteId = null;
  noteTitleInput.value = "";
  noteSubjectInput.value = "";
  noteDateInput.value = getTodayKey();
  noteContentInput.value = "";
  document.getElementById("saveNoteBtn").textContent = "노트 저장";
  noteTitleInput.focus();
}

function renderNotes() {
  const keyword = noteSearchInput.value.trim().toLowerCase();

  const filteredNotes = notes
    .filter(note => {
      const searchable = `${note.title} ${note.subject} ${note.content} ${note.date}`.toLowerCase();
      return searchable.includes(keyword);
    })
    .sort((a, b) => {
      if (a.date === b.date) return b.updatedAt - a.updatedAt;
      return b.date.localeCompare(a.date);
    });

  noteList.innerHTML = "";

  if (filteredNotes.length === 0) {
    noteList.innerHTML = `<div class="empty">저장된 수업 필기가 없습니다.</div>`;
  } else {
    filteredNotes.forEach(note => {
      const card = document.createElement("article");
      card.className = "note-card";

      card.innerHTML = `
        <div class="note-card-head">
          <div>
            <h3>${escapeNoteHtml(note.title)}</h3>
            <div class="note-meta">${escapeNoteHtml(note.subject || "과목 미지정")} · ${note.date}</div>
          </div>
          <div class="note-card-actions">
            <button type="button" class="ghost" data-edit="${note.id}">수정</button>
            <button type="button" class="delete" data-delete="${note.id}">삭제</button>
          </div>
        </div>
        <p class="note-content">${escapeNoteHtml(note.content)}</p>
      `;

      noteList.appendChild(card);
    });
  }

  noteTotalCount.textContent = notes.length;
  noteSubjectCount.textContent = new Set(notes.map(note => note.subject).filter(Boolean)).size;
  noteTodayCount.textContent = notes.filter(note => note.date === getTodayKey()).length;
}

function escapeNoteHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function fillNoteForm(note) {
  editingNoteId = note.id;
  noteTitleInput.value = note.title;
  noteSubjectInput.value = note.subject;
  noteDateInput.value = note.date;
  noteContentInput.value = note.content;
  document.getElementById("saveNoteBtn").textContent = "노트 수정";
  noteTitleInput.focus();
}

noteForm.addEventListener("submit", event => {
  event.preventDefault();

  const title = noteTitleInput.value.trim();
  const subject = noteSubjectInput.value.trim();
  const date = noteDateInput.value;
  const content = noteContentInput.value.trim();

  if (!title || !date || !content) {
    alert("수업 제목, 날짜, 필기 내용을 입력해주세요.");
    return;
  }

  if (editingNoteId) {
    notes = notes.map(note => {
      if (note.id !== editingNoteId) return note;

      return {
        ...note,
        title,
        subject,
        date,
        content,
        updatedAt: Date.now()
      };
    });
  } else {
    notes.push({
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      title,
      subject,
      date,
      content,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  }

  saveNotes();
  resetNoteForm();
  renderNotes();
});

noteList.addEventListener("click", event => {
  const editId = event.target.dataset.edit;
  const deleteId = event.target.dataset.delete;

  if (editId) {
    const note = notes.find(item => item.id === editId);
    if (note) fillNoteForm(note);
  }

  if (deleteId) {
    const ok = confirm("이 수업 필기를 삭제할까요?");
    if (!ok) return;

    notes = notes.filter(note => note.id !== deleteId);
    if (editingNoteId === deleteId) resetNoteForm();
    saveNotes();
    renderNotes();
  }
});

newNoteBtn.addEventListener("click", resetNoteForm);
noteSearchInput.addEventListener("input", renderNotes);

renderNotes();
