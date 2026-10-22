import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './air-map.css';
import { useEffect, useRef } from 'react';
import type { AqiStationRecord } from '../lib/aqi';
import { AQI_SWATCHES } from '../lib/palette';

type AirMapProps = {
  stations: AqiStationRecord[];
  selectedId: string | null;
  canShowCurrent: boolean;
  onSelect: (station: AqiStationRecord) => void;
};

// Main island + Penghu; Kinmen and Matsu stay reachable by panning or via the list.
const TAIWAN_BOUNDS = L.latLngBounds([21.85, 119.4], [25.35, 122.05]);
// Standard OSM tiles need no key; index.css mutes them (and inverts them in dark mode).
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const COMPACT_BELOW_ZOOM = 8.5;

export function AirMap({ stations, selectedId, canShowCurrent, onSelect }: AirMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      zoomSnap: 0.25,
      minZoom: 6,
      maxZoom: 13,
      scrollWheelZoom: false,
      attributionControl: true
    });
    map.fitBounds(TAIWAN_BOUNDS, { padding: [8, 8] });
    map.attributionControl.setPrefix(false);
    L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(map);
    const syncDensity = () => containerRef.current?.classList.toggle('is-compact', map.getZoom() < COMPACT_BELOW_ZOOM);
    map.on('zoomend', syncDensity);
    syncDensity();
    markersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    const resize = new ResizeObserver(() => map.invalidateSize());
    resize.observe(containerRef.current);
    return () => {
      resize.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const layer = markersRef.current;
    if (!layer) return;
    layer.clearLayers();
    // Draw low values first so higher-AQI pins sit on top where they overlap.
    const ordered = [...stations].sort((a, b) => {
      if (a.siteId === selectedId) return 1;
      if (b.siteId === selectedId) return -1;
      return a.aqi - b.aqi;
    });
    for (const station of ordered) {
      if (typeof station.latitude !== 'number' || typeof station.longitude !== 'number') continue;
      const live = canShowCurrent && !station.isStale;
      const swatch = AQI_SWATCHES[live ? station.categoryId : 'unknown'];
      const classes = ['aqi-pin', live ? '' : 'is-stale', station.siteId === selectedId ? 'is-selected' : ''].filter(Boolean).join(' ');
      const icon = L.divIcon({
        className: 'aqi-pin-icon',
        iconSize: [0, 0],
        html: `<span class="${classes}" style="--fill:${swatch.fill};--ink:${swatch.ink}">${station.aqi}</span>`
      });
      const statusText = live ? station.category.label : '資料過期';
      L.marker([station.latitude, station.longitude], {
        icon,
        keyboard: true,
        title: `${station.county} ${station.stationName}：AQI ${station.aqi}（${statusText}）`,
        alt: `${station.stationName} AQI ${station.aqi}`,
        riseOnHover: true,
        zIndexOffset: station.siteId === selectedId ? 1000 : 0
      })
        .on('click', () => onSelectRef.current(station))
        .addTo(layer);
    }
  }, [stations, selectedId, canShowCurrent]);

  useEffect(() => {
    const map = mapRef.current;
    const station = stations.find((item) => item.siteId === selectedId);
    if (!map || !station || typeof station.latitude !== 'number' || typeof station.longitude !== 'number') return;
    const point = L.latLng(station.latitude, station.longitude);
    if (!map.getBounds().pad(-0.15).contains(point)) map.panTo(point, { animate: true });
  }, [selectedId, stations]);

  return <div ref={containerRef} className="h-full w-full" role="region" aria-label="全台測站 AQI 地圖；可用下方列表瀏覽相同資料" />;
}
