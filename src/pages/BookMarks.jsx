import { 
  AppShell, 
  Text, 
  Group, 
  Box, 
  Title, 
  Container, 
  SimpleGrid, 
  Card, 
  Rating, 
  ActionIcon, 
  Divider, 
  Center, 
  Pagination,
  Flex,
  Button,
  Loader
} from "@mantine/core";
import { Carousel } from '@mantine/carousel';
import { IconHeart, IconHeartFilled } from "@tabler/icons-react";
import { useState, useEffect, Suspense } from 'react';
import { Await, redirect, useLoaderData, useNavigate } from "react-router-dom";
import SearchHeader from "./SearchHeader";

// Loader function to fetch bookmarks (unchanged from previous context)
export function loader() {
  
    const userId =localStorage.getItem('userId')
  if (!userId) {
      throw redirect ("/")
      
  }
  
  try{
  

  const bookmarksDataPromise = fetch(`http://localhost:5000/bookmarks?userId=${userId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  })
    .then(response => {
      if (!response.ok) {
        return response.json().then(error => {
          throw new Error(error.error || 'Failed to fetch bookmarks');
        });
      }
      return response.json();
    })
    .catch(error => {
      console.error('Bookmarks fetch failed:', error.message);
      return null;
    });

  return { bookmarksData: bookmarksDataPromise };
  }
  catch(err){
    console.error('Loader error:', err.message);
    return { bookmarksData: Promise.resolve(null) };
  }
}

// Card component for each wishlist item (replaced with CardComponent)
function CardComponent({ cardInfo, onRemove = () => {} }) {
  const navigate = useNavigate();
  const [isFavorite, setIsFavorite] = useState(true); // Always true initially since this is the wishlist page

  // Map backend fields to expected frontend fields
  const cardData = {
    listingId: cardInfo.id, // Backend returns 'id' (mapped from listingId in the GET route)
    images: Array.isArray(cardInfo.photos) ? cardInfo.photos : [], // Map 'photos' to 'images'
    title: cardInfo.title || 'Untitled',
    description: cardInfo.description || 'No description available',
    price: cardInfo.price || 'Price not available'
  };

  const handleCardClick = () => {
    console.log("Navigating to listingId:", cardData.listingId);
    navigate(`/room/${cardData.listingId}`);
  };

  const handleFavoriteToggle = async () => {
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) throw new Error('User not logged in');

      const response = await fetch(`http://localhost:5000/bookmarks?userId=${userId}`, {
        method: 'DELETE', // Always DELETE since we're removing from wishlist
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: cardData.listingId })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to remove bookmark');
      }

      setIsFavorite(false);
      onRemove(cardData.listingId); // Notify parent to update UI
    } catch (error) {
      console.error("Error removing bookmark:", error.message);
      alert(`Failed to remove bookmark: ${error.message}`);
    }
  };

  return (
    <Card shadow="sm" padding="xs" radius="md" withBorder style={{ cursor: 'pointer' }}>
      <Card.Section>
        {cardData.images.length > 0 ? (
          <Carousel 
            height={200} 
            withControls 
            withIndicators 
            loop
            styles={{
              indicators: {
                bottom: '10px',
                zIndex: 2,
              },
              indicator: {
                width: '8px',
                height: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.91)',
                '&[data-active]': {
                  backgroundColor: 'white',
                }
              },
              control: {
                backgroundColor: 'rgba(230, 220, 220, 0.91)',
              }
            }}
          >
            {cardData.images.map((image, index) => (
              <Carousel.Slide key={index} onClick={handleCardClick}>
                <img
                  src={image || '/api/placeholder/400/250'} // Fallback image
                  alt={cardData.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { e.target.src = '/api/placeholder/400/250'; }} // Fallback on error
                />
              </Carousel.Slide>
            ))}
          </Carousel>
        ) : (
          <Box
            style={{
              height: 200,
              backgroundColor: '#f0f0f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onClick={handleCardClick}
          >
            <img
              src="/api/placeholder/400/250"
              alt="No Image Available"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </Box>
        )}
        <ActionIcon 
          variant='filled'
          color="red" 
          radius="xl" 
          size="md"
          onClick={handleFavoriteToggle}
          style={{ position: 'absolute', top: 10, right: 10, zIndex: 10 }}
        >
          {isFavorite ? <IconHeartFilled size={20} /> : <IconHeart size={20} />}
        </ActionIcon>
      </Card.Section>

      <Box onClick={handleCardClick} p="xs">
        <Text fw={700}>{cardData.title}</Text>
        <Rating value={3.5} fractions={2} readOnly mt="xs" />
        <Text lineClamp={1} size="sm" c="dimmed" mt="xs" mb="xs">
          {cardData.description}
        </Text>
        <Text>{cardData.price}</Text>
      </Box>
    </Card>
  );
}

// Main wishlist content component
function WishlistContent({ bookmarksData }) {
  const initialBookmarks = Array.isArray(bookmarksData) ? bookmarksData : [];
  const [bookmarks, setBookmarks] = useState(initialBookmarks);
  const [activePage, setActivePage] = useState(1);
  const [removedItemId, setRemovedItemId] = useState(null);

  const ITEMS_PER_PAGE = 6;
  const totalPages = Math.ceil(bookmarks.length / ITEMS_PER_PAGE);
  const startIndex = (activePage - 1) * ITEMS_PER_PAGE;
  const currentItems = bookmarks.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const removeFromWishlist = (id) => {
    setRemovedItemId(id);
    setBookmarks(prev => prev.filter(item => item.id !== id));
  };

  useEffect(() => {
    if (currentItems.length === 0 && activePage > 1) {
      setActivePage(activePage - 1);
    }
    if (activePage > totalPages && totalPages > 0) {
      setActivePage(totalPages);
    }
  }, [bookmarks.length, activePage, totalPages, currentItems.length]);

  if(!bookmarksData){
      return (
          <Center style={{ height: '80vh' }}>
            <Text size="xl" style={{color:'red'}}>Failed to load bookmarks data</Text>
          </Center>
        );
  }

  return (
    <Container size="xl" mt="xl">
      <Flex justify="space-between" align="center" mb="md">
        <Title order={2}>My Wishlist</Title>
        <Text c="dimmed">{bookmarks.length} items</Text>
      </Flex>
      
      <Divider mb="xl" />
      
      {bookmarks.length > 0 ? (
        <>
          {removedItemId && (
            <Text c="dimmed" mb="md" ta="center">Item removed from wishlist</Text>
          )}
          
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg" mb="xl">
            {currentItems.map(item => (
              <CardComponent 
                key={item.id || Math.random()} 
                cardInfo={item} 
                onRemove={removeFromWishlist} 
              />
            ))}
          </SimpleGrid>
          
          {totalPages > 1 && (
            <Center mb="lg">
              <Pagination 
                total={totalPages} 
                value={activePage} 
                onChange={(newPage) => {
                  setActivePage(newPage);
                  setRemovedItemId(null);
                }} 
              />
            </Center>
          )}
        </>
      ) : (
        <Center style={{ height: '50vh' }}>
          <Box ta="center">
            <IconHeart size={64} color="#e0e0e0" />
            <Title order={3} mt="md">Your wishlist is empty</Title>
            <Text c="dimmed" mt="sm">Items you save will appear here</Text>
            <Button mt="lg" variant="light">Explore listings</Button>
          </Box>
        </Center>
      )}
    </Container>
  );
}

export default function WishlistPage() {
  const { bookmarksData } = useLoaderData() || { bookmarksData: [] };
  const navigate = useNavigate();

  const handleSearchFromWishlist = (cityName, coordinates) => {
    let lat, lng;
    if (coordinates && Array.isArray(coordinates) && coordinates.length === 2) {
      [lat, lng] = coordinates;
    } else {
      lat = 36.8065;
      lng = 10.1815;
    }
    navigate(`/map?city=${cityName || 'tunis'}&lat=${lat}&lng=${lng}`);
  };

  return (
    <AppShell header={{ height: 80 }}>
      <SearchHeader onLocationSelect={handleSearchFromWishlist} />
      
      <AppShell.Main>
        <Suspense fallback=
        {<Center style={{ height: "calc(100vh - 120px)" }}>
                            <Loader color="blue" type="bars" size="xl"  />
                                          </Center>}
        >
          <Await resolve={bookmarksData}>
            {(resolvedBookmarksData) => <WishlistContent bookmarksData={resolvedBookmarksData} />}
          </Await>
        </Suspense>
      </AppShell.Main>
    </AppShell>
  );
}