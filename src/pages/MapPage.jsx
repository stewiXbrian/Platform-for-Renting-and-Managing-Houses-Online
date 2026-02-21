import React, { useState, useEffect, useCallback, useMemo } from "react";
import { AppShell, Box, Flex, SimpleGrid, Pagination, Center, Loader, Alert, Text } from "@mantine/core";
import { Await, redirect, useLoaderData, useSearchParams } from "react-router-dom";
import { Suspense } from "react";
import FilterMenu from "./FilterMenu";
import CardComponent from "./CardComponent";
import Map from "./Map";
import SearchHeader from "./SearchHeader";
import ChatBot from "../Components/ChatBot";

// Constants
const API_URL = "http://localhost:5000/listings";

const DEFAULT_COORDS = [36.8065, 10.1815]; // Tunis coordinates
const ITEMS_PER_PAGE = 6;

/**
 * Data loader for React Router
 */
export async function loader({ request }) {

    const userId =localStorage.getItem('userId')
    if (!userId) {
        throw redirect ("/")
        
    }

  try {
    const city = new URL(request.url).searchParams.get("city");
    const response = await fetch(`${API_URL}?city=${encodeURIComponent(city)}`);
    
    if (!response.ok) throw new Error('Failed to fetch listings');
    return { listings: await response.json() };
  } catch (err) {
    console.error("Listings fetch failed:", err.message);
    return { listings: [] };
  }
}

export default function MapPage() {
  // Initial data and URL params
  const { listings } = useLoaderData();

  const [searchParams] = useSearchParams();

  // Core state
  const [page, setPage] = useState(1);
  const [listingsData, setListingsData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [city, setCity] = useState();
  const [mapCenter, setMapCenter] = useState(DEFAULT_COORDS);
  
  // Filter state
  const [filters, setFilters] = useState({
    lengthOfStay: null,
    price: { min: null, max: null },
    propertyType: null,
  });

  /**
   * Applies filters to listings data
   */
  const filteredListings = useMemo(() => {
    if (!listingsData.length) return [];
    
    return listingsData.filter(item => {
      // Property type filter
      if (filters.propertyType && item.propertyType?.toLowerCase() !== filters.propertyType) return false;
      
      // Length of stay filter
      if (filters.lengthOfStay && Array.isArray(filters.lengthOfStay) && filters.lengthOfStay.length > 0) {
        const stay = item.lengthOfStay || "";
        const matchesStay = filters.lengthOfStay.some(length => stay === length);
        if (!matchesStay) return false;
      }
      
      // Price filter
      if (filters.price.min || filters.price.max) {
        const price = parseFloat(item.price) || 0;
        if ((filters.price.min && price < filters.price.min) ||
            (filters.price.max && price > filters.price.max)) {
          return false;
        }
      }
      
      return true;
    }).map(item => ({
      listingId: item.listingId || '',
      description: item.description || '',
      amenities: item.selectedAmenities || [],
      title: item.title || 'Untitled',
      price: item.price || 'Price not available',
      propertyType: item.propertyType || '',
      lengthOfStay: item.lengthOfStay || '',
      photos: item.photos || [],
      isFavorite: item.isFavorite || false,
      location: item.location || { coordinates: DEFAULT_COORDS },
    }));
  }, [listingsData, filters]);

  // Pagination data
  const paginatedListings = useMemo(() => {
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    return filteredListings.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredListings, page]);

  // Total pages for pagination
  const totalPages = useMemo(() => 
    Math.max(1, Math.ceil(filteredListings.length / ITEMS_PER_PAGE)), 
    [filteredListings]
  );

  // Check if no results were found
  const hasNoResults = useMemo(() => 
    !isLoading && filteredListings.length === 0, 
    [isLoading, filteredListings]
  );

  /**
   * Update filters
   */
  const updateFilters = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPage(1); // Reset to first page when filters change
  }, []);

  /**
   * Reset filters
   */
  const resetFilter = useCallback((filterType, subFilter = null) => {
    setFilters(prev => {
      if (filterType === "all") {
        return {
          lengthOfStay: null,
          price: { min: null, max: null },
          propertyType: null,
        };
      }
      
      const newFilters = { ...prev };
      
      if (filterType === "lengthOfStay" && subFilter) {
        newFilters.lengthOfStay = newFilters.lengthOfStay?.filter(length => length !== subFilter) || null;
        if (newFilters.lengthOfStay?.length === 0) newFilters.lengthOfStay = null;
      } else if (filterType === "price" && subFilter) {
        newFilters.price[subFilter] = null;
      } else if (filterType === "propertyType") {
        newFilters.propertyType = null;
      }
      
      return newFilters;
    });
    setPage(1); // Reset to first page
  }, []);

  const searchCity = useCallback(async (cityName, coordinates = null) => {
    if (!cityName) return;
    
    setIsLoading(true);
    setCity(cityName);
    
    // Update map if coordinates provided
    if (coordinates?.length === 2) setMapCenter(coordinates);
    
    try {
      const response = await fetch(`${API_URL}?city=${encodeURIComponent(cityName)}`);
      if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
      
      const data = await response.json();
      console.log(`Found ${data.length} listings in ${cityName}`);
      setListingsData(data);
    } catch (error) {
      console.error("Search error:", error);
      setListingsData([]);
    } finally {
      setIsLoading(false);
      setPage(1);
    }
  }, []);

  /**
   * Search current map area
   */
  const searchMapArea = useCallback(async (mapBounds) => {
    if (!mapBounds) return;
    
    setIsLoading(true);
    try {
      const center = mapBounds.getCenter();
      
      // Get city from coordinates
      const response = await fetch(
        `https://api.geoapify.com/v1/geocode/reverse?lat=${center.lat}&lon=${center.lng}&apiKey=b01a251bc6054da09e574e135d399642&format=json`
      );
      
      if (!response.ok) throw new Error(`Geocoding error: ${response.status}`);
      
      const geodata = await response.json();
      if (geodata.results?.length) {
        // Find city name with fallbacks
        const detected = geodata.results[0].city || 
                         geodata.results[0].county || 
                         geodata.results[0].state 
                        
        const cityName = detected.toLowerCase();
        console.log(`Map area: ${cityName}`);
        setCity(cityName);
        setMapCenter([center.lat, center.lng]);
        
        // Fetch listings for this city
        const listingsResponse = await fetch(`${API_URL}?city=${encodeURIComponent(cityName)}`);
        if (!listingsResponse.ok) throw new Error(`Listings error: ${listingsResponse.status}`);
        
        setListingsData(await listingsResponse.json());
      } else {
        setListingsData([]);
        setCity();
      }
    } catch (error) {
      console.error("Map search error:", error);
      setListingsData([]);
      setCity();
    } finally {
      setIsLoading(false);
      setPage(1);
    }
  }, []);

  // Initialize with data from loader
  useEffect(() => {
    if (listings?.length) {
      setListingsData(listings);
    }
    setIsLoading(false);
  }, [listings]);

  // Handle URL parameters on initial load
  useEffect(() => {
    const urlCity = searchParams.get("city");
    const lat = parseFloat(searchParams.get("lat"));
    const lng = parseFloat(searchParams.get("lng"));
    
    if (urlCity) {
      setCity(urlCity);
      
      // Set map center if valid coordinates exist
      if (!isNaN(lat) && !isNaN(lng)) {
        setMapCenter([lat, lng]);
      }
    }
  }, [searchParams]);

  // Set up global function for external components
  useEffect(() => {
    window.updateMapCenter = (coords) => {
      if (coords?.length === 2) setMapCenter(coords);
    };
    
    return () => { delete window.updateMapCenter; };
  }, []);

  const chatBotListings = paginatedListings.map(listing => ({
    listingId: listing.listingId || '',
    description: listing.description || '',
    amenities: listing.amenities || [],
    lengthOfStay: listing.lengthOfStay || '',
    coordinates: listing.location.coordinates || [],
    price: listing.price || '',
    title: listing.title || '',
    propertyType: listing.propertyType || ''
  }));

  return (
    <AppShell header={{ height: 80 }}>
      <SearchHeader onLocationSelect={searchCity} />
      <AppShell.Main>
        {/* Filter menu */}
        <FilterMenu 
          onFilterChange={updateFilters} 
          onResetFilter={resetFilter} 
          filters={filters} 
        />
        
        {/* Main content area */}
        <Suspense fallback={
          <Center style={{ height: "calc(100vh - 160px)" }}>
            <Loader color="blue" type="bars" size="xl" />
          </Center>
        }>
          <Await resolve={listings}>
            {() => (
              <Flex>
                {/* Left side - Listings panel */}
                <Box
                  style={{
                    position: "fixed",
                    top: "150px",
                    left: 0,
                    right: "40%",
                    bottom: 0,
                    overflowY: "auto",
                    padding: "0 20px",
                  }}
                >
                  {isLoading ? (
                    <Center style={{ height: "100%" }}>
                      <Loader color="blue" type="bars" size="xl" />
                    </Center>
                  ) : hasNoResults ? (
                    <Alert
                      title={city ? `No results found in ${city}` : "Please search for a location"}
                      color="yellow"
                      style={{ marginTop: "0" }}
                    >
                      <Text>
                        {city
                          ? "No properties available in this location. Try another area or adjust your filters."
                          : "Enter a location to find available properties."}
                      </Text>
                    </Alert>
                  ) : (
                    <>
                      {/* Property cards */}
                      <SimpleGrid cols={3} spacing="md" mb="1.5rem">
                        {paginatedListings.map(listing => (
                          <CardComponent key={listing.listingId} cardInfo={listing} />
                        ))}
                      </SimpleGrid>
                      
                      {/* Pagination */}
                      {totalPages > 1 && (
                        <Center mb="0.9rem">
                          <Pagination 
                            total={totalPages} 
                            value={page} 
                            onChange={setPage} 
                          />
                        </Center>
                      )}
                    </>
                  )}
                </Box>

                {/* Right side - Map */}
                <Box
                  pos="fixed"
                  top="150px"
                  right={0}
                  w="40%"
                  h="calc(100vh - 120px)"
                  bg="gray.2"
                >
                  <Map
                    data={filteredListings}
                    highlightedItems={paginatedListings.map(item => item.listingId)}
                    center={mapCenter}
                    onSearchAreaRequest={searchMapArea}
                  />
                </Box>

                {/* ChatBot */}
                <ChatBot chatData={chatBotListings}/>

              </Flex>
            )}
          </Await>
        </Suspense>
      </AppShell.Main>
    </AppShell>
  );
}