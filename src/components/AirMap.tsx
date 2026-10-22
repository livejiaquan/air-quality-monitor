import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './air-map.css';
import { useCallback, useEffect, useRef } from 'react';
import type { AqiStationRecord } from '../lib/aqi';
import { AQI_SWATCHES } from '../lib/palette';
import { selectVisiblePins } from '../lib/pinLayout';

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

// Pin footprints (px) used for collision avoidance; match .aqi-pin in air-map.css.
const PIN_BOX = { width: 36, height: 24, gap: 4 };
const COMPACT_PIN_BOX = { width: 32, height: 20, gap: 4 };

type MarkerState = Pick<AirMapProps, 'stations' | 'selectedId' | 'canShowCurrent'>;

export function AirMap({ stations, selectedId, canShowCurrent, onSelect }: AirMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const stateRef = useRef<MarkerState>({ stations, selectedId, canShowCurrent });
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  const drawMarkers = useCallback(() => {
    const map = mapRef.current;
    const layer = markersRef.current;
    if (!map || !layer) return;
    const { stations, selectedId, canShowCurrent } = stateRef.current;
    const compact = map.getZoom() < COMPACT_BELOW_ZOOM;
    containerRef.current?.classList.toggle('is-compact', compact);

    const placed = stations.flatMap((station) => {
      if (typeof station.latitude !== 'number' || typeof station.longitude !== 'number') return [];
      const live = canShowCurrent && !station.isStale;
      const point = map.latLngToContainerPoint([station.latitude, station.longitude]);
      // Selected first, then current data, then the worst air: the riskiest numbers stay readable.
      const priority = (station.siteId === selectedId ? 10_000 : 0) + (live ? 1_000 : 0) + station.aqi;
      return [{ station, live, point, priority }];
    });
    const visible = selectVisiblePins(
      placed.map(({ station, point, priority }) => ({ id: station.siteId, x: point.x, y: point.y, priority })),
      compact ? COMPACT_PIN_BOX : PIN_BOX
    );

    layer.clearLayers();
    for (const { station, live, priority } of placed) {
      const swatch = AQI_SWATCHES[live ? station.categoryId : 'unknown'];
      const asPin = visible.has(station.siteId);
      const classes = [asPin ? 'aqi-pin' : 'aqi-dot', live ? '' : 'is-stale', station.siteId === selectedId ? 'is-selected' : '']
        .filter(Boolean)
        .join(' ');
      const icon = L.divIcon({
        className: 'aqi-pin-icon',
        iconSize: [0, 0],
        html: `<span class="${classes}" style="--fill:${swatch.fill};--ink:${swatch.ink}">${asPin ? station.aqi : ''}</span>`
      });
      const statusText = live ? station.category.label : '資料過期';
      L.marker([station.latitude!, station.longitude!], {
        icon,
        keyboard: true,
        title: `${station.county} ${station.stationName}：AQI ${station.aqi}（${statusText}）`,
        alt: `${station.stationName} AQI ${station.aqi}`,
        riseOnHover: true,
        // Number pins always stack above dots, whatever their priority.
        zIndexOffset: (asPin ? 20_000 : 0) + priority
      })
        .on('click', () => onSelectRef.current(station))
        .addTo(layer);
    }
  }, []);

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
    markersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    // Pixel distances only change with zoom (and container size), not with panning.
    map.on('zoomend', drawMarkers);

    const resize = new ResizeObserver(() => {
      map.invalidateSize();
      drawMarkers();
    });
    resize.observe(containerRef.current);
    return () => {
      resize.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [drawMarkers]);

  useEffect(() => {
    stateRef.current = { stations, selectedId, canShowCurrent };
    drawMarkers();
  }, [stations, selectedId, canShowCurrent, drawMarkers]);

  // Pan only when the visitor changes station, so the first view always shows all of Taiwan.
  const lastPannedIdRef = useRef(selectedId);
  useEffect(() => {
    if (lastPannedIdRef.current === selectedId) return;
    lastPannedIdRef.current = selectedId;
    const map = mapRef.current;
    const station = stations.find((item) => item.siteId === selectedId);
    if (!map || !station || typeof station.latitude !== 'number' || typeof station.longitude !== 'number') return;
    const point = L.latLng(station.latitude, station.longitude);
    if (!map.getBounds().pad(-0.15).contains(point)) map.panTo(point, { animate: true });
  }, [selectedId, stations]);

  return <div ref={containerRef} className="h-full w-full" role="region" aria-label="全台測站 AQI 地圖；可用下方列表瀏覽相同資料" />;
}
