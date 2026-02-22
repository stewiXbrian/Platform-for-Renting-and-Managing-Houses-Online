import React, { useState, useRef, useEffect } from 'react';
import { TextInput, Box, Text, ActionIcon, rem } from '@mantine/core';
import { IconSearch, IconMapPin, IconX } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

// Move API key to environment variable in production
const GEOAPIFY_API_KEY = 'geoapi key';

// Recognized cities in Tunisia that map to our data structure
const RECOGNIZED_CITIES = ["tunis", "sousse", "monastir"];

const tunisiaGovernorates = [
  "Ariana", "Béja", "Ben Arous", "Bizerte", "Gabès", "Gafsa", "Jendouba",
  "Kairouan", "Kasserine", "Kébili", "Kef", "Mahdia", "Manouba", "Médenine",
  "Monastir", "Nabeul", "Sfax", "Sidi Bouzid", "Siliana", "Sousse",
  "Tataouine", "Tozeur", "Tunis", "Zaghouan"
];

const LocationSearchInput = ({ onLocationSelect }) => {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const debounceTimeout = useRef(null);
  const shouldFocus = useRef(false);

  useEffect(() => {
    if (shouldFocus.current && inputRef.current) {
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          const length = inputRef.current.value.length;
          inputRef.current.setSelectionRange(length, length);
        }
        shouldFocus.current = false;
      }, 50);
    }
  }, [isDropdownOpen, suggestions]);

  // Enhanced function to extract governorate from API response
  const extractGovernorateFromProperties = (properties) => {
    // Check different property fields for governorate information
    const possibleFields = [
      properties.state,        // Often contains governorate
      properties.county,       // Sometimes contains governorate
      properties.region,       // Alternative field
      properties.administrative_area_level_1,
      properties.city         // Fallback
    ];

    // First, try to find a direct match with our governorate list
    for (const field of possibleFields) {
      if (field) {
        const fieldLower = field.toLowerCase();
        for (const governorate of tunisiaGovernorates) {
          if (fieldLower.includes(governorate.toLowerCase()) || 
              governorate.toLowerCase().includes(fieldLower)) {
            return governorate;
          }
        }
      }
    }

    // If no direct match, parse the formatted address
    if (properties.formatted) {
      const parts = properties.formatted.split(',').map(part => part.trim());
      // Usually governorate is the second-to-last part before "Tunisia"
      for (let i = parts.length - 2; i >= 0; i--) {
        const part = parts[i];
        for (const governorate of tunisiaGovernorates) {
          if (part.toLowerCase().includes(governorate.toLowerCase()) || 
              governorate.toLowerCase().includes(part.toLowerCase())) {
            return governorate;
          }
        }
      }
    }

    // Fallback to the original city extraction
    return properties.city || properties.county || properties.state || properties.formatted;
  };

  const fetchSuggestions = async (query) => {
    if (query.length < 3) {
      setSuggestions([]);
      setIsDropdownOpen(false);
      return;
    }

    try {
      const response = await fetch(
        `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(query)}&apiKey=${GEOAPIFY_API_KEY}&limit=5&filter=countrycode:tn`
      );
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
      
      const { features } = await response.json();
      const newSuggestions = features.map(f => ({
        formatted: f.properties.formatted,
        // Use the enhanced extraction function
        city: extractGovernorateFromProperties(f.properties),
        lat: f.properties.lat,
        lon: f.properties.lon,
        rawProperties: f.properties // Keep for debugging
      }));
      
      shouldFocus.current = document.activeElement === inputRef.current;
      setSuggestions(newSuggestions);
      setIsDropdownOpen(newSuggestions.length > 0);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
      setIsDropdownOpen(false);
    }
  };

  const determineLocationName = (input) => {
    const lowerInput = input.toLowerCase().trim();
    
    // Check for general terms
    if (['tunisia', 'tunisian', 'all'].some(term => lowerInput.includes(term))) {
      return 'Tunis';
    }

    // Check for specific governorate
    for (const governorate of tunisiaGovernorates) {
      if (lowerInput.includes(governorate.toLowerCase())) {
        return governorate;
      }
    }

    // Try to extract governorate from formatted address
    if (input.includes(',')) {
      const parts = input.split(',').map(part => part.trim());
      for (let i = parts.length - 2; i >= 0; i--) {
        const part = parts[i];
        for (const governorate of tunisiaGovernorates) {
          if (part.toLowerCase().includes(governorate.toLowerCase()) || 
              governorate.toLowerCase().includes(part.toLowerCase())) {
            return governorate;
          }
        }
      }
    }

    // Use raw input if no match
    return input;
  };

  const handleSearch = async (placeName, coordinates) => {
    if (!placeName) return;

    try {
      const locationName = determineLocationName(placeName);
      console.log(`Searching for location: ${locationName} (from input: ${placeName})`);
      
      let coords = coordinates;
      if (!coords || coords.length !== 2) {
        try {
          const response = await fetch(
            `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(locationName)}&apiKey=${GEOAPIFY_API_KEY}&limit=1&filter=countrycode:tn`
          );
          if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
          
          const { features } = await response.json();
          if (features.length) {
            const [lon, lat] = features[0].geometry.coordinates;
            coords = [lat, lon];
            console.log(`Retrieved coordinates: [${lat}, ${lon}] for ${locationName}`);
          } else {
            throw new Error('Location not found');
          }
        } catch (error) {
          console.error('Error fetching coordinates:', error);
          // Use raw input as fallback without coordinates
          if (onLocationSelect) {
            onLocationSelect(locationName, null);
          }
          navigate(`/map?city=${encodeURIComponent(locationName)}`);
          return;
        }
      }

      // Call onLocationSelect if provided
      if (onLocationSelect) {
        onLocationSelect(locationName, coords);
      }

      // Navigate to MapPage with query parameters
      navigate(`/map?city=${encodeURIComponent(locationName)}&lat=${coords[0]}&lng=${coords[1]}`);

      // Update global map center if available
      if (window.updateMapCenter && coords) {
        window.updateMapCenter(coords);
      }
      
      // Reset selected suggestion after search
      setSelectedSuggestion(null);
    } catch (error) {
      console.error('Error in location search:', error);
      // Use raw input as fallback
      if (onLocationSelect) {
        onLocationSelect(placeName, null);
      }
      navigate(`/map?city=${encodeURIComponent(placeName)}`);
    }
  };

  const handleInputChange = (e) => {
    const value = e.currentTarget.value;
    setInputValue(value);
    setSelectedSuggestion(null);
    clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => fetchSuggestions(value), 300);
  };

  const handleInputFocus = () => {
    if (inputValue.length >= 3 && suggestions.length > 0) {
      setIsDropdownOpen(true);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      shouldFocus.current = true;
      
      if (selectedSuggestion) {
        const { city, formatted, lat, lon } = selectedSuggestion;
        const locationName = city || determineLocationName(formatted);
        handleSearch(locationName, [lat, lon]);
      } else {
        handleSearch(inputValue);
      }
      
      setIsDropdownOpen(false);
    }
  };

  const handleInputClick = () => {
    if (inputValue) {
      setIsDropdownOpen(true);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    shouldFocus.current = true;
    setInputValue(suggestion.formatted);
    setSelectedSuggestion(suggestion);
    setSuggestions([]);
    setIsDropdownOpen(false);
  };

  const handleClear = () => {
    shouldFocus.current = true;
    setInputValue('');
    setSelectedSuggestion(null);
    setSuggestions([]);
    setIsDropdownOpen(false);
  };

  return (
    <Box mt="0" style={{ position: 'relative' }} w='30%'>
      <Box>
        <TextInput
          ref={inputRef}
          placeholder="Search for a location?"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          onClick={handleInputClick}
          leftSection={<IconSearch style={{ width: rem(18), height: rem(18) }} stroke={1.5} />}
          rightSection={
            inputValue && (
              <ActionIcon
                variant="subtle"
                onClick={handleClear}
                aria-label="Clear input"
                size="sm"
              >
                <IconX style={{ width: rem(16), height: rem(16) }} stroke={1.5} />
              </ActionIcon>
            )
          }
          radius="md"
          size="lg"
          pr={inputValue ? 30 : 10}
        />
      </Box>
      
      {isDropdownOpen && (
        <Box
          style={{
            position: 'absolute',
            top: 'calc(100% + 5px)',
            left: 0,
            right: 0,
            zIndex: 300,
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
            maxHeight: '300px',
            overflowY: 'auto'
          }}
        >
          {suggestions.length > 0 ? (
            <>
              {suggestions.map((suggestion, idx) => (
                <Box
                  key={idx}
                  p={10}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    '&:hover': { backgroundColor: '#f5f5f5' }
                  }}
                  sx={(theme) => ({
                    '&:hover': {
                      backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[1]
                    }
                  })}
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  <IconMapPin style={{ width: rem(18), height: rem(18), marginRight: rem(10) }} stroke={1.5} />
                  <Box>
                    <Text>{suggestion.formatted}</Text>
                    {/* Show the extracted governorate for debugging */}
                    <Text size="xs" c="dimmed">→ Maps to: {suggestion.city}</Text>
                  </Box>
                </Box>
              ))}
              <Text size="xs" c="dimmed" ta="right" p={5}>
                Powered by Geoapify
              </Text>
            </>
          ) : (
            inputValue.length >= 3 && (
              <Box p={10}>
                <Text>No suggestions found</Text>
              </Box>
            )
          )}
        </Box>
      )}
    </Box>
  );
};

export default LocationSearchInput;
