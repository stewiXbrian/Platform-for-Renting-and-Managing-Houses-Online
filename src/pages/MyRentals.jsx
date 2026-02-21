import { useState } from 'react';
import { useLoaderData, Await, useNavigate, redirect } from 'react-router-dom';
import { Suspense } from 'react';
import {
  AppShell, Text, Title, Container, Badge, Button, Paper, Group, Box, Card, Image, ActionIcon,
  Modal, Textarea, Avatar, ScrollArea, Notification, useMantineTheme,
  Loader, Center
} from "@mantine/core";
import { IconMessage, IconUser, IconX, IconCircleCheck, IconCheck } from '@tabler/icons-react';
import SearchHeader from "./SearchHeader";

// Loader function to fetch user rentals
export async function loader() {

  const userId =localStorage.getItem('userId')
  if (!userId) {
      throw redirect ("/")
      
  }

  try {
   

    const propertyDataPromise = fetch(`http://localhost:5000/rentals?userId=${userId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    }).then(async (response) => {
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch rentals');
      }
      return await response.json();
    }).catch(err => {
      console.error('Rentals fetch failed:', err.message);
      return [];
    });

    return { propertyData: propertyDataPromise };
  } catch (err) {
    console.error('Loader error:', err.message);
    return { propertyData: Promise.resolve([]) };
  }
}

// ChatArea component for messaging
function ChatArea({ ownerId, ownerName, ownerAvatar, onClose }) {
  const theme = useMantineTheme();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [notification, setNotification] = useState(false);

  const sendMessage = async () => {
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
          reciever_id: ownerId,
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

      setMessages(prev => [...prev, {
        id: Date.now(),
        sender: 'You',
        content: message,
        timestamp: new Date().toLocaleTimeString()
      }]);

      setMessage('');
      setNotification(true);
      setTimeout(() => setNotification(false), 2000);
    } catch (err) {
      console.error('Error sending message:', err.message);
    }
  };

  return (
    <Modal
      opened={true}
      onClose={onClose}
      title={
        <Group>
          <Avatar
            src={ownerAvatar}
            radius="xl"
            size="md"
            style={{
              border: `2px solid white`,
              boxShadow: theme.shadows.sm
            }}
          />
          <Text fw={500}>Chat with {ownerName}</Text>
        </Group>
      }
      size="md"
    >
      <Box style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
        <ScrollArea style={{ flex: 1 }} mb="md">
          {messages.length > 0 ? (
            messages.map(msg => (
              <Box key={msg.id} mb="sm" p="sm" bg={msg.sender === 'You' ? theme.colors.blue[0] : theme.colors.gray[0]} style={{ borderRadius: '8px' }}>
                <Text fw={500}>{msg.sender}</Text>
                <Text>{msg.content}</Text>
                <Text size="xs" c="dimmed" ta="right">{msg.timestamp}</Text>
              </Box>
            ))
          ) : (
            <Text c="dimmed" ta="center" mt="xl">No messages yet. Start the conversation!</Text>
          )}
        </ScrollArea>

        <Box>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={`Message ${ownerName}...`}
            minRows={2}
            mb="sm"
          />
          <Button fullWidth onClick={sendMessage}>
            Send Message
          </Button>
        </Box>
      </Box>

      {notification && (
        <Notification
          icon={<IconCheck size={18} />}
          color="teal"
          title="Message sent!"
          style={{ position: 'absolute', bottom: 20, right: 20 }}
          onClose={() => setNotification(false)}
        >
          Your message has been sent to {ownerName}
        </Notification>
      )}
    </Modal>
  );
}

// PropertyCard component with fixed image appearance
function PropertyCard({ property }) {
  const [chatOpen, setChatOpen] = useState(false);
  const navigate = useNavigate();

  const ownerProfile = (id) => navigate(`/owner/${id}`);

  const renderCardContent = () => (
    <>
      <Text fw={600} size="lg">{property?.title || "Untitled Property"}</Text>
      <Text size="sm" c="dimmed" mt={4} mb={12} lineClamp={2}>
        {property?.description || "No description available"}
      </Text>
      <Text fw={700} size="md">{`${property?.price}TND/month` || "N/A"}</Text>
      <Text size="sm" c="dimmed" mt={4}>Rented recently</Text>
    </>
  );

  const renderActions = () => (
    <Group grow mt="md">
      <Button
        variant="outline"
        color="blue"
        size="xs"
        leftSection={<IconMessage size={16} />}
        onClick={(e) => {
          e.stopPropagation();
          setChatOpen(true);
        }}
      >
        Contact Landlord
      </Button>
      <Button
        variant="outline"
        color="teal"
        size="xs"
        leftSection={<IconUser size={16} />}
        onClick={(e) => {
          e.stopPropagation();
          ownerProfile(property.userId);
        }}
      >
        Owner Profile
      </Button>
    </Group>
  );

  return (
    <>
      <Card
        shadow="md"
        padding="md"
        radius="lg"
        withBorder
        h={400}
        w={320}
        m="auto"
        style={{ cursor: 'default' }}
      >
        <Card.Section h={180} pos="relative">
          <Image
            src={property.photos?.[0] || "/placeholder-image.jpg"}
            height={180}
            alt={property?.title || "Property image"}
            fit="cover"
            fallbackSrc="/placeholder-image.jpg"
            style={{ objectPosition: 'center' }}
          />
          <Badge
            color="blue"
            variant="filled"
            size="sm"
            pos="absolute"
            top={10}
            right={10}
          >
            Renting
          </Badge>
        </Card.Section>

        <Box pt="md" pb="md" style={{ height: 'calc(100% - 180px)', display: 'flex', flexDirection: 'column' }}>
          {renderCardContent()}
          <Box mt="auto">
            {renderActions()}
          </Box>
        </Box>
      </Card>

      {chatOpen && (
        <ChatArea
          ownerId={property.userId}
          ownerName={property.host || "Landlord"}
          ownerAvatar={property.avatar}
          onClose={() => setChatOpen(false)}
        />
      )}
    </>
  );
}

// PropertyGrid component to display properties
function PropertyGrid({ properties }) {
  if (!properties?.length) {
    return (
      <Paper withBorder p="xl" radius="md" mt="md">
        <Text ta="center" c="dimmed">No rented properties found</Text>
      </Paper>
    );
  }

  return (
    <Box style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
      gap: '16px',
      padding: '16px 0'
    }}>
      {properties.map(property => (
        <PropertyCard
          key={property.listingId}
          property={property}
        />
      ))}
    </Box>
  );
}

// MyRentalsContent component for main content
function MyRentalsContent({ properties={} }) {


    const rentedListings=!properties?[]:properties
  
  const navigate = useNavigate();


  if (!rentedListings) {
    return (
      <Center style={{ height: '80vh' }}>
        <Text size="xl" style={{color:'red'}}>Failed to load rentals data</Text>
      </Center>
    );
  }

  return (
    <Container size="xl" py="xl">
        <Title order={2} mb={30}>My Rentals</Title>


      <PropertyGrid
       
        properties={rentedListings}
      />
    </Container>
  );
}

// Main MyRentals component
export default function MyRentals() {
  const { propertyData, redirect } = useLoaderData() || {};
  const navigate = useNavigate();

  if (redirect) {
    navigate(redirect);
    return null;
  }

  return (
    <AppShell header={{ height: 80 }}>
      <SearchHeader />
      <AppShell.Main>
        <Suspense fallback={
          <Center style={{ height: "calc(100vh - 120px)" }}>
            <Loader color="blue" type="bars" size="xl" />
          </Center>
        }>
          <Await resolve={propertyData}>
            {(resolvedData) => <MyRentalsContent properties={resolvedData} />}
          </Await>
        </Suspense>
      </AppShell.Main>
    </AppShell>
  );
}