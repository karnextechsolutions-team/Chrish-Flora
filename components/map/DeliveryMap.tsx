'use client';
import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

const greenIcon = new L.Icon({
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

// ← THIS component handles map click + GPS
function MapController({
  onPinDrop,
  pin
}: {
  onPinDrop: Props['onPinDrop'];
  pin: Props['pin'];
}) {
  const map = useMap();
  const [locating, setLocating] = useState(false);

  // ← KEY FIX: When pin changes from GPS, pan map to it
  useEffect(() => {
    if (pin) {
      map.setView([pin.lat, pin.lng], 16, { animate: true });
    }
  }, [pin, map]);

  useMapEvents({
    click(e) {
      onPinDrop(e.latlng.lat, e.latlng.lng);
    },
  });

  const handleLocate = () => {
    if (!navigator.geolocation) {
      alert('Geolocation not supported by your browser');
      return;
    }

    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        // This updates parent state AND triggers useEffect above
        onPinDrop(lat, lng);
        setLocating(false);
      },
      (error) => {
        setLocating(false);
        if (error.code === 1) {
          alert('Location permission denied. Please allow location access in browser settings.');
        } else if (error.code === 2) {
          alert('Location unavailable. Please drop a pin manually on the map.');
        } else {
          alert('Location request timed out. Please try again or drop pin manually.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  return (
    <div className="leaflet-top leaflet-right"
      style={{ marginTop: '10px', marginRight: '10px' }}>
      <div className="leaflet-control">
        <button
          onClick={handleLocate}
          disabled={locating}
          style={{
            background: locating ? '#8B6914' : '#C9962A',
            color: 'white',
            border: 'none',
            padding: '8px 14px',
            borderRadius: '10px',
            fontSize: '12px',
            fontWeight: '500',
            cursor: locating ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            minWidth: '130px',
            justifyContent: 'center',
          }}
        >
          {locating ? (
            <>
              <span style={{
                width: '12px', height: '12px',
                border: '2px solid rgba(255,255,255,0.3)',
                borderTop: '2px solid white',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                display: 'inline-block',
              }} />
              Locating...
            </>
          ) : (
            <>📍 My Location</>
          )}
        </button>
      </div>
    </div>
  );
}

export default function DeliveryMap({ hqLat, hqLng, pin, onPinDrop }: Props) {
  return (
    <div className="relative h-full w-full">
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <MapContainer
        center={[hqLat, hqLng]}
        zoom={14}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* MapController handles clicks + GPS + map panning */}
        <MapController onPinDrop={onPinDrop} pin={pin} />

        {/* Store HQ marker */}
        <Marker position={[hqLat, hqLng]} icon={greenIcon} />

        {/* Customer pin - re-renders when lat/lng changes */}
        {pin && (
          <Marker
            key={`${pin.lat}-${pin.lng}`}
            position={[pin.lat, pin.lng]}
            icon={goldIcon}
          />
        )}
      </MapContainer>

      <p className="absolute bottom-2 left-2 z-10 
        bg-white/90 text-xs font-sans text-gray-600 
        px-2 py-1 shadow rounded">
        🟢 Store &nbsp;|&nbsp; 🟡 Your Location (click to pin)
      </p>
    </div>
  );
}