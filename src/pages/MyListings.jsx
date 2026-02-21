import { useState } from 'react';
import { useLoaderData, Await, useNavigate, redirect } from 'react-router-dom';
import { Suspense } from 'react';
import {
  AppShell, Text, Title, Container, Badge, Button, Paper, Tabs, Group, Box, Card, Image, ActionIcon,
  Modal, Textarea,  Avatar, ScrollArea, Notification, useMantineTheme,
  Loader, Center
} from "@mantine/core";
import { IconEdit, IconTrash, IconMessage, IconUser, IconX, IconCircleCheck, IconCheck } from '@tabler/icons-react';
import SearchHeader from "./SearchHeader";

// Loader function to fetch user listings
export async function loader() {
    const userId =localStorage.getItem('userId')
    if (!userId) {
        throw redirect ("/")
        
    }
  
  try {
   

    const listingsDataPromise = fetch(`http://localhost:5000/myListings?userId=${userId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    }).then(async (response) => {
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch listings');
      }
      return await response.json();
    }).catch(err => {
      console.error('Listings fetch failed:', err.message);
      return { unpublished: [], active: [], rented: [] };
    });

    return { listingsData: listingsDataPromise };
  } catch (err) {
    console.error('Loader error:', err.message);
    return { listingsData: Promise.resolve({ unpublished: [], active: [], rented: [] }) };
  }
}

// ChatArea component for messaging
function ChatArea({ ownerId, ownerName, onClose }) {
  const theme = useMantineTheme();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [notification, setNotification] = useState(false);

  const sendMessage = async () => {
    const userId = localStorage.getItem('userId');
    if (!userId || !message) return;

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

      if (!response.ok) {
        const result = await response.json();
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
          <Text fw={500}>Chat with {ownerName}</Text>
      }
      size="md"
    >
      <Box style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
        <ScrollArea style={{ flex: 1 }} mb="md">
          {messages.length ? messages.map(msg => (
            <Box key={msg.id} mb="sm" p="sm" bg={msg.sender === 'You' ? theme.colors.blue[0] : theme.colors.gray[0]} style={{ borderRadius: '8px' }}>
              <Text fw={500}>{msg.sender}</Text>
              <Text>{msg.content}</Text>
              <Text size="xs" c="dimmed" ta="right">{msg.timestamp}</Text>
            </Box>
          )) : (
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
          <Button fullWidth onClick={sendMessage}>Send Message</Button>
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

// PropertyCard component
function PropertyCard({ property, onStatusUpdate, onDelete }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const navigate = useNavigate();


 

  const handlePublish = async (listingId, currentStatus) => {
    setIsPublishing(true);
    const newStatus = !currentStatus;
    try {
      const response = await fetch('http://localhost:5000/listings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json',
          'x-action-type': 'handle-publishing'

         },
        body: JSON.stringify({ listingId, unpublished: newStatus })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${newStatus ? 'unpublish' : 'publish'} listing`);
      }

      const result = await response.json();
      onStatusUpdate(listingId, result.updatedListing, newStatus);
    } catch (error) {
      console.error(`${newStatus ? 'Unpublish' : 'Publish'} error:`, error);
      alert(`${newStatus ? 'Unpublish' : 'Publish'} failed: ${error.message}`);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDelete = async (listingId) => {
    if (!window.confirm("Permanently delete this listing?")) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`http://localhost:5000/listings?listingId=${listingId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 404 && errorData.error === 'Listing not found') {
          onDelete(listingId);
          return;
        }
        throw new Error(errorData.error || 'Delete failed');
      }

      onDelete(listingId);
    } catch (error) {
      console.error("Delete error:", error);
      alert(error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCardClick = (id) => {
    if (property.listingType !== "rented") navigate(`/room/${id}`);

  } 
  

  const RenterProfile = (id) => navigate(`/owner/${id}`);

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
        style={{ cursor: property.listingType === "rented" ? 'default' : 'pointer' }}
        onClick={() => handleCardClick(property.listingId)}
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
            color={property.listingType === "rented" ? "blue" : property.unpublished ? "yellow" : "green"}
            variant="filled"
            size="sm"
            pos="absolute"
            top={10}
            right={10}
          >
            {property.listingType === "rented" ? "Renting" : property.unpublished ? "Draft" : "Available"}
          </Badge>
        </Card.Section>
        <Box pt="md" pb="md" style={{ height: 'calc(100% - 180px)', display: 'flex', flexDirection: 'column' }}>
          <Text fw={600} size="lg">{property?.title || "Untitled Property"}</Text>
          <Text size="sm" c="dimmed" mt={4} mb={12} lineClamp={2}>{property?.description || "No description available"}</Text>
          <Text fw={700} size="md">{`${property?.price}TND/month` || "N/A"}</Text>
          <Text size="sm" c="dimmed" mt={4}>
            {property.listingType === "rented" ? "Rented recently" : property.unpublished ? "Created recently" : "Published recently"}
          </Text>
          <Box mt="auto">
            {property.listingType !== "rented" ? (
              <Group justify="space-between" mt="md">
                <ActionIcon
                  variant="subtle"
                  color="red"
                  onClick={(e) => { e.stopPropagation(); handleDelete(property.listingId); }}
                  loading={isDeleting}
                >
                  <IconTrash size={20} />
                </ActionIcon>
                <Button
                  variant="filled"
                  color={property.unpublished ? "green" : "yellow"}
                  size="xs"
                  onClick={(e) => { e.stopPropagation(); handlePublish(property.listingId, property.unpublished); }}
                  loading={isPublishing}
                  disabled={isPublishing}
                >
                  {isPublishing ? (property.unpublished ? "Publishing..." : "Unpublishing...") : (property.unpublished ? "Publish" : "Unpublish")}
                </Button>
              </Group>
            ) : (
              <Group grow mt="md">
                <Button
                  variant="outline"
                  color="blue"
                  size="xs"
                  leftSection={<IconMessage size={16} />}
                  onClick={(e) => { e.stopPropagation(); setChatOpen(true); }}
                >
                  Contact Landlord
                </Button>
                <Button
                  variant="outline"
                  color="teal"
                  size="xs"
                  leftSection={<IconUser size={16} />}
                  onClick={(e) => { e.stopPropagation(); RenterProfile(property.renterId); }}
                >
                  Renter Profile
                </Button>
              </Group>
            )}
          </Box>
        </Box>
      </Card>
      {chatOpen && (
        <ChatArea
          ownerId={property.renterId}
          ownerName={ "The Renter"}
          onClose={() => setChatOpen(false)}
        />
      )}
    </>
  );
}

// PropertyGrid component
function PropertyGrid({ properties, onStatusUpdate, onDelete }) {
  if (!properties?.length) {
    return (
      <Paper withBorder p="xl" radius="md" mt="md">
        <Text ta="center" c="dimmed">No properties found in this category</Text>
      </Paper>
    );
  }

  return (
    <Box style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px', padding: '16px 0' }}>
      {properties.map(property => (
        <PropertyCard
          key={property.listingId}
          property={property}
          onStatusUpdate={onStatusUpdate}
          onDelete={onDelete}
        />
      ))}
    </Box>
  );
}

// MyListingsContent component
function MyListingsContent({ listingsData = { unpublished: [], active: [], rented: [] } }) {
  const [activeTab, setActiveTab] = useState("unpublished");
  const [unpublishedListings, setUnpublishedListings] = useState(listingsData.unpublished || []);
  const [activeListings, setActiveListings] = useState(listingsData.active || []);
  const rentedListings = listingsData.rented || [];
  const navigate = useNavigate();

  const categorizedListings = {
    unpublished: unpublishedListings,
    active: activeListings,
    rented: rentedListings
  };

  const handleStatusUpdate = (listingId, updates, newStatus) => {
    if (newStatus) {
      setActiveListings(prev => prev.filter(item => item.listingId !== listingId));
      setUnpublishedListings(prev => [...prev, { ...prev.find(item => item.listingId === listingId) || updates, ...updates }]);
    } else {
      setUnpublishedListings(prev => prev.filter(item => item.listingId !== listingId));
      setActiveListings(prev => [...prev, { ...prev.find(item => item.listingId === listingId) || updates, ...updates }]);
    }
  };

  const handleDelete = (listingId) => {
    setUnpublishedListings(prev => prev.filter(item => item.listingId !== listingId));
    setActiveListings(prev => prev.filter(item => item.listingId !== listingId));
  };

  if (!unpublishedListings || !activeListings || !rentedListings) {
    return (
      <Center style={{ height: '80vh' }}>
        <Text size="xl" style={{ color: 'red' }}>Failed to load myListings data</Text>
      </Center>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="xl">
        <Title order={2}>My Listings</Title>
        <Button color="blue" leftSection={<span>+</span>} onClick={() => navigate('/createListing')}>
          Create Listing
        </Button>
      </Group>
      <Tabs value={activeTab} onChange={setActiveTab} mb="xl">
        <Tabs.List grow>
          <Tabs.Tab value="unpublished">UNPUBLISHED ({categorizedListings.unpublished.length})</Tabs.Tab>
          <Tabs.Tab value="active">ACTIVE ({categorizedListings.active.length})</Tabs.Tab>
          <Tabs.Tab value="rented">RENTING ({categorizedListings.rented.length})</Tabs.Tab>
        </Tabs.List>
      </Tabs>
      <PropertyGrid
        properties={categorizedListings[activeTab]}
        onStatusUpdate={handleStatusUpdate}
        onDelete={handleDelete}
      />
    </Container>
  );
}

// Main MyListings component
export default function MyListings() {
  const { listingsData, redirect } = useLoaderData() || {};
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
          <Await resolve={listingsData}>
            {(resolvedData) => <MyListingsContent listingsData={resolvedData} />}
          </Await>
        </Suspense>
      </AppShell.Main>
    </AppShell>
  );
}