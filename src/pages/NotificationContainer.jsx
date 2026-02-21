import { useState, useMemo, useCallback } from 'react';
import {
  Box, Text, Button, Group, Modal, Avatar, Select, Stack, Paper, Textarea, ActionIcon
} from "@mantine/core";
import { IconBell, IconMessage, IconUser, IconSend } from "@tabler/icons-react";
import NotificationCard from './NotificationCard';

const NotificationContainer = ({
  notifications,
  activeTab,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
  onBookingAction,
  refetchNotifications
}) => {
  const [chatModalOpened, setChatModalOpened] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [message, setMessage] = useState('');

  const uniqueSenders = useMemo(() => {
    if (!notifications || !Array.isArray(notifications)) return [];

    return notifications
      .filter(n => n?.sender_id && n?.sender_name && n.sender_name !== 'System')
      .reduce((acc, notification) => {
        if (!acc.some(sender => sender.value === notification.sender_id)) {
          acc.push({
            value: notification.sender_id,
            label: notification.sender_name || 'Unknown User',
            image: notification.sender_image || null
          });
        }
        return acc;
      }, []);
  }, [notifications]);

  const sendMessage = useCallback(async () => {
    const userId = localStorage.getItem('userId');
    if (!userId || !selectedUser || !message.trim()) return;

    try {
      const response = await fetch(`http://localhost:5000/profile/notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reciever_id: selectedUser,
          type: 'message',
          sender_id: userId,
          content: message
        })
      });

      if (response.ok) {
        setMessage('');
        setChatModalOpened(false);
        if (refetchNotifications) refetchNotifications();
      } else {
        throw new Error('Failed to send notification');
      }
    } catch (err) {
      console.error('Error sending message:', err.message);
      alert('Failed to send message. Please try again.');
    }
  }, [selectedUser, message, refetchNotifications]);

  const handleOpenChatWithUser = useCallback((recipientId) => {
    setSelectedUser(recipientId);
    setChatModalOpened(true);
  }, []);

  if (!notifications || notifications.length === 0) {
    return (
      <Box ta="center" py="xl">
        <IconBell size={64} color="#e0e0e0" />
        <Text size="lg" fw={500} mt="md">No notifications</Text>
        <Text c="dimmed" mt="xs">You're all caught up!</Text>
      </Box>
    );
  }

  return (
    <>
      {notifications.map(notification => (
        <NotificationCard
          key={notification?._id || `temp-${Math.random()}`}
          notification={notification}
          onMarkAsRead={onMarkAsRead}
          onAccept={(id) => onBookingAction('accept', id)}
          onDecline={(id) => onBookingAction('decline', id)}
          onConfirm={(id) => onBookingAction('confirm', id)}
          onCancel={(id) => onBookingAction('cancel', id)}
          onChat={handleOpenChatWithUser}
          refetchNotifications={refetchNotifications}
        />
      ))}
      
      <Group position="center" mt="md">
        <Button
          variant="subtle"
          onClick={onMarkAllAsRead}
          disabled={!notifications.some(n => n?.status === 'unread')}
        >
          Mark all as read
        </Button>
        <Button
          variant="subtle"
          color="red"
          onClick={onClearAll}
          disabled={notifications.length === 0}
        >
          Clear all
        </Button>
      </Group>

      <Modal
        opened={chatModalOpened}
        onClose={() => {
          setChatModalOpened(false);
          setSelectedUser(null);
          setMessage('');
        }}
        title="Send a message"
        size="md"
        closeOnClickOutside={false}
      >
        <Stack spacing="md">
          <Select
            label="Select contact"
            placeholder="Choose a contact"
            data={uniqueSenders}
            value={selectedUser}
            onChange={setSelectedUser}
            searchable
            nothingFoundMessage="No contacts found"
            itemComponent={({ image, label, ...others }) => (
              <Group noWrap {...others}>
                <Avatar src={image} radius="xl">
                  {label ? label.charAt(0).toUpperCase() : <IconUser size={20} />}
                </Avatar>
                <Text>{label}</Text>
              </Group>
            )}
          />
          
          {selectedUser && (
            <Paper withBorder p="md" radius="md">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message here..."
                minRows={3}
                mb="md"
                styles={{
                  input: {
                    height: '120px',
                    paddingRight: '40px'
                  }
                }}
                autoFocus
                rightSection={
                  <ActionIcon
                    variant="subtle"
                    color="blue"
                    onClick={sendMessage}
                    disabled={!message.trim()}
                    style={{
                      position: 'absolute',
                      right: 10,
                      bottom: 10
                    }}
                  >
                    <IconSend size={18} />
                  </ActionIcon>
                }
              />
              <Button
                onClick={sendMessage}
                disabled={!message.trim()}
                fullWidth
              >
                Send Message
              </Button>
            </Paper>
          )}
        </Stack>
      </Modal>
    </>
  );
};

export default NotificationContainer;