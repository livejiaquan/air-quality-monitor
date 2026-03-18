import { initMap, updateMarkers, locateUser } from './map.js';
import { fetchAQIData } from './api.js';
import { populateCountyDropdown, setupUIListeners, showLoading, updateInfoBar, updateDashboard, initTheme, showStationDetails } from './ui.js';

async function initApp() {
    initTheme(); // Init theme before map to set correct tiles
    initMap();
    showLoading(true);

    // Safety timeout to remove loading overlay if something hangs
    setTimeout(() => showLoading(false), 12000);

    try {
        const stations = await fetchAQIData();

        if (stations && stations.length > 0) {
            updateMarkers(stations, showStationDetails);
            populateCountyDropdown(stations);
            updateDashboard(stations); // Init Dashboard
            setupUIListeners(stations);

            // Update info bar
            const lastUpdate = stations[0].publishtime;
            updateInfoBar(lastUpdate, stations.length);
        }
    } catch (error) {
        console.error('Failed to initialize app:', error);
        alert('無法取得空氣品質資料，請稍後再試。');
    } finally {
        showLoading(false);
    }

    // Refresh button listener
    document.getElementById('refresh-btn').addEventListener('click', async () => {
        showLoading(true);
        try {
            const stations = await fetchAQIData();
            updateMarkers(stations, showStationDetails);
            updateDashboard(stations); // Update Dashboard
            const lastUpdate = stations[0].publishtime;
            updateInfoBar(lastUpdate, stations.length);
        } catch (error) {
            alert('重新整理失敗');
        } finally {
            showLoading(false);
        }
    });

    // Geolocation button listener
    document.getElementById('locate-btn').addEventListener('click', () => {
        locateUser();
    });
}

// Start the app
document.addEventListener('DOMContentLoaded', initApp);
