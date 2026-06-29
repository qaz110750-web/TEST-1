const EXCHANGE_KEY_STORAGE = "koreaexim-exchange-api-key-v1";
const EXCHANGE_API_BASE = "https://oapi.koreaexim.go.kr/site/program/financial/exchangeJSON";

const exchangeApiKeyInput = document.getElementById("exchangeApiKeyInput");
const saveExchangeKeyBtn = document.getElementById("saveExchangeKeyBtn");
const clearExchangeKeyBtn = document.getElementById("clearExchangeKeyBtn");
const exchangeBaseDate = document.getElementById("exchangeBaseDate");
const exchangeCompareDate = document.getElementById("exchangeCompareDate");
const exchangeAmount = document.getElementById("exchangeAmount");
const exchangeDirection = document.getElementById("exchangeDirection");
const exchangeCurrency = document.getElementById("exchangeCurrency");
const loadExchangeBtn = document.getElementById("loadExchangeBtn");
const exchangeResult = document.getElementById("exchangeResult");
const exchangeTableBody = document.getElementById("exchangeTableBody");
const exchangeRateCards = document.getElementById("exchangeRateCards");

const supportedCurrencies = [
  { code: "USD", name: "미국 달러", label: "달러" },
  { code: "JPY", name: "일본 엔", label: "엔화" },
  { code: "CNH", name: "중국 위안", label: "위안화" },
  { code: "EUR", name: "유로", label: "유로" }
];

let exchangeInitialized = false;
let exchangeCache = {};

function initExchangeApp() {
  if (exchangeInitialized) return;
  exchangeInitialized = true;

  const savedKey = localStorage.getItem(EXCHANGE_KEY_STORAGE) || "";
  exchangeApiKeyInput.value = savedKey;

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  exchangeBaseDate.value = toDateInputValue(today);
  exchangeCompareDate.value = toDateInputValue(yesterday);

  saveExchangeKeyBtn.addEventListener("click", saveExchangeKey);
  clearExchangeKeyBtn.addEventListener("click", clearExchangeKey);
  loadExchangeBtn.addEventListener("click", loadAndRenderExchange);
}

function toDateInputValue(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toApiDate(dateValue) {
  return String(dateValue || "").replaceAll("-", "");
}

function saveExchangeKey() {
  const key = exchangeApiKeyInput.value.trim();
  if (!key) {
    alert("저장할 API KEY를 입력해주세요.");
    return;
  }

  localStorage.setItem(EXCHANGE_KEY_STORAGE, key);
  alert("API KEY가 브라우저에 저장되었습니다.");
}

function clearExchangeKey() {
  localStorage.removeItem(EXCHANGE_KEY_STORAGE);
  exchangeApiKeyInput.value = "";
  alert("저장된 API KEY를 삭제했습니다.");
}

function cleanRateValue(value) {
  if (value == null) return null;
  const cleaned = String(value).replaceAll(",", "").trim();
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : null;
}

function normalizeCurrencyCode(code) {
  if (code === "CNH" || code === "CNY") return "CNH";
  return code;
}

function getCashSellingRate(row) {
  return cleanRateValue(row.deal_bas_r || row.ttb || row.tts || row.bkpr);
}

function toOneUnitKrwRate(row) {
  const rawRate = getCashSellingRate(row);
  if (rawRate == null) return null;

  const code = normalizeCurrencyCode(row.cur_unit);
  if (code === "JPY") {
    return rawRate / 100;
  }

  return rawRate;
}

async function fetchExchangeByDate(apiKey, dateValue) {
  const apiDate = toApiDate(dateValue);
  if (exchangeCache[apiDate]) return exchangeCache[apiDate];

  const url = new URL(EXCHANGE_API_BASE);
  url.search = new URLSearchParams({
    authkey: apiKey,
    searchdate: apiDate,
    data: "AP01"
  });

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("환율 API 요청에 실패했습니다.");
  }

  const data = await response.json();
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(`${dateValue} 환율 데이터가 없습니다.`);
  }

  if (data[0]?.result && data[0].result !== 1) {
    throw new Error(`API 오류 코드: ${data[0].result}`);
  }

  const mapped = {};
  data.forEach(row => {
    const code = normalizeCurrencyCode(row.cur_unit);
    if (["USD", "JPY", "CNH", "EUR"].includes(code)) {
      mapped[code] = {
        code,
        name: row.cur_nm,
        rawUnit: row.cur_unit,
        rawRate: getCashSellingRate(row),
        oneUnitRate: toOneUnitKrwRate(row),
        displayRate: row.deal_bas_r,
        date: dateValue
      };
    }
  });

  exchangeCache[apiDate] = mapped;
  return mapped;
}

async function loadAndRenderExchange() {
  const apiKey = exchangeApiKeyInput.value.trim() || localStorage.getItem(EXCHANGE_KEY_STORAGE);
  const baseDate = exchangeBaseDate.value;
  const compareDate = exchangeCompareDate.value;

  if (!apiKey) {
    alert("한국수출입은행 API KEY를 입력해주세요.");
    return;
  }

  if (!baseDate || !compareDate) {
    alert("기준 날짜와 비교 날짜를 선택해주세요.");
    return;
  }

  localStorage.setItem(EXCHANGE_KEY_STORAGE, apiKey);

  exchangeResult.innerHTML = "환율 데이터를 불러오는 중입니다.";
  exchangeTableBody.innerHTML = `<tr><td colspan="5">환율 데이터를 불러오는 중입니다.</td></tr>`;
  exchangeRateCards.innerHTML = "";

  try {
    const [baseRates, compareRates] = await Promise.all([
      fetchExchangeByDate(apiKey, baseDate),
      fetchExchangeByDate(apiKey, compareDate)
    ]);

    renderExchange(baseRates, compareRates, baseDate, compareDate);
  } catch (error) {
    console.error(error);
    exchangeResult.innerHTML = `환율 데이터를 불러오지 못했습니다.<br><span class="sub-result">${escapeExchangeHtml(error.message)}</span>`;
    exchangeTableBody.innerHTML = `<tr><td colspan="5">API KEY, 날짜, 네트워크 상태를 확인해주세요.</td></tr>`;
  }
}

function renderExchange(baseRates, compareRates, baseDate, compareDate) {
  const amount = Number(exchangeAmount.value || 0);
  const direction = exchangeDirection.value;
  const selectedCode = exchangeCurrency.value;

  const rows = supportedCurrencies.map(currency => {
    const base = baseRates[currency.code];
    const compare = compareRates[currency.code];
    const baseRate = base?.oneUnitRate ?? null;
    const compareRate = compare?.oneUnitRate ?? null;
    const changePercent = baseRate != null && compareRate != null
      ? ((baseRate - compareRate) / compareRate) * 100
      : null;
    const calcResult = calculateExchange(amount, direction, baseRate);

    return {
      ...currency,
      base,
      compare,
      baseRate,
      compareRate,
      changePercent,
      calcResult
    };
  });

  const selectedRow = rows.find(row => row.code === selectedCode);
  renderMainExchangeResult(selectedRow, amount, direction, baseDate, compareDate);
  renderExchangeTable(rows);
  renderExchangeCards(rows);
}

function calculateExchange(amount, direction, rate) {
  if (!Number.isFinite(amount) || amount < 0 || rate == null || rate <= 0) return null;

  if (direction === "KRW_TO_FOREIGN") {
    return amount / rate;
  }

  return amount * rate;
}

function renderMainExchangeResult(row, amount, direction, baseDate, compareDate) {
  if (!row || row.baseRate == null) {
    exchangeResult.innerHTML = "선택한 통화의 기준 날짜 환율을 찾지 못했습니다.";
    return;
  }

  const fromText = direction === "KRW_TO_FOREIGN"
    ? `${formatKrw(amount)}`
    : `${formatForeign(amount, row.code)} ${row.code}`;

  const toText = direction === "KRW_TO_FOREIGN"
    ? `${formatForeign(row.calcResult, row.code)} ${row.code}`
    : `${formatKrw(row.calcResult)}`;

  const change = formatChange(row.changePercent);

  exchangeResult.innerHTML = `
    <div class="sub-result">${baseDate} 기준 · ${row.label}</div>
    <strong>${toText}</strong>
    <div>${fromText} 계산 결과입니다.</div>
    <div class="sub-result">비교 날짜 ${compareDate} 대비 환율 변동: ${change}</div>
  `;
}

function renderExchangeTable(rows) {
  exchangeTableBody.innerHTML = rows.map(row => `
    <tr>
      <td class="table-date">${row.label}<br><span class="sub-result">${row.code}</span></td>
      <td>${formatRate(row.baseRate, row.code)}</td>
      <td>${formatRate(row.compareRate, row.code)}</td>
      <td>${formatChange(row.changePercent)}</td>
      <td>${formatCalculation(row)}</td>
    </tr>
  `).join("");
}

function renderExchangeCards(rows) {
  exchangeRateCards.innerHTML = rows.map(row => `
    <article class="exchange-rate-card">
      <h3>${row.label} ${row.code}</h3>
      <strong>${formatRate(row.baseRate, row.code)}</strong>
      <p>비교 날짜 대비 ${formatChange(row.changePercent)}</p>
      <p>기준 통화명: ${escapeExchangeHtml(row.base?.name || row.name)}</p>
    </article>
  `).join("");
}

function formatCalculation(row) {
  if (row.calcResult == null) return "-";

  if (exchangeDirection.value === "KRW_TO_FOREIGN") {
    return `${formatForeign(row.calcResult, row.code)} ${row.code}`;
  }

  return formatKrw(row.calcResult);
}

function formatRate(rate, code) {
  if (rate == null) return "-";
  return `1 ${code} = ${formatKrw(rate)}`;
}

function formatKrw(value) {
  if (value == null || !Number.isFinite(Number(value))) return "-";
  return `${Number(value).toLocaleString("ko-KR", {
    maximumFractionDigits: 2
  })}원`;
}

function formatForeign(value, code) {
  if (value == null || !Number.isFinite(Number(value))) return "-";
  const fractionDigits = code === "JPY" ? 0 : 2;
  return Number(value).toLocaleString("ko-KR", {
    maximumFractionDigits: fractionDigits
  });
}

function formatChange(percent) {
  if (percent == null || !Number.isFinite(Number(percent))) return "-";

  const rounded = Number(percent).toFixed(2);
  if (percent > 0) return `<span class="rate-up">▲ ${rounded}%</span>`;
  if (percent < 0) return `<span class="rate-down">▼ ${Math.abs(Number(rounded)).toFixed(2)}%</span>`;
  return `<span class="rate-flat">0.00%</span>`;
}

function escapeExchangeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

window.initExchangeApp = initExchangeApp;
