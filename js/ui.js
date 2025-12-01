import { getAQIStatus, getHealthAdvice } from './api.js';
import { flyToCounty, setMapTheme, flyToStation } from './map.js';
import { renderPollutantChart } from './charts.js';

let allStationsData = [];

/**
 * Populates the county dropdown.
 * @param {Array} stations - List of stations.
 */
export function populateCountyDropdown(stations) {
    const countySelect = document.getElementById('county-select');
    const counties = [...new Set(stations.map(s => s.county))];

    // Sort counties roughly North to South or alphabetically? 
    // Let's stick to the order they appear or simple sort.
    // Custom order for Taiwan counties usually: North -> South -> East -> Islands
    const countyOrder = [
        "基隆市", "臺北市", "新北市", "桃園市", "新竹市", "新竹縣", "苗栗縣",
        "臺中市", "彰化縣", "南投縣", "雲林縣", "嘉義市", "嘉義縣", "臺南市", "高雄市", "屏東縣",
        "宜蘭縣", "花蓮縣", "臺東縣", "澎湖縣", "金門縣", "連江縣"
    ];

    counties.sort((a, b) => {
        const indexA = countyOrder.indexOf(a);
        const indexB = countyOrder.indexOf(b);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        return a.localeCompare(b);
    });

    // Clear existing options except the first one
    while (countySelect.options.length > 1) {
        countySelect.remove(1);
    }

    counties.forEach(county => {
        const option = document.createElement('option');
        option.value = county;
        option.textContent = county;
        countySelect.appendChild(option);
    });
}

/**
 * Updates the Dashboard with station statistics.
 * @param {Array} stations 
 */
export function updateDashboard(stations) {
    const dashboard = document.getElementById('dashboard');
    const counts = {
        good: 0,
        moderate: 0,
        unhealthy: 0, // Simplified for dashboard: Sensitive + Unhealthy + Very Unhealthy + Hazardous
        total: 0
    };

    stations.forEach(s => {
        const aqi = parseInt(s.aqi);
        if (isNaN(aqi)) return;

        counts.total++;
        if (aqi <= 50) counts.good++;
        else if (aqi <= 100) counts.moderate++;
        else counts.unhealthy++;
    });

    dashboard.innerHTML = `
        <div class="flex items-center gap-1.5 px-2 py-1 bg-green-50 rounded-lg border border-green-100">
            <span class="w-2 h-2 rounded-full bg-[#009866]"></span>
            <span class="text-xs font-bold text-gray-700">良好 ${counts.good}</span>
        </div>
        <div class="flex items-center gap-1.5 px-2 py-1 bg-yellow-50 rounded-lg border border-yellow-100">
            <span class="w-2 h-2 rounded-full bg-[#FFDE33]"></span>
            <span class="text-xs font-bold text-gray-700">普通 ${counts.moderate}</span>
        </div>
        <div class="flex items-center gap-1.5 px-2 py-1 bg-red-50 rounded-lg border border-red-100">
            <span class="w-2 h-2 rounded-full bg-[#CC0033]"></span>
            <span class="text-xs font-bold text-gray-700">不佳 ${counts.unhealthy}</span>
        </div>
    `;
}

/**
 * Renders the station list in the sidebar.
 * @param {Array} stations 
 */
export function renderStationList(stations) {
    const container = document.getElementById('station-list-container');
    container.innerHTML = '';

    stations.forEach(station => {
        const status = getAQIStatus(station.aqi);
        const item = document.createElement('div');
        item.className = 'p-3 bg-white dark:bg-gray-700 rounded-xl border border-gray-100 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-500 cursor-pointer transition-all flex justify-between items-center group';
        item.innerHTML = `
            <div>
                <div class="text-sm font-bold text-gray-800 dark:text-white group-hover:text-blue-500 transition-colors">${station.sitename}</div>
                <div class="text-xs text-gray-500 dark:text-gray-400">${station.county}</div>
            </div>
            <div class="flex items-center gap-2">
                <span class="text-sm font-bold text-gray-700 dark:text-gray-200">${station.aqi}</span>
                <span class="w-3 h-3 rounded-full" style="background-color: ${status.hex}"></span>
            </div>
        `;
        item.addEventListener('click', () => {
            flyToStation(station);
            showStationDetails(station);
            closeStationList(); // Close list on selection (mobile friendly)
        });
        container.appendChild(item);
    });
}

/**
 * Filters the station list based on search input.
 * @param {string} query 
 */
function filterStationList(query) {
    const lowerQuery = query.toLowerCase();
    const filtered = allStationsData.filter(s =>
        s.sitename.toLowerCase().includes(lowerQuery) ||
        s.county.toLowerCase().includes(lowerQuery)
    );
    renderStationList(filtered);
}

function openStationList() {
    document.getElementById('station-list-sidebar').classList.remove('-translate-x-full');
}

function closeStationList() {
    document.getElementById('station-list-sidebar').classList.add('-translate-x-full');
}

/**
 * Toggles Dark Mode.
 */
function toggleDarkMode() {
    const html = document.documentElement;
    const isDark = html.classList.toggle('dark');

    // Save preference
    localStorage.setItem('theme', isDark ? 'dark' : 'light');

    // Update Map
    setMapTheme(isDark);
}

/**
 * Initializes the theme based on saved preference or system default.
 */
export function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'dark' || (!savedTheme && systemDark)) {
        document.documentElement.classList.add('dark');
        setMapTheme(true);
    } else {
        document.documentElement.classList.remove('dark');
        setMapTheme(false);
    }
}

/**
 * Sets up event listeners for UI elements.
 * @param {Array} stations - The station data.
 */
export function setupUIListeners(stations) {
    allStationsData = stations;
    renderStationList(stations); // Initial render

    const countySelect = document.getElementById('county-select');

    countySelect.addEventListener('change', (e) => {
        flyToCounty(e.target.value, allStationsData);
    });

    document.getElementById('close-panel-btn').addEventListener('click', closeDetailsPanel);

    // Theme Toggle
    document.getElementById('theme-toggle-btn').addEventListener('click', toggleDarkMode);

    // Station List
    document.getElementById('list-btn').addEventListener('click', openStationList);
    document.getElementById('close-list-btn').addEventListener('click', closeStationList);
    document.getElementById('station-search').addEventListener('input', (e) => {
        filterStationList(e.target.value);
    });

    // Pollutant Info Tooltips
    document.querySelectorAll('.info-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent bubbling
            const pollutant = btn.dataset.pollutant;
            showPollutantInfo(pollutant);
        });
    });
    // Geolocation is handled in main.js or map.js, but button is UI
}

/**
 * Shows information about a pollutant.
 * @param {string} type 
 */
function showPollutantInfo(type) {
    const info = {
        'pm2.5': '細懸浮微粒 (PM2.5)\n\n來源：汽機車廢氣、工廠排放、境外傳輸。\n影響：可深入肺泡，進入血液循環，影響呼吸與心血管系統。',
        'pm10': '懸浮微粒 (PM10)\n\n來源：道路揚塵、營建施工、工業排放。\n影響：可附著於呼吸道黏膜，引起發炎反應。',
        'o3': '臭氧 (O3)\n\n來源：氮氧化物與揮發性有機物在陽光下光化學反應生成。\n影響：刺激呼吸道，引起咳嗽、氣喘。',
        'co': '一氧化碳 (CO)\n\n來源：汽機車排放、燃燒不完全。\n影響：降低血液攜氧能力，引起頭暈、疲勞。',
        'so2': '二氧化硫 (SO2)\n\n來源：燃燒煤炭、石油。\n影響：刺激呼吸道，加重氣喘。',
        'no2': '二氧化氮 (NO2)\n\n來源：高溫燃燒過程（如車輛引擎、電廠）。\n影響：刺激呼吸道，降低肺功能。',
        'main': '主要污染物\n\n當下造成空氣品質指標 (AQI) 數值最高的污染物項目。'
    };

    const text = info[type] || '暫無資訊';
    alert(text); // Simple alert for now, can be upgraded to modal
}
/**
 * Shows the loading overlay.
 * @param {boolean} show 
 */
export function showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (show) {
        overlay.classList.remove('opacity-0', 'pointer-events-none');
    } else {
        overlay.classList.add('opacity-0', 'pointer-events-none');
    }
}

/**
 * Updates the last update time and station count.
 * @param {string} time 
 * @param {number} count 
 */
export function updateInfoBar(time, count) {
    document.getElementById('last-update').textContent = `更新時間: ${time}`;
    document.getElementById('station-count').textContent = `測站數: ${count}`;
}

/**
 * Displays station details in the panel.
 * @param {object} station 
 */
export function showStationDetails(station) {
    const panel = document.getElementById('details-panel');
    const status = getAQIStatus(station.aqi);
    const advice = getHealthAdvice(station.aqi);

    // Update Content
    document.getElementById('panel-station-name').textContent = `${station.county} - ${station.sitename}`;
    document.getElementById('panel-aqi-value').textContent = station.aqi || '-';
    document.getElementById('panel-status-text').textContent = status.status;
    document.getElementById('panel-status-text').style.color = status.hex;

    // Update Badge Color
    const badge = document.getElementById('panel-aqi-badge');
    badge.style.backgroundColor = status.hex;
    badge.style.color = (station.aqi > 100) ? '#fff' : '#333';

    // Weather
    document.getElementById('panel-wind-speed').textContent = station.wind_speed ? `${station.wind_speed} m/s` : '-';
    document.getElementById('panel-wind-dir').textContent = station.wind_direc ? `${station.wind_direc}°` : '-';

    document.getElementById('panel-pm25').textContent = station['pm2.5'] || '-';
    document.getElementById('panel-pm10').textContent = station.pm10 || '-';
    document.getElementById('panel-pollutant').textContent = station.pollutant || '無';
    document.getElementById('panel-advice').textContent = advice;

    // Render Chart
    renderPollutantChart(station);

    // Show Panel
    panel.classList.remove('translate-y-full', 'translate-x-[120%]');

    // Check screen size to apply correct transform class
    if (window.innerWidth >= 768) {
        panel.classList.add('panel-visible-desktop');
    } else {
        panel.classList.add('panel-visible-mobile');
    }
}

export function closeDetailsPanel() {
    const panel = document.getElementById('details-panel');
    panel.classList.remove('panel-visible-desktop', 'panel-visible-mobile');
    panel.classList.add('translate-y-full', 'md:translate-x-[120%]'); // Reset to hidden state classes
}
