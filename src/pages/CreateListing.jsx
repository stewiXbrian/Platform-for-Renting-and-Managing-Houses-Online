import { 
  AppShell, Stepper, Button, Group, Paper, TextInput, Text, Select, Title, Container, NumberInput, Stack, Textarea, Checkbox, FileInput, SimpleGrid, Image, MultiSelect, Box, Card, Badge, Notification, Space, Grid 
} from "@mantine/core";
import { useForm } from '@mantine/form';
import { IconBed, IconHomeCheck, IconChevronLeft, IconChevronRight, IconPhotoPlus, IconCurrencyEuro, IconCalendarTime, IconCheck, IconX, IconCurrency, IconCurrencyDinar, IconCurrencyDollar, IconTemperatureSun } from "@tabler/icons-react";
import { useState } from "react";
import { useNavigate } from 'react-router-dom';
import LocationSelector from "../Components/LeafletLocationSelector";

const amenities = [
  { value: "wifi", label: "WiFi" },
  { value: "heating", label: "Heating" },
  { value: "air conditioning", label: "Air conditioning" },
  { value: "washing machine", label: "Washing machine" },
  { value: "dryer", label: "Dryer" },
  { value: "dishwasher", label: "Dishwasher" },
  { value: "tv", label: "TV" },
  { value: "elevator", label: "Elevator" },
  { value: "parking", label: "Parking" },
  { value: "balcony", label: "Balcony" },
  { value: "garden", label: "Garden" },
  { value: "pet friendly", label: "Pet friendly" }
]


export default function CreateListing() {
  const navigate = useNavigate();
  const [active, setActive] = useState(0);
  const [notification, setNotification] = useState(null);
  const [imagePreview, setImagePreview] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    initialValues: {
      propertyType: "",
      bedrooms: 0,
      bathrooms: 0,
      title: "",
      description: "",
      photos: [],
      selectedAmenities: [],
      price: 0,
      isFavorite: false,
      unpublished: true,
      reviews: {
        rating: 0,
        numbers: 2,
        comments: [
          { name: 'User1', content: 'Great place!' },
          { name: 'User2', content: 'Loved it!' }
         ] },
      availableFrom: "",
      lengthOfStay: "",
      location: null,
      unavailable:false,
      candidates: 0,
      confirm: false
    },

    validate: {
      propertyType: (value) => (!value ? 'Property type is required' : null),
      bedrooms: (value) => (value < 1 ? 'At least 1 bedroom required' : null),
      bathrooms: (value) => (value < 1 ? 'At least 1 bathroom required' : null),
      title: (value) => (value.length < 3 ? 'Title must be at least 3 characters' : null),
      description: (value) => (value.length < 10 ? 'Description must be at least 10 characters' : null),
      price: (value) => (value <= 0 ? 'Price must be greater than 0' : null),
      availableFrom: (value) => (!value ? 'Availability date is required' : null),
      lengthOfStay: (value) => (!value ? 'Length of stay is required' : null),
      confirm: (value) => (!value ? 'You must confirm the information' : null),
      location: (value) => (!value?.coordinates ? 'Location is required' : null),
    }
  });

  const handleLocationChange = (data) => {
    form.setFieldValue('location', {
      type: "Point",
      coordinates: [data.coordinates.lng, data.coordinates.lat],
      address: data.fullAddress,
      locationText: data.locationText
    });
  };

  const handlePhotos = (files) => {
    if (!files) return;
    const newPhotos = Array.isArray(files) ? files : [files];
    form.setFieldValue('photos', [...form.values.photos, ...newPhotos]);
    
    // Create preview URLs
    const newPreviews = newPhotos.map(file => URL.createObjectURL(file));
    setImagePreview([...imagePreview, ...newPreviews]);
  };

  const removePhoto = (index) => {
    const updatedPhotos = [...form.values.photos];
    const updatedPreviews = [...imagePreview];
    updatedPhotos.splice(index, 1);
    updatedPreviews.splice(index, 1);
    form.setFieldValue('photos', updatedPhotos);
    setImagePreview(updatedPreviews);
  };

  const validateCurrentStep = () => {
    const fieldsByStep = {
      0: ['location'],
      1: ['propertyType', 'bedrooms', 'bathrooms', 'lengthOfStay'],
      2: ['title', 'description', 'selectedAmenities'],
      3: ['price', 'availableFrom'],
      4: ['confirm']
    };
    
    const fields = fieldsByStep[active];
    let isValid = true;
    
    fields.forEach(field => {
      const error = form.validateField(field);
      if (error.error) isValid = false;
    });
    
    return isValid;
  };

  const nextStep = () => {
    if (validateCurrentStep() && active < 4) {
      setActive(active + 1);
      window.scrollTo(0, 0);
    }
  };

  const prevStep = () => {
    if (active > 0) {
      setActive(active - 1);
      window.scrollTo(0, 0);
    }
  };


const handleSubmit = async () => {
  if (!form.validate().hasErrors) {
    setNotification(null);
    setIsSubmitting(true);

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
        userId
      }));

      // Add photos
      form.values.photos.forEach(photo => {
        if (photo) {
          formData.append('photos', photo);
        }
      });

      const response = await fetch('http://localhost:5000/listings', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create listing');
      }

      setNotification({
        color: 'teal',
        title: 'Listing Published',
        message: 'Your listing has been successfully published!',
      });
      
      setTimeout(() => navigate('/myListings'), 1000);
    } catch (err) {
      setNotification({
        color: 'red',
        title: 'Error',
        message: err.message || 'An error occurred while creating your listing',
      });
    } finally {
      setIsSubmitting(false);
    }
  } else {
    setNotification({
      color: 'red',
      title: 'Validation Error',
      message: 'Please complete all required fields.',
    });
  }
};


  return (
    <AppShell>
      <AppShell.Main>
        <Container size="lg" my="xl">
          <Title order={1} ta="center" fw={700} c="blue.8">Create Your Listing</Title>
          <Space h="md" />
          
          {notification && (
            <Notification
              title={notification.title}
              color={notification.color}
              icon={notification.icon}
              onClose={() => setNotification(null)}
              mb="md"
            >
              {notification.message}
            </Notification>
          )}
          
          <Paper shadow="md" p="xl" radius="xl" withBorder>
            <Stepper active={active} color="blue" size="md">
              <Stepper.Step label="Location" icon={<IconHomeCheck size={22} />}>
                <Title order={3} mb="lg" c="blue.7">Property Location</Title>
                <LocationSelector onChange={handleLocationChange} />
              </Stepper.Step>

              <Stepper.Step label="Details" icon={<IconBed size={22} />}>
                <Title order={3} mb="lg" c="blue.7">Property Details</Title>
                <Grid>
                  <Grid.Col span={12}>
                    <Select
                      label="Property Type"
                      placeholder="Select property type"
                      required
                      data={["Entire Place", "Room", "Studio"]}
                      radius="lg"
                      size="md"
                      {...form.getInputProps('propertyType')}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <NumberInput
                      label="Bedrooms"
                      required
                      min={1}
                      radius="lg"
                      size="md"
                      {...form.getInputProps('bedrooms')}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <NumberInput
                      label="Bathrooms"
                      required
                      min={1}
                      precision={1}
                      radius="lg"
                      size="md"
                      {...form.getInputProps('bathrooms')}
                    />
                  </Grid.Col>
                  <Grid.Col span={12}>
                    <Select
                      label="Length of Stay"
                      placeholder="Select preferred length of stay"
                      required
                      data={["1-3 months", "3-6 months", "6-12 months", "Long term (1+ year)"]}
                      radius="lg"
                      size="md"
                      {...form.getInputProps('lengthOfStay')}
                    />
                  </Grid.Col>
                </Grid>
              </Stepper.Step>

              <Stepper.Step label="Description" icon={<IconPhotoPlus size={22} />}>
                <Title order={3} mb="lg" c="blue.7">Description & Photos</Title>
                <Stack>
                  <TextInput
                    label="Title"
                    placeholder="Give your listing an attractive title"
                    required
                    radius="lg"
                    size="md"
                    {...form.getInputProps('title')}
                  />
                  <Textarea
                    label="Description"
                    placeholder="Describe your property in detail"
                    minRows={4}
                    required
                    radius="lg"
                    size="md"
                    {...form.getInputProps('description')}
                  />
                  <MultiSelect
                    label="Amenities"
                    placeholder="Select available amenities"
                    data={amenities}
                    radius="lg"
                    size="md"
                    {...form.getInputProps('selectedAmenities')}
                  />
                  <Box>
                    <Text size="sm" fw={500} mb="xs">Photos (add at least 6)</Text>
                    <Text size="xs" c="dimmed" mb="sm">Upload high-quality images of your property</Text>
                    <FileInput
                      placeholder="Upload photos"
                      accept="image/*"
                      multiple
                      onChange={handlePhotos}
                      radius="lg"
                      size="md"
                      icon={<IconPhotoPlus size={16} />}
                      value={null}
                    />
                  </Box>
                  {imagePreview.length > 0 && (
                    <Box mt="md">
                      <Text size="sm" fw={500} mb="xs">Uploaded Photos ({imagePreview.length}/6)</Text>
                      <SimpleGrid cols={{ base: 4, sm: 6 }} spacing="xs">
                        {imagePreview.map((image, index) => (
                          <Box 
                            key={index} 
                            style={{ 
                              position: 'relative',
                              borderRadius: '8px',
                              overflow: 'hidden',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                              background: '#f8f9fa',
                              width: '100%',
                              aspectRatio: '1'
                            }}
                          >
                            <Image
                              src={image}
                              alt={`Preview ${index + 1}`}
                              style={{ 
                                objectFit: 'cover',
                                width: '100%',
                                height: '100%'
                              }}
                            />
                            <Box 
                              style={{ 
                                position: 'absolute', 
                                top: 0, 
                                right: 0, 
                                background: 'rgba(0,0,0,0.5)',
                                borderRadius: '0 0 0 8px',
                                padding: '2px'
                              }}
                            >
                              <Button
                                compact
                                variant="subtle"
                                color="white"
                                size="xs"
                                onClick={() => removePhoto(index)}
                                style={{ minWidth: 'auto', padding: '2px' }}
                              >
                                ✕
                              </Button>
                            </Box>
                            <Text 
                              size="xs" 
                              ta="center" 
                              style={{
                                position: 'absolute',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                background: 'rgba(0,0,0,0.6)',
                                color: 'white',
                                padding: '2px 4px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {`Photo ${index + 1}`}
                            </Text>
                          </Box>
                        ))}
                      </SimpleGrid>
                      <Text size="xs" c={imagePreview.length < 6 ? "dimmed" : "green"} mt="xs">
                        {imagePreview.length < 6 ? `${6 - imagePreview.length} more photos required` : "All required photos uploaded"}
                      </Text>
                    </Box>
                  )}
                </Stack>
              </Stepper.Step>

              <Stepper.Step label="Pricing" icon={<IconCurrencyDollar size={22} />}>
                <Title order={3} mb="lg" c="blue.7">Pricing & Availability</Title>
                <Grid>
                  <Grid.Col span={12}>
                    <NumberInput
                      label="Monthly Rent (TND)"
                      placeholder="Enter price per month"
                      required
                      min={1}
                      radius="lg"
                      size="md"
                      {...form.getInputProps('price')}
                    />
                  </Grid.Col>
                  <Grid.Col span={12}>
                    <TextInput
                      label="Available From"
                      placeholder="DD-MM-YYYY"
                      required
                      radius="lg"
                      size="md"
                      {...form.getInputProps('availableFrom')}
                    />
                    <Text size="xs" c="dimmed" mt={5}>Format: DD-MM-YYYY (e.g., 01-05-2025)</Text>
                  </Grid.Col>
                </Grid>
              </Stepper.Step>

              <Stepper.Step label="Review" icon={<IconCalendarTime size={22} />}>
                <Title order={3} mb="lg" c="blue.7">Review & Publish</Title>
                <Card withBorder shadow="md" p="lg" radius="xl">
                  <Title order={4} mb="md">{form.values.title}</Title>
                  
                  <Text fw={600} size="sm" c="blue.7">Location</Text>
                  <Text size="sm" mb="md">{form.values.location?.address || 'Not set'}</Text>
                  
                  <Text fw={600} size="sm" c="blue.7">Photos</Text>
                  <SimpleGrid cols={{ base: 3, sm: 3 }} spacing="sm" mb="md">
                    {imagePreview.slice(0, 6).map((image, index) => (
                      <Image
                        key={index}
                        src={image}
                        radius="md"
                        alt={`Preview ${index + 1}`}
                        height={120}
                        style={{ objectFit: 'cover' }}
                      />
                    ))}
                  </SimpleGrid>
                  
                  <Text fw={600} size="sm" c="blue.7">Property Details</Text>
                  <Group mt="xs" mb="md">
                    <Badge color="blue" variant="filled">{form.values.propertyType}</Badge>
                    <Badge color="blue" variant="filled">{form.values.bedrooms} bed</Badge>
                    <Badge color="blue" variant="filled">{form.values.bathrooms} bath</Badge>
                    <Badge color="blue" variant="filled">{form.values.lengthOfStay}</Badge>
                  </Group>
                  
                  <Text fw={600} size="sm" c="blue.7">Amenities</Text>
                  <Group mt="xs" mb="md">
                    {form.values.selectedAmenities.map((amenity, index) => {
                      const amenityLabel = amenities.find(a => a.value === amenity)?.label;
                      return (
                        <Badge key={index} color="green" variant="light">
                          {amenityLabel}
                        </Badge>
                      );
                    })}
                  </Group>
                  
                  <Text fw={600} size="sm" c="blue.7">Price & Availability</Text>
                  <Group align="center" mb="xs">
                    <Text fw={700} size="xl">{form.values.price}TND</Text>
                    <Text size="sm" c="dimmed">/ month</Text>
                  </Group>
                  <Text size="sm" mb="md">Available from: {form.values.availableFrom}</Text>
                  
                  <Checkbox
                    mt="md"
                    label="I confirm that all the information provided is accurate and complete."
                    {...form.getInputProps('confirm', { type: 'checkbox' })}
                  />
                </Card>
              </Stepper.Step>
            </Stepper>

            <Group position="apart" mt="xl">
              {active > 0 && (
                <Button 
                  variant="light" 
                  onClick={prevStep}
                  leftIcon={<IconChevronLeft size={16} />}
                  radius="lg"
                  size="md"
                >
                  Back
                </Button>
              )}
              {active < 4 ? (
                <Button 
                  onClick={nextStep}
                  rightIcon={<IconChevronRight size={16} />}
                  style={{ marginLeft: 'auto' }}
                  radius="lg"
                  size="md"
                  loading={isSubmitting}
                >
                  Next
                </Button>
              ) : (
                <Button 
                  onClick={handleSubmit}
                  color="green"
                  style={{ marginLeft: 'auto' }}
                  radius="lg"
                  size="md"
                  loading={isSubmitting}
                >
                  Create Listing
                </Button>
              )}
            </Group>
          </Paper>
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}