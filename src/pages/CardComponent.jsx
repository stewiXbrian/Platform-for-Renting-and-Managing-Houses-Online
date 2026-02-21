import { Card, Text, Group, Badge, Rating, ActionIcon, Box } from '@mantine/core';
import { Carousel } from '@mantine/carousel';
import '@mantine/carousel/styles.css';
import { IconHeartFilled, IconHeart } from '@tabler/icons-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function CardComponent({ cardInfo }) {
  const navigate = useNavigate();
  const [isFavorite, setIsFavorite] = useState(cardInfo.isFavorite || false);
 
  // Use photos directly from cardInfo, default to empty array if undefined
  const photos = Array.isArray(cardInfo.photos) ? cardInfo.photos : [];

  const handleCardClick = () => {
    navigate(`/room/${cardInfo.listingId}`);
    
  };

  const handleFavoriteToggle = async () => {

          const newFavoriteState = !isFavorite;
        const userId = localStorage.getItem('userId');


    try {


    const toggleFavorite = await fetch(`http://localhost:5000/listings`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'X-Action-Type': 'handle-favorite-toggle'
         },

        body: JSON.stringify({ listingId: cardInfo.listingId, isFavorite:newFavoriteState })
      });
      const result2 = await toggleFavorite.json();
      if (!toggleFavorite.ok) {
        throw new Error(result2.error || `Failed to handle favorite toggle`);
      }else {
        setIsFavorite(newFavoriteState);
      }






      const method = newFavoriteState ? 'POST' : 'DELETE';

      const pushListing = await fetch(`http://localhost:5000/bookmarks?userId=${userId}`, {

        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: cardInfo.listingId })
      });
      const result = await pushListing.json();
      if (!pushListing.ok) {
        throw new Error(result.error || `Failed to ${newFavoriteState ? 'add' : 'remove'} bookmark`);
      }
    

    
    } catch (error) {
      console.error("Error toggling favorite:", error.message);
    }
  };


  return (
    <Card shadow="sm" padding="xs" radius="md" withBorder style={{ cursor: 'pointer' }}>
      <Card.Section>
        {photos.length > 0 ? (
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
            {photos.map((photo, index) => (
              <Carousel.Slide key={index} onClick={handleCardClick}>
                <img
                  src={photo || '/api/placeholder/400/250'} // Fallback image
                  alt={cardInfo.title || 'Not Found'}
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
        <Text fw={700}>{cardInfo.title || 'Untitled'}</Text>
        <Rating value={3.5} fractions={2} readOnly mt="xs" />
        <Text lineClamp={2} size="sm" c="dimmed" mt="xs" mb="xs">
          {cardInfo.description || 'No description available' }
        </Text>
        <Text>{`${cardInfo.price}TND/month` || 'Price not available'}</Text>
      </Box>
    </Card>
  );
}

export default CardComponent;