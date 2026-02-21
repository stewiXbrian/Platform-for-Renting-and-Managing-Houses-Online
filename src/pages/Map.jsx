import React, { useState, useCallback, memo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button, Box } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import MarkerCard from "./MarkerCard";

// Memoized ChangeView component
const ChangeView = memo(({ center }) => {
  const map = useMap();

  React.useEffect(() => {
    if (center && (Array.isArray(center) || (center.lat && center.lng))) {
      const centerArray = Array.isArray(center) ? center : [center.lat, center.lng];
      map.setView(centerArray, 12, {
        animate: true,
        pan: { duration: 0.5 },
      });
    }
  }, [center, map]);

  return null;
});

// Search Current Area button component
const SearchAreaControl = memo(({ onSearchArea }) => {
  const map = useMap();

  const handleClick = useCallback(() => {
    const bounds = map.getBounds();
    if (onSearchArea) onSearchArea(bounds);
  }, [map, onSearchArea]);

  return (
    <Box
      style={{
        position: "absolute",
        zIndex: 1000,
        bottom: "35px",
        left: "50%",
        transform: "translateX(-50%)",
      }}
    >
      <Button
        leftSection={<IconSearch size={16} />}
        variant="filled"
        onClick={handleClick}
        style={{ boxShadow: "0 2px 5px rgba(0,0,0,0.2)" }}
      >
        Search this area
      </Button>
    </Box>
  );
});

// Memoized UpdateVisibleHouses component
const UpdateVisibleHouses = memo(({ allHouses, setVisibleHouses, setSelectedMarkerIndex }) => {
  const map = useMap();

  const updateVisibleHouses = useCallback(() => {
    if (!map || !Array.isArray(allHouses)) return;

    const bounds = map.getBounds();
    const visibleHouses = allHouses.filter((item) => {
      if (!item) return false;
      
      // Use location.coordinates from the document
      let coords;
      if (item.location && item.location.coordinates && Array.isArray(item.location.coordinates)) {
        coords = [item.location.coordinates[1], item.location.coordinates[0]]; // Convert [lng, lat] to [lat, lng] for Leaflet
      } else {
        return false;
      }
      
      return bounds.contains(L.latLng(coords[0], coords[1]));
    });

    setVisibleHouses(visibleHouses);
  }, [map, allHouses, setVisibleHouses]);

  useMapEvents({
    moveend: updateVisibleHouses,
    load: updateVisibleHouses,
    click: () => setSelectedMarkerIndex(null),
  });

  React.useEffect(() => {
    updateVisibleHouses();
  }, [updateVisibleHouses]);

  return null;
});

// Create price icon function
const createPriceIcon = (price, selected) => {
  const backgroundColor = selected ? "red" : "#2b2a2a";
  const priceText = typeof price === 'string' ? 
    (price.includes('$') ? price.slice(1, price.indexOf(" ") > 0 ? price.indexOf(" ") : price.length) : price) : 
    (price || 'Price'); // Use price directly if it's a number
    
  return L.divIcon({
    html: `
      <div style="
        background: ${backgroundColor};
        color: white;
        border-radius: 8px;
        width: auto;
        display: inline-block;
        padding: 0.3rem;
        text-align: center;
        font-weight: bold;
        font-size: 0.8rem;
        line-height: 1;
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      ">
        $${priceText}
        <span style="color: cyan;">♥</span>
      </div>
    `,
    className: "",
    iconSize: L.point(43.2, 18.4, true),
    iconAnchor: L.point(21.6, 9.2, true),
  });
};

// Memoized HouseMarker component
const HouseMarker = memo(({ item, idx, isSelected, onMarkerClick }) => {
  const markerRef = useRef(null);

  React.useEffect(() => {
    const marker = markerRef.current;
    if (marker) {
      marker.off("popupclose");
      marker.on("popupclose", () => {
        marker.setIcon(createPriceIcon(item.price, false));
      });
    }
  }, [item.price]);

  // Use location.coordinates from the document
  let coords;
  if (item.location && item.location.coordinates && Array.isArray(item.location.coordinates)) {
    coords = [item.location.coordinates[1], item.location.coordinates[0]]; // Convert [lng, lat] to [lat, lng] for Leaflet
  } else {
    return null; // Skip this marker if no valid coordinates
  }

  // Skip invalid coordinates
  if (!coords || coords.length !== 2 || isNaN(coords[0]) || isNaN(coords[1])) {
    console.warn("Invalid coordinates for marker:", item.listingId);
    return null;
  }

  return (
    <Marker
      ref={markerRef}
      position={coords}
      icon={createPriceIcon(item.price, isSelected)}
      eventHandlers={{
        click: () => onMarkerClick(idx),
      }}
    >
      <Popup onClose={() => onMarkerClick(null)}>
        <MarkerCard cardInfo={item} />
      </Popup>
    </Marker>
  );
});

// Main Map Component
const Map = memo(({ data, highlightedItems, center, onSearchAreaRequest }) => {
  const initialCenter = useRef([36.8065, 10.1815]); // Fallback center
  const mapCenter = center || initialCenter.current;

  // State declarations
  const [visibleHouses, setVisibleHouses] = useState([]);
  const [selectedMarkerIndex, setSelectedMarkerIndex] = useState(null);

  // Debug logging of received data
  React.useEffect(() => {
    if (data && data.length > 0) {
      console.log("First item data structure:", data[0]);
      const firstItem = data[0];
      if (firstItem.location && firstItem.location.coordinates) {
        console.log("Location coordinates format:", firstItem.location.coordinates);
      }
    }
  }, [data]);

  // Data validation and preprocessing
  const validData = React.useMemo(() => {
    if (!data || !Array.isArray(data)) return [];

    // Filter data based on highlightedItems if provided
    const filteredData = highlightedItems
      ? data.filter((item) => highlightedItems.includes(item.listingId)) // Use listingId
      : data;

    // Ensure each item has valid coordinates and map fields for MarkerCard
    return filteredData
      .map((item) => {
        if (!item) return null;

        // Map document fields to expected MarkerCard fields
        return {
          ...item,
          id: item.listingId, // Map listingId to id for MarkerCard
          images: item.photos, // Map photos to images for MarkerCard
          // coordinates are already handled in HouseMarker and UpdateVisibleHouses
        };
      })
      .filter(item => {
        const hasValidCoords = item && item.location && item.location.coordinates && 
          Array.isArray(item.location.coordinates) && 
          item.location.coordinates.length === 2;
        
        if (!hasValidCoords) {
          console.warn("Filtered out item without valid coordinates:", item?.listingId);
        }
        
        return hasValidCoords;
      });
  }, [data, highlightedItems]);

  const tunisiaBounds = L.latLngBounds(
    [30.40, 7.40], // Southwest
    [37.50, 11.50] // Northeast
  );

  // Debug logging
  console.log("Map rendering with data:", validData.length, "items");
  console.log("Map center:", mapCenter);

  return (
    <MapContainer
      style={{ height: "100%", width: "100%" }}
      center={Array.isArray(mapCenter) ? mapCenter : [mapCenter.lat, mapCenter.lng]}
      zoom={12}
      minZoom={8}
      maxBounds={tunisiaBounds}
      maxBoundsViscosity={1.0}
      scrollWheelZoom={true}
    >
      <ChangeView center={mapCenter} />

      <UpdateVisibleHouses
        allHouses={validData}
        setVisibleHouses={setVisibleHouses}
        setSelectedMarkerIndex={setSelectedMarkerIndex}
      />

      <TileLayer
        attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MarkerClusterGroup 
        chunkedLoading
        disableClusteringAtZoom={14}
      >
        {validData.map((item, idx) => (
          <HouseMarker
            key={item.listingId || idx} // Use listingId as key
            item={item}
            idx={idx}
            isSelected={selectedMarkerIndex === idx}
            onMarkerClick={setSelectedMarkerIndex}
          />
        ))}
      </MarkerClusterGroup>

      <SearchAreaControl onSearchArea={onSearchAreaRequest} />
    </MapContainer>
  );
});

// Export ChangeView for external use
export { ChangeView };
export default Map;