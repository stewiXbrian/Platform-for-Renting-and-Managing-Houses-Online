import {
  AppShell,
  Box,
  Title,
  Container,
  Text,
  Group,
  Avatar,
  Button,
  Tabs,
  Paper,
  Badge,
  Stack,
  rem,
  useMantineTheme,
  Center,
  Loader
} from "@mantine/core";
import {
  IconMapPin,
  IconCalendar,
  IconLanguage,
  IconPhone,
  IconEdit,
  IconSparkles,
  IconStar,
  IconHome2
} from "@tabler/icons-react";
import { useLoaderData, useNavigate, Await, redirect } from "react-router-dom";
import { Suspense, useState } from "react";
import SearchHeader from "./SearchHeader";

// Loader function to fetch profile data from the server
export const loader = async () => {
  const userId =localStorage.getItem('userId')
  if (!userId) {
      throw redirect ("/")
      
  }
  
  try {
    
    

    const profileDataPromise = fetch(`http://localhost:5000/profile?userId=${userId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })
      .then(async (response) => {
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to fetch profile');
        }

        const result = await response.json();
        return {
          email: result.email || '',
          host: result.host || '',
          bio: result.bio || '',
          avatar: result.avatar || '/default-avatar.png',
          created_at: result.created_at || '',
          location: result.location || '',
          languages: result.languages || [],
          interests: result.interests || [],
          is_phone_verified: result.is_phone_verified || false,
          phone_number: result.phone_number || '',
        };
      })
      .catch((err) => {
        console.error("Profile fetch failed:", err.message);
        return null;
      });

    return { profileData: profileDataPromise };
  } catch (err) {
    console.error("Profile fetch failed:", err.message);
    return { profileData: Promise.resolve(null) };
  }
};

// Profile content component
function ProfileContent({ data = {} }) {
  const navigate = useNavigate();
  const theme = useMantineTheme();
  const [activeTab, setActiveTab] = useState('reviews');

  const formatDate = (dateString) => {
    if (!dateString) return "Unknown";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (!data) {
    return (
      <Center style={{ height: '80vh' }}>
        <Text size="xl" fw={500} style={{ color: 'red' }}>Failed to load profile data</Text>
      </Center>
    );
  }
localStorage.setItem('tabData', JSON.stringify({
  host: data?.host,
  avatar: data?.avatar
}));


  return (
    <Container size="lg" py="xl">
      <Paper radius="lg" withBorder shadow="md" mb="xl">
        <Box
          h={200}
          style={{
            background: `linear-gradient(135deg, ${theme.colors.blue[5]}, ${theme.colors.violet[5]})`,
            borderRadius: `${theme.radius.lg}px ${theme.radius.lg}px 0 0`
          }}
        />
        <Box px="xl" py="lg">
          <Group gap="xl" align="flex-start">
            <Box style={{ marginTop: "-80px" }}>
              <Stack align="center" gap="sm">
                <Box pos="relative">
                  <Avatar
                    size={160}
                    radius={80}
                    src={data?.avatar || '/default-avatar.png'}
                    style={{
                      border: `4px solid white`,
                      boxShadow: theme.shadows.md
                    }}
                  />
                </Box>
                <Button
                  variant="subtle"
                  size="md"
                  radius="md"
                  leftSection={<IconEdit size={18} stroke={1.5} />}
                  onClick={() => navigate("/editProfile")}
                >
                  Edit Profile
                </Button>
              </Stack>
            </Box>
            <Box style={{ flex: 1 }}>
              <Stack gap="lg">
                <div>
                  <Title order={2} fw={600}>
                    {data?.host || "User"}
                  </Title>
                  <Group gap={8} wrap="nowrap">
                    <IconMapPin size={18} stroke={1.5} color={theme.colors.gray[6]} />
                    <Text size="md" c="dimmed">{data?.location || "Location not set"}</Text>
                    <Text size="md" c="dimmed">•</Text>
                    <IconCalendar size={18} stroke={1.5} color={theme.colors.gray[6]} />
                    <Text size="md" c="dimmed">Joined {formatDate(data?.created_at)}</Text>
                    <Text size="md" c="dimmed">•</Text>
                    <IconPhone size={18} stroke={1.5} color={theme.colors.gray[6]} />
                    <Text size="md" c="dimmed">{data?.phone_number || "Phone number not set"}</Text>
                  </Group>
                </div>
                <Text size="md" c="dimmed" lineClamp={3}>
                  {data?.bio || "No bio provided yet. Edit your profile to add one!"}
                </Text>
                <Group gap={8}>
                  <Badge
                    size="md"
                    color={data?.is_phone_verified ? "teal" : "red"}
                    variant="light"
                    leftSection={<IconPhone size={16} />}
                  >
                    {data?.is_phone_verified ? "Phone Verified" : "Phone Not Verified"}
                  </Badge>
                </Group>
                <Paper withBorder p="lg" radius="md" style={{ background: theme.colors.gray[0] }}>
                  <Group gap="xl" wrap="wrap">
                    <Box style={{ flex: '1 1 200px' }}>
                      <Group gap={8} mb="sm">
                        <IconLanguage size={18} stroke={1.5} color={theme.colors.blue[6]} />
                        <Text size="md" fw={500}>Languages</Text>
                      </Group>
                      <Group gap={8}>
                        {(data?.languages && Array.isArray(data.languages) && data.languages.length > 0) ? (
                          data.languages.map((lang, index) => (
                            <Badge key={lang || index} color="blue" variant="light" size="md">{lang || 'Unknown'}</Badge>
                          ))
                        ) : (
                          <Text size="sm" c="dimmed">No languages added yet</Text>
                        )}
                      </Group>
                    </Box>
                    <Box style={{ flex: '1 1 200px' }}>
                      <Group gap={8} mb="sm">
                        <IconSparkles size={18} stroke={1.5} color={theme.colors.violet[6]} />
                        <Text size="md" fw={500}>Interests</Text>
                      </Group>
                      <Group gap={8}>
                        {(data?.interests && Array.isArray(data.interests) && data.interests.length > 0) ? (
                          data.interests.map((interest, index) => (
                            <Badge key={interest || index} color="violet" variant="light" size="md">{interest || 'Unknown'}</Badge>
                          ))
                        ) : (
                          <Text size="sm" c="dimmed">No interests added yet</Text>
                        )}
                      </Group>
                    </Box>
                  </Group>
                </Paper>
              </Stack>
            </Box>
          </Group>
        </Box>
      </Paper>

      <Tabs value={activeTab} onChange={setActiveTab} radius="md">
        <Tabs.List>
          <Tabs.Tab value="reviews" leftSection={<IconStar size={18} stroke={1.5} />}>
            Reviews
          </Tabs.Tab>
          <Tabs.Tab value="properties" leftSection={<IconHome2 size={18} stroke={1.5} />}>
            Properties
          </Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="reviews" pt="lg">
          <Paper withBorder p="xl" radius="md" shadow="sm">
            <Title order={4} mb="lg">Your Reviews</Title>
            <Text size="md" c="dimmed" mb="lg">
              Reviews from tenants and hosts will appear here.
            </Text>
            <Stack gap="lg">
              <Paper withBorder p="md" radius="md">
                <Text size="md" c="dimmed" ta="center">
                  No reviews yet. Start hosting or renting to receive feedback!
                </Text>
              </Paper>
            </Stack>
          </Paper>
        </Tabs.Panel>
        <Tabs.Panel value="properties" pt="lg">
          <Paper withBorder p="xl" radius="md" shadow="sm">
            <Title order={4} mb="lg">Your Properties</Title>
            <Text size="md" c="dimmed" mb="lg">
              Properties you’ve listed for rent will appear here.
            </Text>
            <Stack gap="lg">
              <Paper withBorder p="md" radius="md">
                <Text size="md" c="dimmed" ta="center">
                  No properties listed yet. Add a property to get started!
                </Text>
                <Center mt="md">
                  <Button
                    variant="light"
                    size="md"
                    radius="md"
                    onClick={() => navigate("/addProperty")}
                  >
                    List a Property
                  </Button>
                </Center>
              </Paper>
            </Stack>
          </Paper>
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
}



export default function Profile() {


  const navigate = useNavigate();
  const { profileData, redirect } = useLoaderData() || {};

  if (redirect) {
    navigate(redirect);
    return null;
  }

  return (
    <AppShell header={{ height: 80 }}>
      <SearchHeader />
      <AppShell.Main>
        <Suspense fallback={<Center style={{ height: "calc(100vh - 120px)" }}>
          <Loader color="blue" type="bars" size="xl" />
        </Center>}>
          <Await resolve={profileData}>
            {(resolvedProfileData) => <ProfileContent data={resolvedProfileData} />}
          </Await>
        </Suspense>
      </AppShell.Main>
    </AppShell>
  );
}