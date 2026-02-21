
import {
  AppShell,
  Group,
  TextInput,
  Button,
  Box,
  Title,
  Text,
  Container,
  Grid,
  Stack,
  Avatar,
  Divider,
  Paper,
  ThemeIcon,
  rem,
  Spoiler,
  Center,
  Textarea,
  Modal,
  ScrollArea,
  ActionIcon,
  CopyButton,
  Notification,
  Loader,
  useMantineTheme
} from '@mantine/core';
import {
  IconSearch,
  IconUser,
  IconHeart,
  IconHeartFilled,
  IconStar,
  IconShare,
  IconCheck,
  IconX,
  IconCopy,
  IconLink,
  IconChevronRight,
  IconStarFilled,
  IconAlertCircle
} from '@tabler/icons-react';
import React, { useState, Suspense } from 'react';
import { Await, useLoaderData, useNavigate } from 'react-router-dom';
import SearchHeader from './SearchHeader';

export async function loader({ params }) {
  console.log("Room loader params:", params);
  try {
    const listingId = params?.listingId || '';

    const listingDataPromise = fetch(`http://localhost:5000/listing?listingId=${listingId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    }).then(async (response) => {
      console.log("API Response status:", response.status);
      if (!response.ok) {
        const error = await response.json();
        console.error("API Error response:", error);
        throw new Error(error.error || 'Failed to fetch listing');
      }
      return await response.json();
    }).catch(err => {
      console.error("Listing fetch failed:", err);
      return null;
    });

    return { listingData: listingDataPromise };
  } catch (err) {
    console.error("Loader error:", err);
    return { listingData: Promise.resolve(null) };
  }
}

function LoadingRoom() {


  return (
    <Center style={{ height: "100vh", width: "100%" }}>
      <Loader color="blue" type="bars" size="xl" />
    </Center>
  );
}

function EnhancedSpoiler({ children, maxHeight = 100 }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Box>
      <Box sx={{ height: expanded ? 'auto' : `${maxHeight}px`, overflow: 'hidden', transition: 'height 0.3s' }}>
        {children}
      </Box>
      <Button
        variant="subtle"
        onClick={() => setExpanded(!expanded)}
        mt="xs"
        rightSection={<IconChevronRight size={16} style={{ transform: expanded ? 'rotate(180deg)' : 'none' }} />}
      >
        {expanded ? 'Show less' : 'Show more'}
      </Button>
    </Box>
  );
}

function RoomContent({ data: room }) {
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const localUserId = localStorage.getItem('userId'); // Get the local user ID
  const theme = useMantineTheme();
  const [count , setCount] = useState(room.candidates); 
  const [reviewsModalOpen, setReviewsModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [shareNotification, setShareNotification] = useState(false);
  
  // Initialize isReserved from localStorage - check if the key exists and is 'true'
  const [isReserved, setIsReserved] = useState(() => {
    const storedValue = localStorage.getItem(`${room.listingId}`);
    return storedValue === 'true';
  });
  
  const shareUrl = window.location.href;

  // Check if the current user is the host
  const isOwnListing = localUserId && room?.userId === localUserId;

  if (!room) {
    return (
      <Center style={{ height: '80vh' }}>
        <Text color="red " size="xl">Failed to load listing data.</Text>
      </Center>
    );
  }

  const sendMessage = async () => {
    if (isOwnListing) {
      console.log("Cannot send message to your own listing.");
      return;
    }

    const userId = localStorage.getItem('userId');
    if (!userId) {
      console.error('No user ID found. Please log in.');
      return;
    }

    if (!message) {
      console.error('No message provided.');
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/profile/notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reciever_id: room.userId,
          type: 'message',
          sender_id: userId,
          listingId: null,
          content: message
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send notification');
      }

      setMessage(''); // Clear the message state
      console.log('Message sent successfully:', result);
    } catch (err) {
      console.error('Error sending message:', err.message);
    }
  };

  const handleReserve = async () => {

    const userId = localStorage.getItem('userId');
    try {

      const response = await fetch(`http://localhost:5000/profile/notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reciever_id: room.userId,
          type: 'booking-request',
          sender_id: userId,
          listingId: room.listingId,
          content: room.title,
          price: room.price,
          candidates:room.candidates

        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send notification');
      }

      console.log('reservation Notification sent successfully:', result);


    const handleReservationClick = await fetch(`http://localhost:5000/listings`, {
        method: 'PUT',
        headers: { 
          'content-type': 'application/json',
          'x-action-type': 'handle-reservation-click' },
        body: JSON.stringify({
          listingId: room.listingId,
          candidates: room.candidates + 1,
          
        })
      })
      const result2 = await handleReservationClick.json();
      if (!handleReservationClick.ok) {
        throw new Error(result2.error || 'Failed to handle reservation click');
      }

      console.log('reservation click handled successfully:', result);


    } catch (err)
     {
      console.error('Error happened :', err.message);
    }

    alert(`Reservation request sent! You are candidate #${room.candidates + 1}`);
    setCount(room.candidates + 1);
    
    // Set localStorage to 'true' and update state for immediate UI feedback
    localStorage.setItem(`${room.listingId}`, 'true');
    setIsReserved(true);

  };

  return (
    <Container size="xl">
      <Title mb="md">{room?.title}</Title>

      <Group justify="space-between" mb="lg">
        <Group>
          <IconStarFilled size={16} />
          <Text fw={500}>{room?.reviews?.rating} ({room?.reviews?.numbers} reviews)</Text>
        </Group>
        <Group>
          <Button variant="subtle" leftSection={<IconShare size={16} />} onClick={() => setShareModalOpen(true)}>
            Share
          </Button>
          <Button
            variant="subtle"
            leftSection={isFavorite ? <IconHeartFilled size={16} color="red" /> : <IconHeart size={16} />}
            onClick={() => setIsFavorite(!isFavorite)}
          >
            {isFavorite ? 'Saved' : 'Save'}
          </Button>
        </Group>
      </Group>

      <Modal
        opened={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        title="Share this place"
        size="md"
      >
        <Text size="sm" mb="xs">Copy link to share</Text>
        <Group wrap="nowrap" style={{ border: '1px solid #ced4da', borderRadius: 4 }}>
          <TextInput value={shareUrl} readOnly flex={1} leftSection={<IconLink size={16} />} />
          <CopyButton value={shareUrl} timeout={2000}>
            {({ copied, copy }) => (
              <Button
                color={copied ? 'teal' : 'blue'}
                onClick={() => {
                  copy();
                  setShareNotification(true);
                  setTimeout(() => setShareNotification(false), 2000);
                }}
              >
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            )}
          </CopyButton>
        </Group>
        {shareNotification && (
          <Notification color="teal" title="Link copied!" mt="md" icon={<IconCheck size={18} />}>
            You can now share this link.
          </Notification>
        )}
      </Modal>

      <Box mb="xl">
        <Grid gutter="sm">
          <Grid.Col span={8}>
            <Box h={450} style={{ borderRadius: 8, overflow: 'hidden' }}>
              <img
                src={(room?.photos && room.photos.length > 0 ? room.photos[0] : "https://via.placeholder.com/800x450")}
                alt="Main view"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </Box>
          </Grid.Col>
          <Grid.Col span={4}>
            <Grid gutter="sm">
              {[1, 2, 3, 4].map((index) => (
                <Grid.Col span={6} key={`top-${index}`}>
                  <Box h={220} style={{ borderRadius: 8, overflow: 'hidden' }}>
                    <img
                      src={(room?.photos && room.photos.length > index ? room.photos[index] : "https://via.placeholder.com/400x220")}
                      alt={`View ${index + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </Box>
                </Grid.Col>
              ))}
            </Grid>
          </Grid.Col>
        </Grid>
      </Box>

      <Grid gutter="xl">
        <Grid.Col span={8}>
          <Box mb="md">
            <Title order={3}>{room?.title}</Title>
            <Text fw={600}>A {room?.propertyType} hosted by {room?.host}</Text>
            <Text c="dimmed">{count} candidate(s)</Text>
          </Box>

          <Divider my="lg" />

          <Box mb="lg">
            <Title order={3} mb="md">About</Title>
            <Text>{room?.description}</Text>
          </Box>

          <Divider my="lg" />

          <Box mb="lg">
            <Title order={3} mb="md">Amenities</Title>
            <Grid>
              {room?.selectedAmenities?.map((amenity, index) => (
                <Grid.Col span={4} key={index}>
                  <Group>
                    <IconCheck size={18} />
                    <Text>{amenity}</Text>
                  </Group>
                </Grid.Col>
              ))}
            </Grid>
          </Box>

          <Divider my="lg" />

          <Box mb="xl">
            <Group mb="md">
              <IconStarFilled size={24} />
              <Title order={3}>{room?.reviews?.rating}/{room?.reviews?.numbers} reviews</Title>
            </Group>
            <Grid>
              {room?.reviews?.comments?.map((review, index) => (
                <Grid.Col span={6} key={index}>
                  <Group mb="xs">
                    <Avatar radius="xl">{review.name?.charAt(0) || "?"}</Avatar>
                    <Box>
                      <Text fw={500}>{review.name}</Text>
                      <Text size="xs" c="dimmed">January 2024</Text>
                    </Box>
                  </Group>
                  <EnhancedSpoiler maxHeight={100}>
                    <Text>{review.content}</Text>
                  </EnhancedSpoiler>
                </Grid.Col>
              ))}
            </Grid>
            <Button variant="outline" mt="md" onClick={() => setReviewsModalOpen(true)}>
              Show all {room?.reviews?.numbers} reviews
            </Button>

            <Modal
              opened={reviewsModalOpen}
              onClose={() => setReviewsModalOpen(false)}
              title={<Group><IconStarFilled size={20} /><Text fw={600}>{room?.reviews?.rating} · {room?.reviews?.numbers} reviews</Text></Group>}
              size="xl"
            >
              <ScrollArea h="calc(90vh - 150px)">
                {room?.reviews?.comments?.map((review, index) => (
                  <Paper p="md" withBorder mb="md" radius="md" key={index}>
                    <Group mb="xs">
                      <Avatar radius="xl">{review.name?.charAt(0) || "?"}</Avatar>
                      <Box>
                        <Text fw={500}>{review.name}</Text>
                        <Text size="xs" c="dimmed">January 2024</Text>
                      </Box>
                    </Group>
                    <Text>{review.content}</Text>
                  </Paper>
                ))}
              </ScrollArea>
            </Modal>
          </Box>

          <Divider my="lg" />

          <Box mb="xl">
            <Group mb="md">
              <Avatar
                src={room?.avatar}
                radius="xl"
                size="xl"
                style={{
                  border: `4px solid white`,
                  boxShadow: theme.shadows.md
                }}
                onClick={() => navigate(`/owner/${room?.userId}`)}
              />
              <Title order={3}>Hosted by {room?.host}</Title>
            </Group>
          </Box>
        </Grid.Col>

        <Grid.Col span={4}>
          <Paper withBorder p="lg" radius="md" style={{ position: 'sticky', top: 20 }}>
            <Center>
              <Text fw={700} size="xl">{room?.price}TND/month</Text>
            </Center>
            <Center>
              <Text c="dimmed">Availability: {room?.availableFrom}</Text>
            </Center>
            <Center>
              <Text c="dimmed">residence time: {room?.lengthOfStay}</Text>
            </Center>
            <Center mt={20}>
              <Button
                color="blue"
                w="80%"
                onClick={handleReserve}
                disabled={isOwnListing || isReserved}
                title={isOwnListing ? "Cannot reserve your own listing" : ""} // Tooltip for disabled state
              >
                Reserve
              </Button>
            </Center>
            <Paper withBorder p="md" radius="md" mt="lg">
              <Group mb="md">
                <Avatar
                  src={room?.avatar}
                  radius="md"
                  size="md"
                  style={{
                    border: `4px solid white`,
                    boxShadow: theme.shadows.md
                  }}
                />
                <Text fw={500}>{room?.host}</Text>
              </Group>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={`Message ${room?.host}...`}
                minRows={3}
                mb="md"
                styles={{ input: { height: '120px' } }}
                disabled={isOwnListing || isReserved}
              />
              <Center>
                <Button
                  onClick={sendMessage}
                  mt="md"
                  disabled={isOwnListing || isReserved}
                  title={isOwnListing ? "Cannot message your own listing" : ""} // Tooltip for disabled state
                >
                  Send Message
                </Button>
              </Center>
            </Paper>
          </Paper>
        </Grid.Col>
      </Grid>
    </Container>
  );
}

export default function RoomPage() {
  const { listingData } = useLoaderData() || {};

  console.log("Loader data:", listingData); // Debug log

  return (
    <AppShell header={{ height: 80 }}>
      <SearchHeader />
      <AppShell.Main>
        <Suspense fallback={<LoadingRoom />}>
          {listingData ? (
            <Await resolve={listingData}>
              {(resolvedData) => <RoomContent data={resolvedData} />}
            </Await>
          ) : (
            <Center style={{ height: "100vh", width: "100%" }}>
              <Loader color="blue" type="bars" size="xl" />
            </Center>
          )}
        </Suspense>
      </AppShell.Main>
    </AppShell>
  );
}