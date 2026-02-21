import React, { useState, useEffect, useRef } from 'react';
import { 
  TextInput, 
  Paper, 
  Container,
  Title,
  Group,
  Text
} from '@mantine/core';
import { IconSearch, IconMapPin } from '@tabler/icons-react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function GeocoderControl({ onLocationFound }) {
  const map = useMap();
  const [searchInput, setSearchInput] = useState('');
  
  const handleSearch = async () => {
    if (!searchInput) return;
    
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchInput)}&limit=1`);
      const data = await response.json();
      
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        const position = { lat: parseFloat(lat), lng: parseFloat(lon) };
        map.flyTo(position, 16);
        onLocationFound(position);
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }
  };
  
  return (
    <div className="leaflet-top leaflet-left" style={{ zIndex: 1000, width: '80%', maxWidth: '300px', margin: '10px' }}>
      <div className="leaflet-control">
        <TextInput
          placeholder="Search for a place"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          rightSection={
            <IconSearch 
              size={16} 
              style={{ cursor: 'pointer' }} 
              onClick={handleSearch}
            />
          }
          styles={{
            root: { backgroundColor: 'white', borderRadius: '4px', boxShadow: '0 0 10px rgba(0,0,0,0.2)' }
          }}
        />
      </div>
    </div>
  );
}

function DraggableMarker({ position, setPosition }) {
  const markerRef = useRef(null);
  const map = useMap();
  
  useEffect(() => {
    if (markerRef.current) {
      // This ensures the marker is properly initialized with the current position
      markerRef.current.setLatLng(position);
    }
  }, [position]);

  return (
    <Marker
      draggable={true}
      position={position}
      ref={markerRef}
      eventHandlers={{
        dragend() {
          const marker = markerRef.current;
          if (marker != null) {
            setPosition(marker.getLatLng());
          }
        },
      }}
    />
  );
}

function LocationMap() {
  const [position, setPosition] = useState({ lat: 51.505, lng: -0.09 }); // Default London
  const mapRef = useRef(null);

  const handleMapClick = (e) => {
    setPosition(e.latlng);
  };

  return (
    <Container size="md" py="md">
      <Title order={3} mb="md">Location Finder</Title>
      
      <Paper withBorder radius="md" p="xs">
        <div style={{ height: 500, position: 'relative' }}>
          <MapContainer 
            center={position} 
            zoom={13} 
            style={{ height: '100%', width: '100%' }}
            ref={mapRef}
            onClick={handleMapClick}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <DraggableMarker position={position} setPosition={setPosition} />
            <GeocoderControl onLocationFound={setPosition} />
            {/* Map click handler */}
            {React.createElement(function MapEvents() {
              useMap().on('click', handleMapClick);
              return null;
            })}
          </MapContainer>
        </div>
        <Group position="apart" mt="md">
          <Group spacing="xs">
            <IconMapPin size={16} />
            <Text size="sm">Position: {position.lat.toFixed(6)}, {position.lng.toFixed(6)}</Text>
          </Group>
        </Group>
      </Paper>
    </Container>
  );
}

export default LocationMap;