import { useState, useEffect, useRef } from 'react';
import { TextInput, Paper, Group, Text, Box, Stack, Alert, Loader, ActionIcon, Combobox, useCombobox } from '@mantine/core';
import { IconInfoCircle, IconMapPin, IconSearch, IconX } from '@tabler/icons-react';
import 'leaflet/dist/leaflet.css';

// Fix for Leaflet marker icons
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import L from 'leaflet';

// Move API key to environment variable in production
const GEOAPIFY_API_KEY = 'geoapi key';

// Fix Leaflet marker icons
const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});

export function LocationSelector({ onChange }) {
  const [position, setPosition] = useState({ lat: 36.8065, lng: 10.1815 }); // Tunis center
  const [fullAddress, setFullAddress] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isMapLoading, setIsMapLoading] = useState(true);
  const combobox = useCombobox({ opened: searchResults.length > 0 });
  const mapContainerRef = useRef(null);
  const mapInitializedRef = useRef(false);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  // Initialize map
  useEffect(() => {
    if (mapContainerRef.current && !mapInitializedRef.current) {
      mapInitializedRef.current = true;
      
      // Initialize the map
      mapRef.current = L.map(mapContainerRef.current, {
        center: [position.lat, position.lng],
        zoom: 13,
        maxBounds: L.latLngBounds([30.24, 7.52], [37.34, 11.60]), // Tunisia bounds
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapRef.current);

      // Create marker with the fixed icon
      markerRef.current = L.marker([position.lat, position.lng], {
        draggable: true,
        icon: DefaultIcon
      }).addTo(mapRef.current);

      // Handle marker drag
      markerRef.current.on('dragend', (e) => {
        const newPos = e.target.getLatLng();
        setPosition(newPos);
        reverseGeocode(newPos.lat, newPos.lng);
      });

      // Handle map click
      mapRef.current.on('click', (e) => {
        setPosition(e.latlng);
        markerRef.current.setLatLng(e.latlng);
        reverseGeocode(e.latlng.lat, e.latlng.lng);
      });

      setIsMapLoading(false);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        mapInitializedRef.current = false;
      }
    };
  }, []);

  // Update marker position when position changes
  useEffect(() => {
    if (markerRef.current && mapRef.current) {
      markerRef.current.setLatLng([position.lat, position.lng]);
      if (!isMapLoading) {
        mapRef.current.setView([position.lat, position.lng]);
      }
    }
  }, [position, isMapLoading]);

  // Reverse geocode coordinates to address
  const reverseGeocode = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lng}&apiKey=${GEOAPIFY_API_KEY}`
      );
      const data = await response.json();
      if (data.features?.length > 0) {
        const feature = data.features[0];
        updateAddressFromGeocode(feature.properties, { lat, lng });
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
    }
  };

  // Update form and notify parent on address change
  const updateAddressFromGeocode = (address, newPosition) => {
    const displayName = address.formatted || '';
    const addressStr = address.address_line1 || displayName.split(',')[0].trim();
    const locationData = {
      coordinates: newPosition || position,
      locationText: addressStr,
      fullAddress: displayName
    };
    setFullAddress(displayName);
    setSearchQuery(displayName);
    onChange(locationData);
  };

  // Debounced search to avoid excessive API calls
  const debouncedSearch = debounce(async (query) => {
    if (!query) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(query)}&apiKey=${GEOAPIFY_API_KEY}&limit=5&filter=countrycode:tn`
      );
      const data = await response.json();
      setSearchResults(data.features || []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  }, 300);

  // Handle search input changes
  const handleSearchChange = (value) => {
    setSearchQuery(value);
    debouncedSearch(value);
  };

  // Handle selection of a search result
  const handleResultSelect = (result) => {
    const newPosition = {
      lat: result.geometry.coordinates[1],
      lng: result.geometry.coordinates[0]
    };
    setPosition(newPosition);
    setFullAddress(result.properties.formatted);
    setSearchQuery(result.properties.formatted);
    setSearchResults([]);
    onChange({
      coordinates: newPosition,
      locationText: result.properties.address_line1 || result.properties.formatted.split(',')[0].trim(),
      fullAddress: result.properties.formatted
    });
    if (mapRef.current) {
      mapRef.current.flyTo(newPosition, 16);
    }
  };

  // Simple debounce implementation
  function debounce(func, wait) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  return (
    <Stack spacing="md">
      {/* Search input with autocomplete */}
      <Combobox
        store={combobox}
        onOptionSubmit={(value) => {
          const result = searchResults.find(r => r.properties.place_id === value);
          if (result) handleResultSelect(result);
        }}
        zIndex={1000}
        position="bottom-start"
      >
        <Combobox.Target>
          <TextInput
            placeholder="Search the location"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.currentTarget.value)}
            leftSection={<IconSearch size={16} />}
            rightSection={
              isSearching ? (
                <Loader size="xs" />
              ) : searchQuery ? (
                <ActionIcon size="xs" onClick={() => setSearchQuery('')}>
                  <IconX size={16} />
                </ActionIcon>
              ) : null
            }
            radius="md"
          />
        </Combobox.Target>
        <Combobox.Dropdown>
          {searchResults.map(result => (
            <Combobox.Option key={result.properties.place_id} value={result.properties.place_id}>
              <Group spacing="xs">
                <IconMapPin size={16} />
                <Text size="sm">{result.properties.formatted}</Text>
              </Group>
            </Combobox.Option>
          ))}
        </Combobox.Dropdown>
      </Combobox>

      {/* Map display */}
      <Paper shadow="xs" radius="md" p={0} mt="md" style={{ height: 400, overflow: 'hidden', position: 'relative' }}>
        {isMapLoading && (
          <Box
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              zIndex: 1000,
            }}
          >
            <Loader />
          </Box>
        )}
        <div 
          ref={mapContainerRef} 
          style={{ height: '100%', width: '100%' }}
        />
      </Paper>

      {/* Address privacy notice */}
      <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light" radius="md">
        Your complete address won't be published. We'll only share it with the tenant when you confirm a visit.
      </Alert>
      
      {/* Display selected coordinates */}
      {position && (
        <Group spacing="xs" mt="xs">
          <IconMapPin size={16} color="#868e96" />
          <Text size="sm" color="dimmed">Location: {position.lat.toFixed(6)}, {position.lng.toFixed(6)}</Text>
        </Group>
      )}
    </Stack>
  );
}

export default LocationSelector;
