import {
  AppShell,
  Box,
  Title,
  Container,
  Text,
  Group,
  Avatar,
  Badge,
  Grid,
  Paper,
  Divider,
  Stack,
  rem,
  useMantineTheme,
  ThemeIcon,
  Button,
  SimpleGrid,
  Anchor,
  Modal,
  ScrollArea,
  Center,
  Loader
} from "@mantine/core";
import {
  IconCheck,
  IconMapPin,
  IconCalendar,
  IconLanguage,
  IconStar,
  IconPhone,
  IconHeart,
  IconChevronRight
} from "@tabler/icons-react";
import { useState, Suspense } from 'react';
import { useLoaderData, useNavigate, Await } from "react-router-dom";
import SearchHeader from "./SearchHeader";

// Loader function to fetch user data from the server
export async function loader({ params }) {
  try {
    const userId = params?.userId || '';

    const userDataPromise = fetch(`http://localhost:5000/profile?userId=${userId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    }).then(async (response) => {
      if (!response.ok) {
        const error = await response.json();
        console.error("API Error response:", error);
        throw new Error(error.error || 'Failed to fetch user data');
      }
      return await response.json();
    }).then(result => ({
      host: result.host || '',
      joined: result.created_at || '',
      location: result.location || '',
      bio: result.bio || '',
      languages: result.languages || [],
      interests: result.interests || [],
      listings: result.listings || 0,
      reviews: result.reviews || 0,
      avgRating: result.avgRating || 0,
      avatar: result.avatar || '/default-avatar.png',
      is_phone_verified: result.is_phone_verified || false,
      phone_number: result.phone_number || '',
      userListings: result.userListings || [],
      userReviews: result.userReviews || []
    })).catch(err => {
      console.error("User fetch failed:", err);
      return null;
    });

    return { userData: userDataPromise };
  } catch (err) {
    console.error("Loader error:", err);
    return { userData: Promise.resolve(null) };
  }
}

// Owner content component
function OwnerContent({ userData }) {
  const theme = useMantineTheme();
  const navigate = useNavigate();
  const [expandedReviews, setExpandedReviews] = useState({});
  const [reviewsModalOpen, setReviewsModalOpen] = useState(false);
  const [listingsModalOpen, setListingsModalOpen] = useState(false);

  const initialVisibleReviews = 3;
  const initialVisibleListings = 3;

  if (!userData) {
    return (
      <Center style={{ height: '80vh' }}>
        <Text color="red">Failed to load user data.</Text>
      </Center>
    );
  }

  const InfoItem = ({ icon: Icon, text }) => (
    <Group gap={8} wrap="nowrap">
      <Icon size={18} stroke={1.5} color={theme.colors.gray[6]} />
      <Text size="sm" c="dimmed">{text}</Text>
    </Group>
  );

  const PhoneVerificationBadge = () => (
    userData.is_phone_verified ? (
      <Badge variant="light" color="teal" size="sm" radius="xl" leftSection={<IconPhone size={14} />}>
        Phone Verified
      </Badge>
    ) : (
      <Badge variant="light" color="red" size="sm" radius="xl" leftSection={<IconPhone size={14} />}>
        Phone Not Verified
      </Badge>
    )
  );

  const ListingCard = ({ listing }) => (
    <Paper withBorder radius="md" p="sm" component="a" href="#">
      <Stack gap="xs">
        <Box h={120} style={{ background: `url(${listing.image}) center/cover`, borderRadius: theme.radius.sm }} />
        <Text fw={500} size="sm" lineClamp={1}>{listing.title}</Text>
        <Text size="xs" c="dimmed">{listing.price}</Text>
      </Stack>
    </Paper>
  );

  const ReviewCard = ({ review, showFull = false, inModal = false }) => {
    const isExpanded = expandedReviews[review.id] || showFull;
    const commentPreviewLength = 150;
    const showMoreButton = !showFull && review.comment.length > commentPreviewLength && !isExpanded;

    return (
      <Paper withBorder radius="md" p="md">
        <Stack gap="sm">
          <Group justify="space-between">
            <Group>
              <Avatar color="blue" radius="xl" size={inModal ? "md" : "sm"}>
                {review.avatar || review.reviewer.charAt(0)}
              </Avatar>
              <div>
                <Text fw={500} size="sm">{review.reviewer}</Text>
                <Text size="xs" c="dimmed">{review.date}</Text>
              </div>
            </Group>
            <Badge variant="light" leftSection={<IconStar size={14} />}>{review.rating}.0</Badge>
          </Group>

          <Text size="sm" c="dimmed" style={{ lineHeight: 1.5 }}>
            {isExpanded ? review.comment : review.comment.substring(0, commentPreviewLength) + (showMoreButton ? '...' : '')}
          </Text>

          {showMoreButton && (
            <Anchor
              size="sm"
              onClick={() => setExpandedReviews({ ...expandedReviews, [review.id]: true })}
              style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
            >
              Show more
              <IconChevronRight size={16} style={{ marginLeft: 4 }} />
            </Anchor>
          )}
        </Stack>
      </Paper>
    );
  };

  const ReviewsModal = () => (
    <Modal
      opened={reviewsModalOpen}
      onClose={() => setReviewsModalOpen(false)}
      title={
        <Group>
          <IconStar size={20} color={theme.colors.yellow[6]} fill={theme.colors.yellow[6]} />
          <Text fw={600} size="lg">{userData.avgRating?.toFixed(2)} · {userData.reviews} reviews</Text>
        </Group>
      }
      size="lg"
      scrollAreaComponent={ScrollArea.Autosize}
      styles={{
        title: { fontWeight: 'bold' },
        body: { paddingRight: '1rem' },
        content: { overflow: 'hidden' }
      }}
    >
      <ScrollArea h={400} offsetScrollbars>
        <Stack gap="lg" mt="md">
          {userData.userReviews?.map(review => (
            <ReviewCard key={review.id} review={review} showFull={true} inModal={true} />
          ))}
        </Stack>
      </ScrollArea>
    </Modal>
  );

  const ListingsModal = () => (
    <Modal
      opened={listingsModalOpen}
      onClose={() => setListingsModalOpen(false)}
      title={<Text fw={600} size="lg">{`${userData.host}'s Listings (${userData.userListings?.length})`}</Text>}
      size="lg"
      scrollAreaComponent={ScrollArea.Autosize}
      styles={{
        title: { fontWeight: 'bold' },
        body: { paddingRight: '1rem' },
        content: { overflow: 'hidden' }
      }}
    >
      <ScrollArea h={400} offsetScrollbars>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mt="md">
          {userData.userListings?.map(listing => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </SimpleGrid>
      </ScrollArea>
    </Modal>
  );

  return (
    <Container size="lg" py="xl">
      <Grid gutter="xl">
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Paper withBorder shadow="md" p="lg" radius="lg">
            <Stack align="center" gap="lg">
              <Box pos="relative">
                <Avatar
                  src={userData.avatar}
                  size={140}
                  radius={70}
                  style={{
                    border: `4px solid white`,
                    boxShadow: theme.shadows.md
                  }}
                />
              </Box>
              <Title order={3} ta="center">{userData.host}</Title>
              
              <Divider w="100%" />
              <Stack gap="sm" w="100%">
                <InfoItem icon={IconMapPin} text={userData.location} />
                <InfoItem icon={IconCalendar} text={`Joined: ${userData.joined}`} />
                <InfoItem icon={IconLanguage} text={`Speaks: ${userData.languages?.join(', ') || 'Not specified'}`} />
                <InfoItem icon={IconHeart} text={`Interests: ${userData.interests?.join(', ') || 'Not specified'}`} />
                <InfoItem icon={IconPhone} text={`phone: ${userData.phone_number || 'Not specified'}`} />
              </Stack>
            </Stack>
          </Paper>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Stack gap="xl">
            <Paper withBorder shadow="md" p="xl" radius="lg">
              <Title order={4} mb="md">About {userData.host}</Title>
              <Text c="dimmed" style={{ lineHeight: 1.6 }}>
                {userData.bio || `${userData.host} hasn't added a bio yet.`}
              </Text>
            </Paper>
            <Paper withBorder shadow="md" p="xl" radius="lg">
              <Group justify="space-between" align="center" mb="lg">
                <Title order={4}>{userData.host}'s Listings ({userData.userListings?.length})</Title>
                {userData.userListings?.length > 0 && (
                  <Anchor
                    size="sm"
                    onClick={() => setListingsModalOpen(true)}
                    style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                  >
                    Show all listings
                    <IconChevronRight size={16} style={{ marginLeft: 4 }} />
                  </Anchor>
                )}
              </Group>
              {userData.userListings?.length > 0 ? (
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                  {userData.userListings.slice(0, initialVisibleListings).map(listing => (
                    <ListingCard key={listing.id} listing={listing} />
                  ))}
                </SimpleGrid>
              ) : (
                <Text c="dimmed" ta="center" py="md">{userData.host} doesn't have any active listings right now.</Text>
              )}
            </Paper>
            <Paper withBorder shadow="md" p="xl" radius="lg">
              <Group justify="space-between" align="center" mb="md">
                <Title order={4}>Reviews ({userData.reviews})</Title>
                <Group gap={5}>
                  <IconStar size={20} color={theme.colors.yellow[6]} fill={theme.colors.yellow[6]} />
                  <Text fw={600} size="lg">{userData.avgRating?.toFixed(2)}</Text>
                </Group>
              </Group>
              {userData.userReviews?.length > 0 ? (
                <Stack gap="lg">
                  {userData.userReviews.slice(0, initialVisibleReviews).map(review => (
                    <ReviewCard key={review.id} review={review} />
                  ))}
                  <Button
                    variant="outline"
                    color="blue"
                    onClick={() => setReviewsModalOpen(true)}
                    style={{ alignSelf: 'flex-start' }}
                  >
                    Show all {userData.reviews} reviews
                  </Button>
                </Stack>
              ) : (
                <Text c="dimmed" ta="center" py="md">No reviews yet for {userData.host}.</Text>
              )}
            </Paper>
          </Stack>
        </Grid.Col>
      </Grid>
      <ReviewsModal />
      <ListingsModal />
    </Container>
  );
}

// Main Owner component
export default function Owner() {
  const { userData, error } = useLoaderData() || {};
  const navigate = useNavigate();

  return (
    <AppShell header={{ height: 80 }}>
      <SearchHeader />
      <AppShell.Main>
        <Suspense fallback={
          <Center style={{ height: "calc(100vh - 120px)" }}>
            <Loader color="blue" type="bars" size="xl" />
          </Center>
        }>
          <Await resolve={userData}>
            {(resolvedUserData) => <OwnerContent userData={resolvedUserData} />}
          </Await>
        </Suspense>
      </AppShell.Main>
    </AppShell>
  );
}