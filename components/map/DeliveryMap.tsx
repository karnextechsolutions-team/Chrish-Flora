'use client';
// components/map/DeliveryMap.tsx
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Fix default Leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const goldIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const hqIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface Props {
  hqLat: number;
  hqLng: number;
  pin: { lat: number; lng: number } | null;
  onPinDrop: (lat: number, lng: number) => void;
}

function MapClickHandler({ onPinDrop }: { onPinDrop: Props['onPinDrop'] }) {
  useMapEvents({
    click(e) {
      onPinDrop(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function LocateButton({ onPinDrop }: { onPinDrop: Props['onPinDrop'] }) {
  const handleLocate = () => {
    if (!navigator.geolocation) return alert('Geolocation not supported');
    navigator.geolocation.getCurrentPosition(
      pos => onPinDrop(pos.coords.latitude, pos.coords.longitude),
      () => alert('Could not get your location')
    );
  };

  return (
    <div className="leaflet-top leaflet-right" style={{ marginTop: '10px', marginRight: '10px' }}>
      <div className="leaflet-control">
        <button
          onClick={handleLocate}
          className="bg-white border border-gray-300 shadow px-3 py-2 text-xs font-sans text-gray-700 hover:bg-gray-50 flex items-center gap-1"
          style={{ minWidth: '120px' }}
        >
          📍 My Location
        </button>
      </div>
    </div>
  );
}

export default function DeliveryMap({ hqLat, hqLng, pin, onPinDrop }: Props) {
  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={[hqLat, hqLng]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onPinDrop={onPinDrop} />

        {/* HQ marker */}
        <Marker position={[hqLat, hqLng]} icon={hqIcon} />

        {/* Customer pin */}
        {pin && <Marker position={[pin.lat, pin.lng]} icon={goldIcon} />}

        <LocateButton onPinDrop={onPinDrop} />
      </MapContainer>
      <p className="absolute bottom-2 left-2 z-10 bg-white/90 text-xs font-sans text-gray-600 px-2 py-1 shadow">
        🟢 Store &nbsp;|&nbsp; 🟡 Your Location (click to pin)
      </p>
    </div>
  );
}
