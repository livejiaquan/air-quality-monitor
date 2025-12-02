import { getAQIStatus } from './api.js';

let map = null;
let markersLayer = null;
let lightTileLayer = null;
let darkTileLayer = null;

// Taiwan Center Coordinates
const TAIWAN_CENTER = [23.6978, 120.9605];
const DEFAULT_ZOOM = 8;

/**
 * Initializes the Leaflet map.
 */
export function initMap() {
    map = L.map('map', {
        zoomControl: false, // Move zoom control if needed, or keep default
        attributionControl: false // Custom attribution
    }).setView([23.5, 121], 8); // Center on Taiwan

    // Light Layer (CartoDB Positron)
    lightTileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    });

    // Dark Layer (CartoDB Dark Matter)
    darkTileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    });

    // Add initial layer based on current theme
    if (document.documentElement.classList.contains('dark')) {
        darkTileLayer.addTo(map);
    } else {
        lightTileLayer.addTo(map);
    }

    markersLayer = L.layerGroup().addTo(map);

    L.control.zoom({
        position: 'bottomright'
    }).addTo(map);
}

/**
 * Updates the map markers with new station data.
 * @param {Array} stations - Array of station objects.
 * @param {Function} onMarkerClick - Callback function when a marker is clicked.
 */
export function updateMarkers(stations, onMarkerClick) {
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    stations.forEach(station => {
        if (!station.latitude || !station.longitude) return;

        const status = getAQIStatus(station.aqi);

        // Create custom icon
        const iconHtml = `
            <div class="flex flex-col items-center justify-center">
                <div class="w-8 h-8 rounded-full shadow-md border-2 border-white flex items-center justify-center text-[10px] font-bold text-white ${status.class} ${station.aqi > 100 ? 'animate-pulse' : ''}">
                    ${station.aqi || '-'}
                </div>
            </div>
        `;

        const icon = L.divIcon({
            html: iconHtml,
            className: 'custom-marker',
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });

        const marker = L.marker([station.latitude, station.longitude], { icon: icon });

        marker.on('click', () => {
            // Zoom to station
            map.flyTo([station.latitude, station.longitude], 13);
            // Show details
            if (onMarkerClick) onMarkerClick(station);
        });

        markersLayer.addLayer(marker);
    });
}

/**
 * Zooms the map to a specific county.
 * @param {string} countyName - Name of the county.
 * @param {Array} stations - List of all stations to calculate bounds.
 */
export function flyToCounty(countyName, stations) {
    if (countyName === 'all') {
        map.flyTo(TAIWAN_CENTER, DEFAULT_ZOOM);
        return;
    }

    const countyStations = stations.filter(s => s.county === countyName);
    if (countyStations.length === 0) return;

    const bounds = L.latLngBounds(countyStations.map(s => [s.latitude, s.longitude]));
    map.flyToBounds(bounds, { padding: [50, 50] });
}

/**
 * Locates the user using the browser's geolocation API.
 */
export function locateUser() {
    if (!map) return;

    map.locate({ setView: true, maxZoom: 13 });

    map.on('locationfound', (e) => {
        L.circle(e.latlng, {
            radius: e.accuracy / 2,
            color: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.2
        }).addTo(map);

        L.marker(e.latlng).addTo(map)
            .bindPopup("您目前的位置").openPopup();
    });

    map.on('locationerror', (e) => {
        alert("無法取得您的位置：" + e.message);
    });
}

/**
 * Flies to a specific station.
 * @param {object} station 
 */
export function flyToStation(station) {
    if (!map) return;
    map.flyTo([station.latitude, station.longitude], 14);
}

/**
 * Sets the map theme (light/dark).
 * @param {boolean} isDark 
 */
export function setMapTheme(isDark) {
    if (!map || !lightTileLayer || !darkTileLayer) return;

    if (isDark) {
        map.removeLayer(lightTileLayer);
        darkTileLayer.addTo(map);
    } else {
        map.removeLayer(darkTileLayer);
        lightTileLayer.addTo(map);
    }
}
