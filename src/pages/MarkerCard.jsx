import { Card, Text, Group, Badge, Box } from '@mantine/core';
import { Carousel } from '@mantine/carousel';
import '@mantine/carousel/styles.css';
import { useNavigate } from 'react-router-dom';

function MarkerCard({ cardInfo = {} }) {
  const navigate = useNavigate();
  
  const handleCardClick = () => {
    navigate(`/room/${cardInfo.listingId || ''}`); // Use listingId instead of id
  };

  // Map document fields to component expectations
  const cardData = {
    listingId: cardInfo.listingId || '', // Use listingId from document
    photos: Array.isArray(cardInfo.photos) ? cardInfo.photos : [], // Map photos to images
    title: cardInfo.title || 'Untitled',
    description: cardInfo.description || 'No description available', // Fallback since no description in document
    price: `${cardInfo.price}TND/month `|| 'Price not available'
  };

  return (
    <Card shadow="sm" radius="md" withBorder withHover style={{ cursor: 'pointer', padding: "10px", margin: "auto", width: "100%", height: "50%" }}>
      <Card.Section>
        {cardData.photos.length > 0 ? (
          <Carousel
            height={140}
            withControls
            withIndicators
            loop
            styles={{
              indicators: {
                bottom: '10px',
                zIndex: 2,
              },
              indicator: {
                width: '6px',
                height: '6px',
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
            {cardData.photos.map((photo, index) => (
              <Carousel.Slide key={index} onClick={handleCardClick}>
                <img
                  src={photo || '/api/placeholder/400/250'} // Fallback image
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
              height: 140,
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
      </Card.Section>

      <Box onClick={handleCardClick}>
        <Text fw={700} mb={0} mt="sm">{cardData.title}</Text>
        <Badge color="pink" mb={2} mt={2}>ON SALE</Badge>

        <Text lineClamp={1} size="sm" c="dimmed" mt={2} mb={0}>
          {cardData.description}
        </Text>

        <Group color="blue" fullWidth mt="0" mb='0'>
          <Text mt="0" mb='0'>{cardData.price}</Text>
        </Group>
      </Box>
    </Card>
  );
}

export default MarkerCard;