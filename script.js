const calendarGrid = document.getElementById("calendarGrid");
const calendarTitle = document.getElementById("calendarTitle");
const selectedDateText = document.getElementById("selectedDateText");
const todoForm = document.getElementById("todoForm");
const todoInput = document.getElementById("todoInput");
const todoList = document.getElementById("todoList");
const totalCount = document.getElementById("totalCount");
const doneCount = document.getElementById("doneCount");
const leftCount = document.getElementById("leftCount");

const weekBtn = document.getElementById("weekBtn");
const monthBtn = document.getElementById("monthBtn");
const calendarModeBtn = document.getElementById("calendarModeBtn");
const tableModeBtn = document.getElementById("tableModeBtn");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const todayBtn = document.getElementById("todayBtn");

const todoAppBtn = document.getElementById("todoAppBtn");
const noteAppBtn = document.getElementById("noteAppBtn");
const weatherAppBtn = document.getElementById("weatherAppBtn");
const exchangeAppBtn = document.getElementById("exchangeAppBtn");
const todoSection = document.getElementById("todoSection");
const noteSection = document.getElementById("noteSection");
const weatherSection = document.getElementById("weatherSection");
const exchangeSection = document.getElementById("exchangeSection");
const todoOnlyControls = document.querySelectorAll(".todo-only");

const calendarView = document.getElementById("calendarView");
const tableView = document.getElementById("tableView");
const todoTableBody = document.getElementById("todoTableBody");
const startDateInput = document.getElementById("startDate");
const endDateInput = document.getElementById("endDate");
const downloadExcelBtn = document.getElementById("downloadExcelBtn");
const excelUpload = document.getElementById("excelUpload");

const STORAGE_KEY = "pastel-yellow-todo-calendar-v2";
const today = new Date();

let currentDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
let selectedDate = new Date(currentDate);
let viewMode = "month";
let displayMode = "calendar";
let todos = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");

startDateInput.value = toKey(new Date(today.getFullYear(), today.getMonth(), 1));
endDateInput.value = toKey(new Date(today.getFullYear(), today.getMonth() + 1, 0));

function saveTodos() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

function toKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDateKey(value) {
  if (value instanceof Date && !isNaN(value)) return toKey(value);

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
    }
  }

  const text = String(value || "").trim();
  if (!text) return "";

  const normalized = text
    .replace(/[.\/]/g, "-")
    .replace(/년|월/g, "-")
    .replace(/일/g, "")
    .replace(/\s+/g, "");

  const date = new Date(normalized);
  if (!isNaN(date)) return toKey(date);

  const match = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) {
    return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
  }

  return "";
}

function formatKorean(date) {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function dayName(date) {
  return ["일", "월", "화", "수", "목", "금", "토"][date.getDay()];
}

function isSameDate(a, b) {
  return toKey(a) === toKey(b);
}

function getWeekDates(baseDate) {
  const start = new Date(baseDate);
  start.setDate(baseDate.getDate() - baseDate.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    return date;
  });
}

function getMonthDates(baseDate) {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());

  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    return date;
  });
}

function getVisibleDates() {
  return viewMode === "month" ? getMonthDates(currentDate) : getWeekDates(currentDate);
}

function setTitle() {
  if (viewMode === "month") {
    calendarTitle.textContent = `${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월`;
  } else {
    const weekDates = getWeekDates(currentDate);
    calendarTitle.textContent = `${formatKorean(weekDates[0])} ~ ${formatKorean(weekDates[6])}`;
  }
}

function renderCalendar() {
  const dates = getVisibleDates();
  calendarGrid.innerHTML = "";

  dates.forEach(date => {
    const key = toKey(date);
    const dayTodos = todos[key] || [];
    const day = document.createElement("div");

    day.className = "day";
    if (isSameDate(date, selectedDate)) day.classList.add("selected");
    if (isSameDate(date, today)) day.classList.add("today");
    if (viewMode === "month" && date.getMonth() !== currentDate.getMonth()) {
      day.classList.add("other-month");
    }

    day.innerHTML = `<div class="date-num">${date.getDate()}</div>`;

    dayTodos.slice(0, 3).forEach(todo => {
      const chip = document.createElement("span");
      chip.className = "todo-chip" + (todo.done ? " done" : "");
      chip.textContent = todo.text;
      day.appendChild(chip);
    });

    if (dayTodos.length > 3) {
      const more = document.createElement("div");
      more.className = "more";
      more.textContent = `+${dayTodos.length - 3}개 더`;
      day.appendChild(more);
    }

    day.addEventListener("click", () => {
      selectedDate = new Date(date);
      currentDate = new Date(date);
      render();
    });

    calendarGrid.appendChild(day);
  });
}

function renderTable() {
  const dates = getVisibleDates();
  todoTableBody.innerHTML = "";

  dates.forEach(date => {
    const key = toKey(date);
    const items = todos[key] || [];
    const tr = document.createElement("tr");

    const todoHtml = items.length
      ? items.map(item => `<span class="table-todo ${item.done ? "done" : ""}">${escapeHtml(item.text)}</span>`).join("")
      : `<span style="color: var(--muted);">등록된 Todo 없음</span>`;

    tr.innerHTML = `
      <td class="table-date">${key}</td>
      <td>${dayName(date)}</td>
      <td>${items.length}</td>
      <td>${items.filter(item => item.done).length}</td>
      <td>${items.filter(item => !item.done).length}</td>
      <td>${todoHtml}</td>
    `;

    tr.addEventListener("click", () => {
      selectedDate = new Date(date);
      currentDate = new Date(date);
      displayMode = "calendar";
      render();
    });

    todoTableBody.appendChild(tr);
  });
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderTodos() {
  const key = toKey(selectedDate);
  const items = todos[key] || [];

  selectedDateText.textContent = formatKorean(selectedDate);
  todoList.innerHTML = "";

  if (items.length === 0) {
    todoList.innerHTML = `<div class="empty">이 날짜에 등록된 Todo가 없습니다.</div>`;
  } else {
    items.forEach(todo => {
      const item = document.createElement("div");
      item.className = "todo-item" + (todo.done ? " done" : "");

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = todo.done;
      checkbox.addEventListener("change", () => {
        todo.done = checkbox.checked;
        saveTodos();
        render();
      });

      const text = document.createElement("div");
      text.className = "todo-text";
      text.textContent = todo.text;

      const del = document.createElement("button");
      del.className = "delete";
      del.type = "button";
      del.textContent = "삭제";
      del.addEventListener("click", () => {
        todos[key] = todos[key].filter(item => item.id !== todo.id);
        if (todos[key].length === 0) delete todos[key];
        saveTodos();
        render();
      });

      item.append(checkbox, text, del);
      todoList.appendChild(item);
    });
  }

  totalCount.textContent = items.length;
  doneCount.textContent = items.filter(item => item.done).length;
  leftCount.textContent = items.filter(item => !item.done).length;
}

function renderDisplayMode() {
  calendarView.classList.toggle("hidden", displayMode !== "calendar");
  tableView.classList.toggle("hidden", displayMode !== "table");
  calendarModeBtn.classList.toggle("active", displayMode === "calendar");
  tableModeBtn.classList.toggle("active", displayMode === "table");
}

function render() {
  setTitle();
  renderCalendar();
  renderTable();
  renderTodos();
  renderDisplayMode();
  weekBtn.classList.toggle("active", viewMode === "week");
  monthBtn.classList.toggle("active", viewMode === "month");
}

function getTodosInRange(startKey, endKey) {
  const rows = [];
  Object.keys(todos)
    .filter(key => key >= startKey && key <= endKey)
    .sort()
    .forEach(key => {
      todos[key].forEach(item => {
        rows.push({
          날짜: key,
          요일: dayName(new Date(key)),
          할일: item.text,
          완료: item.done ? "TRUE" : "FALSE",
          상태: item.done ? "완료" : "미완료"
        });
      });
    });
  return rows;
}

function downloadExcel() {
  if (typeof XLSX === "undefined") {
    alert("엑셀 라이브러리를 불러오지 못했습니다. 인터넷 연결 후 다시 시도해주세요.");
    return;
  }

  const startKey = startDateInput.value;
  const endKey = endDateInput.value;

  if (!startKey || !endKey || startKey > endKey) {
    alert("올바른 기간을 선택해주세요.");
    return;
  }

  const rows = getTodosInRange(startKey, endKey);
  const data = rows.length ? rows : [{
    날짜: "",
    요일: "",
    할일: "선택한 기간에 Todo가 없습니다.",
    완료: "",
    상태: ""
  }];

  const worksheet = XLSX.utils.json_to_sheet(data);
  worksheet["!cols"] = [
    { wch: 14 },
    { wch: 8 },
    { wch: 42 },
    { wch: 10 },
    { wch: 10 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Todo");
  XLSX.writeFile(workbook, `Todo_${startKey}_${endKey}.xlsx`);
}

function uploadExcel(event) {
  if (typeof XLSX === "undefined") {
    alert("엑셀 라이브러리를 불러오지 못했습니다. 인터넷 연결 후 다시 시도해주세요.");
    return;
  }

  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = e => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array", cellDates: true });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });

      const imported = {};

      rows.forEach(row => {
        const dateValue = row["날짜"] ?? row["Date"] ?? row["date"];
        const textValue = row["할일"] ?? row["Todo"] ?? row["todo"] ?? row["내용"];
        const doneValue = row["완료"] ?? row["Done"] ?? row["done"] ?? row["상태"];

        const key = parseDateKey(dateValue);
        const text = String(textValue || "").trim();
        if (!key || !text) return;

        const doneText = String(doneValue || "").trim().toLowerCase();
        const done = ["true", "완료", "y", "yes", "1", "done"].includes(doneText);

        if (!imported[key]) imported[key] = [];
        imported[key].push({
          id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
          text,
          done
        });
      });

      if (Object.keys(imported).length === 0) {
        alert("가져올 Todo가 없습니다. 날짜, 할일, 완료 열을 확인해주세요.");
        return;
      }

      todos = imported;
      saveTodos();

      const firstDateKey = Object.keys(todos).sort()[0];
      selectedDate = new Date(firstDateKey);
      currentDate = new Date(firstDateKey);
      alert("엑셀 내용으로 Todo가 갱신되었습니다.");
      render();
    } catch (error) {
      alert("엑셀 파일을 읽는 중 오류가 발생했습니다.");
      console.error(error);
    } finally {
      excelUpload.value = "";
    }
  };

  reader.readAsArrayBuffer(file);
}

function showApp(appName) {
  const isTodo = appName === "todo";
  const isNote = appName === "note";
  const isWeather = appName === "weather";
  const isExchange = appName === "exchange";

  todoSection.classList.toggle("hidden", !isTodo);
  noteSection.classList.toggle("hidden", !isNote);
  weatherSection.classList.toggle("hidden", !isWeather);
  exchangeSection.classList.toggle("hidden", !isExchange);

  todoAppBtn.classList.toggle("active", isTodo);
  noteAppBtn.classList.toggle("active", isNote);
  weatherAppBtn.classList.toggle("active", isWeather);
  exchangeAppBtn.classList.toggle("active", isExchange);

  todoOnlyControls.forEach(el => el.classList.toggle("hidden", !isTodo));

  if (isWeather && window.loadSeoulWeather) {
    window.loadSeoulWeather();
  }

  if (isExchange && window.initExchangeApp) {
    window.initExchangeApp();
  }
}

todoForm.addEventListener("submit", event => {
  event.preventDefault();

  const text = todoInput.value.trim();
  if (!text) return;

  const key = toKey(selectedDate);
  if (!todos[key]) todos[key] = [];

  todos[key].push({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    text,
    done: false
  });

  todoInput.value = "";
  saveTodos();
  render();
});

weekBtn.addEventListener("click", () => {
  viewMode = "week";
  currentDate = new Date(selectedDate);
  render();
});

monthBtn.addEventListener("click", () => {
  viewMode = "month";
  currentDate = new Date(selectedDate);
  render();
});

calendarModeBtn.addEventListener("click", () => {
  displayMode = "calendar";
  render();
});

tableModeBtn.addEventListener("click", () => {
  displayMode = "table";
  render();
});

prevBtn.addEventListener("click", () => {
  if (viewMode === "month") {
    currentDate.setMonth(currentDate.getMonth() - 1);
  } else {
    currentDate.setDate(currentDate.getDate() - 7);
  }
  selectedDate = new Date(currentDate);
  render();
});

nextBtn.addEventListener("click", () => {
  if (viewMode === "month") {
    currentDate.setMonth(currentDate.getMonth() + 1);
  } else {
    currentDate.setDate(currentDate.getDate() + 7);
  }
  selectedDate = new Date(currentDate);
  render();
});

todayBtn.addEventListener("click", () => {
  currentDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  selectedDate = new Date(currentDate);
  render();
});

todoAppBtn.addEventListener("click", () => showApp("todo"));
noteAppBtn.addEventListener("click", () => showApp("note"));
weatherAppBtn.addEventListener("click", () => showApp("weather"));
exchangeAppBtn.addEventListener("click", () => showApp("exchange"));

downloadExcelBtn.addEventListener("click", downloadExcel);
excelUpload.addEventListener("change", uploadExcel);

function drawCanvasBackground() {
  const canvas = document.getElementById("softCanvas");
  const ctx = canvas.getContext("2d");
  const ratio = window.devicePixelRatio || 1;

  canvas.width = window.innerWidth * ratio;
  canvas.height = window.innerHeight * ratio;
  ctx.scale(ratio, ratio);

  const circles = [
    [90, 90, 95, "rgba(245, 215, 110, 0.45)"],
    [window.innerWidth - 130, 150, 125, "rgba(255, 233, 168, 0.55)"],
    [window.innerWidth * 0.5, window.innerHeight - 90, 165, "rgba(255, 242, 183, 0.55)"]
  ];

  circles.forEach(([x, y, r, color]) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  });

  for (let i = 0; i < 46; i++) {
    ctx.beginPath();
    ctx.arc(
      Math.random() * window.innerWidth,
      Math.random() * window.innerHeight,
      Math.random() * 3 + 1,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = "rgba(216, 169, 40, 0.16)";
    ctx.fill();
  }
}

window.addEventListener("resize", drawCanvasBackground);
drawCanvasBackground();
showApp("todo");
render();
