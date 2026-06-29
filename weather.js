const WEATHER_REFRESH_MS = 5 * 60 * 1000;

const seoulDistricts = [
  { name: "종로구", lat: 37.5735, lon: 126.9788, x: 455, y: 205 },
  { name: "중구", lat: 37.5636, lon: 126.9976, x: 480, y: 250 },
  { name: "용산구", lat: 37.5326, lon: 126.9905, x: 470, y: 330 },
  { name: "성동구", lat: 37.5634, lon: 127.0369, x: 565, y: 275 },
  { name: "광진구", lat: 37.5384, lon: 127.0823, x: 665, y: 320 },
  { name: "동대문구", lat: 37.5744, lon: 127.0396, x: 570, y: 205 },
  { name: "중랑구", lat: 37.6063, lon: 127.0925, x: 675, y: 155 },
  { name: "성북구", lat: 37.5894, lon: 127.0167, x: 520, y: 145 },
  { name: "강북구", lat: 37.6396, lon: 127.0257, x: 525, y: 80 },
  { name: "도봉구", lat: 37.6688, lon: 127.0471, x: 585, y: 55 },
  { name: "노원구", lat: 37.6542, lon: 127.0568, x: 660, y: 85 },
  { name: "은평구", lat: 37.6027, lon: 126.9291, x: 315, y: 150 },
  { name: "서대문구", lat: 37.5791, lon: 126.9368, x: 365, y: 215 },
  { name: "마포구", lat: 37.5663, lon: 126.9019, x: 285, y: 285 },
  { name: "양천구", lat: 37.5169, lon: 126.8664, x: 180, y: 390 },
  { name: "강서구", lat: 37.5509, lon: 126.8495, x: 115, y: 310 },
  { name: "구로구", lat: 37.4955, lon: 126.8874, x: 245, y: 455 },
  { name: "금천구", lat: 37.4569, lon: 126.8955, x: 290, y: 510 },
  { name: "영등포구", lat: 37.5264, lon: 126.8963, x: 310, y: 380 },
  { name: "동작구", lat: 37.5124, lon: 126.9393, x: 405, y: 425 },
  { name: "관악구", lat: 37.4784, lon: 126.9516, x: 420, y: 500 },
  { name: "서초구", lat: 37.4837, lon: 127.0324, x: 555, y: 485 },
  { name: "강남구", lat: 37.5172, lon: 127.0473, x: 610, y: 420 },
  { name: "송파구", lat: 37.5145, lon: 127.1059, x: 730, y: 420 },
  { name: "강동구", lat: 37.5301, lon: 127.1238, x: 795, y: 350 }
];

const weatherState = {
  rows: [],
  selectedName: null,
  loading: false
};

const districtMarkers = document.getElementById("districtMarkers");
const weatherTableBody = document.getElementById("weatherTableBody");
const weatherUpdatedAt = document.getElementById("weatherUpdatedAt");
const selectedDistrictName = document.getElementById("selectedDistrictName");
const selectedDistrictDetail = document.getElementById("selectedDistrictDetail");
const avgTemp = document.getElementById("avgTemp");
const avgPm25 = document.getElementById("avgPm25");
const avgPm10 = document.getElementById("avgPm10");
const refreshWeatherBtn = document.getElementById("refreshWeatherBtn");

function weatherCodeText(code) {
  const map = {
    0: "맑음",
    1: "대체로 맑음",
    2: "부분 흐림",
    3: "흐림",
    45: "안개",
    48: "서리 안개",
    51: "약한 이슬비",
    53: "이슬비",
    55: "강한 이슬비",
    61: "약한 비",
    63: "비",
    65: "강한 비",
    71: "약한 눈",
    73: "눈",
    75: "강한 눈",
    80: "약한 소나기",
    81: "소나기",
    82: "강한 소나기",
    95: "뇌우"
  };
  return map[code] || "날씨 정보";
}

function airGrade(pm25, pm10) {
  if (pm25 == null || pm10 == null) return { label: "확인중", className: "air-loading" };

  if (pm25 <= 15 && pm10 <= 30) return { label: "좋음", className: "air-good" };
  if (pm25 <= 35 && pm10 <= 80) return { label: "보통", className: "air-normal" };
  if (pm25 <= 75 && pm10 <= 150) return { label: "나쁨", className: "air-bad" };
  return { label: "매우나쁨", className: "air-very-bad" };
}

function currentHourIndex(hourlyTimes) {
  if (!hourlyTimes || hourlyTimes.length === 0) return 0;

  const now = new Date();
  let bestIndex = 0;
  let bestDiff = Infinity;

  hourlyTimes.forEach((time, index) => {
    const diff = Math.abs(new Date(time).getTime() - now.getTime());
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIndex = index;
    }
  });

  return bestIndex;
}

async function fetchDistrictWeather(district) {
  const forecastUrl = new URL("https://api.open-meteo.com/v1/forecast");
  forecastUrl.search = new URLSearchParams({
    latitude: district.lat,
    longitude: district.lon,
    current: "temperature_2m,weather_code",
    timezone: "Asia/Seoul"
  });

  const airUrl = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
  airUrl.search = new URLSearchParams({
    latitude: district.lat,
    longitude: district.lon,
    hourly: "pm10,pm2_5",
    timezone: "Asia/Seoul"
  });

  const [forecastResponse, airResponse] = await Promise.all([
    fetch(forecastUrl),
    fetch(airUrl)
  ]);

  if (!forecastResponse.ok || !airResponse.ok) {
    throw new Error(`${district.name} 데이터 요청 실패`);
  }

  const forecast = await forecastResponse.json();
  const air = await airResponse.json();
  const index = currentHourIndex(air.hourly?.time);

  const temp = forecast.current?.temperature_2m ?? null;
  const code = forecast.current?.weather_code ?? null;
  const pm25 = air.hourly?.pm2_5?.[index] ?? null;
  const pm10 = air.hourly?.pm10?.[index] ?? null;
  const grade = airGrade(pm25, pm10);

  return {
    ...district,
    temp,
    weatherCode: code,
    weatherText: weatherCodeText(code),
    pm25,
    pm10,
    gradeLabel: grade.label,
    gradeClass: grade.className,
    measuredAt: forecast.current?.time || air.hourly?.time?.[index] || ""
  };
}

function renderWeatherSkeleton() {
  districtMarkers.innerHTML = "";
  seoulDistricts.forEach(district => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.classList.add("district-marker", "air-loading");
    g.setAttribute("transform", `translate(${district.x}, ${district.y})`);
    g.innerHTML = `
      <circle r="38"></circle>
      <text y="-5">${district.name}</text>
      <text class="metric" y="13">로딩중</text>
    `;
    districtMarkers.appendChild(g);
  });

  weatherTableBody.innerHTML = `<tr><td colspan="5">서울시 날씨와 미세먼지 데이터를 불러오는 중입니다.</td></tr>`;
}

function renderWeather() {
  const rows = weatherState.rows;

  districtMarkers.innerHTML = "";
  rows.forEach(row => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.classList.add("district-marker", row.gradeClass);
    if (weatherState.selectedName === row.name) g.classList.add("selected");
    g.setAttribute("transform", `translate(${row.x}, ${row.y})`);
    g.setAttribute("tabindex", "0");
    g.setAttribute("role", "button");
    g.setAttribute("aria-label", `${row.name} ${row.temp ?? "-"}도, 미세먼지 ${row.gradeLabel}`);
    g.innerHTML = `
      <circle r="38"></circle>
      <text y="-9">${row.name}</text>
      <text class="metric" y="9">${formatValue(row.temp, "°C")}</text>
      <text class="metric" y="25">${row.gradeLabel}</text>
    `;
    g.addEventListener("click", () => selectDistrict(row.name));
    g.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") selectDistrict(row.name);
    });
    districtMarkers.appendChild(g);
  });

  weatherTableBody.innerHTML = rows.map(row => `
    <tr data-district="${row.name}">
      <td class="table-date">${row.name}</td>
      <td>${formatValue(row.temp, "°C")}</td>
      <td>${row.weatherText}</td>
      <td>${formatValue(row.pm25, "㎍/㎥")}</td>
      <td>${formatValue(row.pm10, "㎍/㎥")}</td>
    </tr>
  `).join("");

  weatherTableBody.querySelectorAll("tr").forEach(row => {
    row.addEventListener("click", () => selectDistrict(row.dataset.district));
  });

  const numericTemps = rows.map(row => row.temp).filter(value => value != null);
  const numericPm25 = rows.map(row => row.pm25).filter(value => value != null);
  const numericPm10 = rows.map(row => row.pm10).filter(value => value != null);

  avgTemp.textContent = numericTemps.length ? `${average(numericTemps).toFixed(1)}°` : "-";
  avgPm25.textContent = numericPm25.length ? average(numericPm25).toFixed(1) : "-";
  avgPm10.textContent = numericPm10.length ? average(numericPm10).toFixed(1) : "-";

  const updated = new Date();
  weatherUpdatedAt.textContent = `마지막 갱신: ${updated.toLocaleString("ko-KR")} · 5분마다 자동 갱신`;

  if (weatherState.selectedName) {
    selectDistrict(weatherState.selectedName, false);
  } else if (rows[0]) {
    selectDistrict(rows[0].name, false);
  }
}

function selectDistrict(name, rerender = true) {
  const row = weatherState.rows.find(item => item.name === name);
  if (!row) return;

  weatherState.selectedName = name;
  selectedDistrictName.textContent = row.name;
  selectedDistrictDetail.innerHTML = `
    <strong>${formatValue(row.temp, "°C")}</strong>
    <div>${row.weatherText}</div>
    <div>
      <span class="weather-badge">PM2.5 ${formatValue(row.pm25, "㎍/㎥")}</span>
      <span class="weather-badge">PM10 ${formatValue(row.pm10, "㎍/㎥")}</span>
      <span class="weather-badge">미세먼지 ${row.gradeLabel}</span>
    </div>
    <div class="hint">측정 기준 시각: ${row.measuredAt || "확인중"}</div>
  `;

  if (rerender) renderWeather();
}

function formatValue(value, unit) {
  if (value == null || Number.isNaN(Number(value))) return "-";
  return `${Number(value).toFixed(1)}${unit}`;
}

function average(values) {
  return values.reduce((sum, value) => sum + Number(value), 0) / values.length;
}

async function loadSeoulWeather(force = false) {
  if (weatherState.loading && !force) return;

  weatherState.loading = true;
  weatherUpdatedAt.textContent = "데이터를 갱신하는 중입니다.";
  renderWeatherSkeleton();

  try {
    const rows = await Promise.all(seoulDistricts.map(fetchDistrictWeather));
    weatherState.rows = rows;
    renderWeather();
  } catch (error) {
    console.error(error);
    weatherUpdatedAt.textContent = "데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.";
    weatherTableBody.innerHTML = `<tr><td colspan="5">Open-Meteo API 요청 중 오류가 발생했습니다.</td></tr>`;
  } finally {
    weatherState.loading = false;
  }
}

refreshWeatherBtn.addEventListener("click", () => loadSeoulWeather(true));
window.loadSeoulWeather = loadSeoulWeather;

renderWeatherSkeleton();
setInterval(() => loadSeoulWeather(true), WEATHER_REFRESH_MS);
