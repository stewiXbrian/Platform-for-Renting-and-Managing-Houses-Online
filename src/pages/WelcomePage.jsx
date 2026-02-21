import { AppShell, Group, Box,Skeleton ,Button,NativeSelect,BackgroundImage,Paper,Text,Stack,Center, Anchor, Drawer, Modal} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { MantineLogo } from '@mantinex/mantine-logo';//this is just the mantine brand logo with props
import { IconArrowAutofitContent, IconArrowAutofitDown, IconArrowBack, IconArrowDown, IconChevronDown, IconHome,IconCheck, IconBrandInstagram, IconBrandFacebook, IconBrandWhatsapp, IconBrandTwitter } from '@tabler/icons-react';
import image from '../assets/Room3.jpg';
import LoginSignUp from './LoginSignUp'



/**
 * padding="md": Adds medium padding (space inside) on all sides of an element. In Mantine, "md" is a predefined size 
  (usually 16px, but depends on the theme).
  
 * px="md": Adds medium padding only on the left and right (horizontal) sides of an element, leaving top and bottom unchanged. 
  Also typically 16px in Mantine.
 
 * AppShell manages the structure and sizes; AppShell.Header is for content inside that structure. 
  That’s why the height goes in AppShell.
 
 * in the stack for the footer:
  justify="center": Vertically centers the children (icons and text) within the stack.
align="center": Horizontally centers the children across the stack’s width.
h="100%": Makes the stack take up the full height of its parent (the <Box>), ensuring centering happens within that space.

*useDisclosure(false):

  Initializes a state with false (closed by default).
  Returns an array: [opened, { open, close }].
        opened: Boolean state (true = open, false = closed).
        open: Function to set opened to true.
        close: Function to set opened to false.

<Drawer>:

    A sliding panel component.
    opened={opened}: Shows/hides the drawer based on the opened state.
    onClose={close}: Calls close when the drawer is closed (e.g., via the close button).
    title="Authentication": Sets the drawer’s title.

<Button>:

    variant="default": Applies a default button style.
    onClick={open}: Calls open to set opened to true, opening the drawer.
*/
export default function WelcomePage() {
    
    const [opened, { open,close }] = useDisclosure(false);

  return (

    <AppShell
    header={{
      height:'4.5rem'
    }}
    padding="0"
  >
    {/* Header */}
    <AppShell.Header bg="dark.8">
      <Group h="100%" px="md" justify="space-between">
        <Group ml='1rem'>
            <IconHome size={40} color="white" style={{ strokeWidth: 1.5 }} />
               <Anchor href="" target="_blank" underline="hover" ml={8} mr={3}>
                Contact Us
                  </Anchor>
            <Anchor href="" target="_blank" underline="hover">
                About
                  </Anchor>
                 
                </Group>

        <Group gap="1.4rem" mr='xs'>
    
          <Button
           size="md"
           mr={5}
            variant="filled"
             onClick={open}>

            Login/Signup
          </Button>
        </Group>
      </Group>
    </AppShell.Header>
  
      {/* Main Content */}
<AppShell.Main h="calc(100vh - 70px - 60px)" scrollbar="y">

      <Modal
          opened={opened}
          onClose={close} 
          centered
          styles={{
          content: {   backgroundColor: '#202324'},
          header: { backgroundColor: '#202324'} }} >
                                                <LoginSignUp />  
                                                            </Modal>                                                                    

      <BackgroundImage src={image} h="100%" w="100%" pos="relative">
        <Paper
          bg="rgba(0,0,0,0.7)"
          radius="md"
          p="xl"
          maw={800}
          mx="auto"
          c="white"
          pos="absolute"
          top="16%"
          left="4%"
        >
          <Text size="xl" fw={700}>
            Find the Perfect Student Housing Near Your University
          </Text>
  
          <Text mt="sm">
            We connect university students with trusted property owners across the country to help
            you secure safe and affordable housing effortlessly.
          </Text>
  
          <Group mt="md" gap="18%">
            <Stack gap="xs">
              <Group>
                <IconCheck size={18} />
                <Text>Easy Search & Filters</Text>
              </Group>
              <Group>
                <IconCheck size={18} />
                <Text>Nearby Locations</Text>
              </Group>
              <Group>
                <IconCheck size={18} />
                <Text>Secure Messaging</Text>
              </Group>
            </Stack>
  
            <Stack gap="xs">
              <Group>
                <IconCheck size={18} />
                <Text>Detailed Listings with Photos</Text>
              </Group>
             
              <Group>
                <IconCheck size={18} />
                <Text>Instant Notifications</Text>
              </Group>
            </Stack>
          </Group>
        </Paper>        
                </BackgroundImage>

 {/* Footer */}
 <Box bg="#121619" h="12rem">
  <Stack justify="center" align="center" h="100%">
    <Group px="md">
      <IconBrandInstagram size="4.35rem" />
      <IconBrandFacebook size="4.35rem" />
      <IconBrandWhatsapp size="4.35rem" />
      <IconBrandTwitter size="4.35rem" />
    </Group>
    <Text c="white" component="p" >
      © 2021 AppartmentsOnline.com
    </Text>
  </Stack>
</Box>

    </AppShell.Main>
  
  </AppShell>
  


  );
}

