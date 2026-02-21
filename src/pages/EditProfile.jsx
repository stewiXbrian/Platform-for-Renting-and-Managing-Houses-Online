import {
  AppShell,
  Title,
  Container,
  Text,
  Button,
  TextInput,
  Select,
  Stack,
  Paper,
  FileInput,
  Avatar,
  ActionIcon,
  Grid,
  Textarea,
  MultiSelect,
  Center,
  Box,
  Group,
  Notification
} from "@mantine/core";
import { useForm } from '@mantine/form';
import {
  IconX,
  IconCamera,
  IconDeviceFloppy,
  IconArrowLeft,
  IconAlertCircle,
  IconPhone
} from "@tabler/icons-react";
import { useNavigate, useLoaderData } from 'react-router-dom';
import { useState } from 'react';

/* EditProfile.jsx Loader */
export const loader = async ({ request }) => {
  try {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      return { redirect: '/signup', profileData: null };
    }

    const response = await fetch(`http://localhost:5000/profile?userId=${userId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch profile');
    }

    const result = await response.json();
    const profileData = {
      bio: result.bio || '',
      avatar: result.avatar || '/default-avatar.png',
      created_at: result.created_at || '',
      location: result.location || '',
      languages: Array.isArray(result.languages) ? result.languages : [],
      interests: Array.isArray(result.interests) ? result.interests : [],
      is_phone_verified: result.is_phone_verified || false,
      phone_number: result.phone_number || ''
    };

    return { profileData };
  } catch (err) {
    console.error("Profile fetch failed:", err.message);
    return { profileData: null, error: err.message };
  }
};

export default function EditProfile() {
  const navigate = useNavigate();
  const { profileData } = useLoaderData() || { profileData: null };
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Safely split location, default to empty strings if missing
  const [city, country] = profileData?.location ? profileData.location.split(', ') : ['', ''];

  const form = useForm({
    initialValues: {
      country: country || '',
      city: city || '',
      bio: profileData?.bio || '',
      interests: Array.isArray(profileData?.interests) ? profileData.interests : [],
      languages: Array.isArray(profileData?.languages) ? profileData.languages : [],
      avatarUrl: profileData?.avatar || '',
      avatarFile: null,
      phone_number: profileData?.phone_number || '',
      is_phone_verified: profileData?.is_phone_verified || false
    },
    validate: {
      country: (value) => (!value ? 'Country is required' : null),
      city: (value) => (!value ? 'City is required' : null),
      bio: (value) => (!value ? 'Bio is required' : null),
      avatarUrl: (value) => (!value ? 'Profile photo is required' : null),
      phone_number: (value) => {
        if (!value) return 'Phone number is required';
        if (!/^\d{8}$/.test(value)) return 'Phone number must be exactly 8 digits';
        return null;
      },
    },
  });

  const interestOptions = [
    "Hiking", "Photography", "Sustainable Living", "Reading", "Cooking",
    "Travel", "Music", "Art", "Yoga", "Skiing", "Gaming", "Movies"
  ];

  const languageOptions = [
    "English", "Norwegian", "German", "Spanish", "French", "Italian",
    "Portuguese", "Russian", "Chinese", "Japanese"
  ];

  const countries = [
    "Norway", "Germany", "France", "United Kingdom", "United States",
    "Canada", "Spain", "Italy", "Sweden", "Denmark", "Finland"
  ];

  const handleAvatarUpload = (file) => {
    if (!file) return;
    const photoUrl = URL.createObjectURL(file);
    form.setFieldValue('avatarUrl', photoUrl);
    form.setFieldValue('avatarFile', file);
  };

  const handleSubmit = async () => {
    try {
      const userId = localStorage.getItem('userId');
      
      if (!userId) {
        throw new Error('No user ID found. Please log in.');
      }

      // Create FormData for multipart request
      const formData = new FormData();
      
      // Add userId and all form values as a single JSON string
      formData.append('data', JSON.stringify({
        ...form.values,
        userId,
        location: `${form.values.city}, ${form.values.country}`,
        avatarFile: undefined // Remove the file from JSON data
      }));

      if (form.values.avatarFile) {
        formData.append('avatar', form.values.avatarFile);
      }
      
      const response = await fetch(`http://localhost:5000/profile?userId=${userId}`, {
        method: 'PUT',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Profile update failed');
      }

      const result = await response.json();
      setTimeout(() => navigate('/profile'), 1000);
    } catch (err) {
      console.error('Profile update error:', err);
      setError(err.message || 'Failed to update profile');
      setIsSubmitting(false);
    } 
  };

  return (
    <AppShell>
      <AppShell.Main>
        <Container size="lg" py="xl">
          <Paper shadow="sm" radius="md" p="xl" withBorder>
            <Group justify="space-between" mb="xl">
              <Title order={2}>Edit Your Profile</Title>
              <Text size="sm" c="dimmed">* Required fields</Text>
            </Group>
            {error && (
              <Notification
                icon={<IconAlertCircle size={18} />}
                color="red"
                title="Error"
                onClose={() => setError(null)}
                mb="lg"
              >
                {error}
              </Notification>
            )}
            <Box component="form" onSubmit={form.onSubmit(handleSubmit)}>
              <Grid gutter={40}>
                <Grid.Col span={{ base: 12, md: 7 }}>
                  <Stack gap="lg">
                    <Box>
                      <Text fw={500} mb="xs">Where are you based? *</Text>
                      <Group grow>
                        <Select
                          data={countries}
                          placeholder="Select country"
                          searchable
                          withAsterisk
                          {...form.getInputProps('country')}
                        />
                        <TextInput
                          placeholder="Your city"
                          withAsterisk
                          {...form.getInputProps('city')}
                        />
                      </Group>
                    </Box>
                    <Box>
                      <Text fw={500} mb="xs">Phone Number *</Text>
                      <TextInput
                        leftSection={<IconPhone size={16} />}
                        placeholder="Enter 8-digit phone number"
                        withAsterisk
                        maxLength={8}
                        {...form.getInputProps('phone_number')}
                      />
                      <Text size="xs" c="dimmed" mt={5}>
                        {form.values.is_phone_verified ? (
                          <Text span c="green">Phone number verified</Text>
                        ) : (
                          "We'll send a verification code to this number"
                        )}
                      </Text>
                    </Box>
                    <Box>
                      <Text fw={500} mb="xs">About you *</Text>
                      <Textarea
                        placeholder="Tell others about yourself..."
                        minRows={3}
                        autosize
                        maxRows={6}
                        withAsterisk
                        {...form.getInputProps('bio')}
                      />
                    </Box>
                    <Box>
                      <Text fw={500} mb="xs">Your interests</Text>
                      <MultiSelect
                        data={interestOptions}
                        placeholder="Select your interests"
                        searchable
                        maxSelectedValues={5}
                        {...form.getInputProps('interests')}
                      />
                      <Text size="xs" c="dimmed" mt={5}>Up to 5 interests</Text>
                    </Box>
                    <Box>
                      <Text fw={500} mb="xs">Languages you speak</Text>
                      <MultiSelect
                        data={languageOptions}
                        placeholder="Select languages"
                        searchable
                        {...form.getInputProps('languages')}
                      />
                    </Box>
                  </Stack>
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 5 }}>
                  <Paper p="md" radius="md" withBorder>
                    <Text fw={500} mb="lg" ta="center">Profile Photo *</Text>
                    <Center>
                      <Box pos="relative">
                        <Avatar
                          src={form.values.avatarUrl || '/default-avatar.png'}
                          size={180}
                          radius="xl"
                          mx="auto"
                          mb="sm"
                          bg="blue.1"
                          color="blue.6"
                        />
                        {form.values.avatarUrl && (
                          <ActionIcon
                            color="red"
                            radius="xl"
                            variant="filled"
                            size="sm"
                            style={{ position: 'absolute', top: 5, right: 5 }}
                            onClick={() => {
                              form.setFieldValue('avatarUrl', null);
                              form.setFieldValue('avatarFile', null);
                            }}
                          >
                            <IconX size={14} />
                          </ActionIcon>
                        )}
                      </Box>
                    </Center>
                    <FileInput
                      leftSection={<IconCamera size={16} />}
                      placeholder={form.values.avatarUrl ? "Change photo" : "Upload photo"}
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      mx="auto"
                      mt="lg"
                      style={{ maxWidth: 250 }}
                      error={form.errors.avatarUrl}
                    />
                    <Text size="xs" c="dimmed" mt="lg" ta="center">
                      A clear photo helps build community trust
                    </Text>
                  </Paper>
                </Grid.Col>
              </Grid>
              <Group justify="space-between" mt="xl" pt="md" style={{ borderTop: `1px solid #e9ecef` }}>
                <Button
                  variant="subtle"
                  color="gray"
                  onClick={() => navigate('/profile')}
                  leftSection={<IconArrowLeft size={16} />}
                  type="button"
                >
                  Cancel
                </Button>
                <Button
                  leftSection={<IconDeviceFloppy size={16} />}
                  type="submit"
                  variant="filled"
                  color="blue"
                  loading={isSubmitting}
                  disabled={isSubmitting}
                >
                  Save Changes
                </Button>
              </Group>
            </Box>
          </Paper>
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}