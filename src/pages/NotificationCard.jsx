import { useState, useCallback } from 'react';
import {
  Paper, Group, Avatar, Box, Text, Badge, Button, Textarea, Modal, ActionIcon
} from '@mantine/core';
import {
  IconBell, IconMessage, IconCheck, IconX, IconSend
} from "@tabler/icons-react";
import { useNavigate } from 'react-router-dom';

const NotificationCard = ({
  notification,
  onMarkAsRead,
  onAccept,
  onDecline,
  onConfirm,
  onCancel,
  onChat,
  refetchNotifications
}) => {
  const [isReplying, setIsReplying] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [modalOpened, setModalOpened] = useState(false);
  const [sentReply, setSentReply] = useState(null);
  const [repliedMessages, setRepliedMessages] = useState(JSON.parse(localStorage.getItem('repliedMessages') || '[]'));
  const bgColor = notification?.status === 'unread' ? "blue.0" : "white";
  const navigate = useNavigate();

  const sendReply = useCallback(async () => {
    setIsSending(true);
    try {
      const userId = localStorage.getItem('userId');
      const messageToSend = replyMessage.trim();
      if (!userId || !messageToSend || !notification?.sender_id) {
        console.log("Missing data:", { userId, replyMessage: messageToSend, senderId: notification?.sender_id });
        return;
      }
      const response = await fetch(`http://localhost:5000/profile/notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reciever_id: notification.sender_id,
          type: 'message',
          sender_id: userId,
          content: messageToSend,
          listingId: notification?.listingId
        })
      });
      if (!response.ok) throw new Error(`Failed to send notification: ${response.status}`);
      const updatedRepliedMessages = [...repliedMessages, notification._id];
      localStorage.setItem('repliedMessages', JSON.stringify(updatedRepliedMessages));
      setRepliedMessages(updatedRepliedMessages);
      setSentReply(messageToSend);
      setReplyMessage('');
      setIsReplying(false);
      onMarkAsRead(notification._id);
      if (refetchNotifications) refetchNotifications();
    } catch (err) {
      console.error('Error sending reply:', err.message);
      alert('Failed to send reply. Please try again.');
    } finally {
      setIsSending(false);
    }
  }, [notification?.sender_id, replyMessage, notification?.listingId, onMarkAsRead, refetchNotifications, repliedMessages, notification._id]);

  const sendMessage = useCallback(async () => {
    const userId = localStorage.getItem('userId');
    if (!userId || !replyMessage.trim() || !notification?.sender_id) return;
    try {
      const response = await fetch(`http://localhost:5000/profile/notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reciever_id: notification.sender_id,
          type: 'message',
          sender_id: userId,
          content: replyMessage,
          listingId: notification?.listingId || undefined
        })
      });
      if (response.ok) {
        setReplyMessage('');
        setModalOpened(false);
        if (refetchNotifications) refetchNotifications();
      } else {
        throw new Error('Failed to send notification');
      }
    } catch (err) {
      console.error('Error sending message:', err.message);
      alert('Failed to send message. Please try again.');
    }
  }, [notification?.sender_id, replyMessage, notification?.listingId, refetchNotifications]);

  const handleBookingAction = useCallback(async (action) => {
    const actionHandlers = {
      'accept': onAccept,
      'decline': onDecline,
      'confirm': onConfirm,
      'cancel': onCancel
    };
    const handler = actionHandlers[action];
    if (handler) {
      const result = await handler(notification?._id);
      if (result) setModalOpened(false);
      return result;
    }
    return false;
  }, [notification?._id, onAccept, onDecline, onConfirm, onCancel]);

  const handleOpenChat = useCallback(() => {
    if (onChat && notification?.sender_id) {
      onChat(notification.sender_id);
    } else {
      setModalOpened(true);
    }
  }, [notification?.sender_id, onChat]);

  const handleCardClick = (id) => {
    if (id) navigate(`/room/${id}`);
  };

  const renderNotificationContent = () => {
    if (!notification) return <Text size="sm">No content</Text>;

    switch (notification.type) {
      case 'message':
      case 'system':
        return (
          <>
            <Paper p="sm" radius="sm" mt="xs" mb="sm" style={{ width: '100%' }}>
              <Text size="sm">
                {notification.is_sent
                  ? `To ${notification.recipient_name}: ${notification.content}`
                  : `${notification.sender_name}: ${notification.content || 'No content'}`}
              </Text>
            </Paper>
            {sentReply && (
              <Paper
                p="sm"
                radius="sm"
                mt="xs"
                mb="sm"
                style={{ width: '90%', marginLeft: '10%', backgroundColor: 'lightgray' }}
              >
                <Group align="flex-start" noWrap>
                  <Avatar size="sm" radius="xl" color="blue">Y</Avatar>
                  <Text size="xs">You: {sentReply}</Text>
                </Group>
              </Paper>
            )}
            {!notification.is_sent && !repliedMessages.includes(notification._id) && (
              <Group spacing="xs" mt="xs">
                {isReplying ? (
                  <>
                    <Textarea
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      placeholder="Type your reply..."
                      minRows={2}
                      style={{ flex: 1 }}
                    />
                    <Button
                      variant="filled"
                      color="blue"
                      onClick={sendReply}
                      disabled={!replyMessage.trim() || isSending}
                      loading={isSending}
                    >
                      Send
                    </Button>
                    <Button
                      variant="subtle"
                      color="gray"
                      onClick={() => {
                        setReplyMessage('');
                        setIsReplying(false);
                      }}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    size="xs"
                    color="blue"
                    onClick={() => setIsReplying(true)}
                  >
                    Reply
                  </Button>
                )}
              </Group>
            )}
          </>
        );

      case 'booking-request':
        return (
          <>
            <Text size="sm" mb="sm">
              {`${notification.sender_name || 'User'} has sent a booking request for: ${notification.content || 'Unknown listing'}`}
            </Text>
            <Group mb="md">
              <Paper
                onClick={() => handleCardClick(notification.listingId)}
                radius="md"
                withBorder
                style={{
                  cursor: 'pointer',
                  width: 70,
                  height: 70,
                  backgroundImage: notification?.firstPhoto ? `url(${notification.firstPhoto})` : 'url(/placeholder.jpg)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              />
              <Box spacing={3}>
                {notification?.price && (
                  <Group spacing={5}>
                    <Text size="xs">{`${notification.price} TND/month`}</Text>
                  </Group>
                )}
                <Badge color="blue" size="sm">Request Pending</Badge>
              </Box>
            </Group>
            <Group spacing="xs" mt="md">
              <Button
                variant="outline"
                size="xs"
                color="blue"
                leftSection={<IconMessage size={14} />}
                onClick={handleOpenChat}
                disabled={['accepted', 'confirmed'].includes(notification?.booking_status)}
              >
                {['accepted', 'confirmed'].includes(notification?.booking_status) ? 'Messaged' : 'Message'}
              </Button>
              <Button
                variant="outline"
                size="xs"
                color="green"
                leftSection={<IconCheck size={14} />}
                onClick={() => handleBookingAction('accept')}
                disabled={['accepted', 'confirmed'].includes(notification?.booking_status)}
              >
                {notification?.booking_status === 'accepted' ? 'Accepted' : 'Accept'}
              </Button>
              <Button
                variant="outline"
                size="xs"
                color="red"
                leftSection={<IconX size={14} />}
                onClick={() => handleBookingAction('decline')}
                disabled={['accepted', 'confirmed'].includes(notification?.booking_status)}
              >
                Decline
              </Button>
              {notification?.status === 'unread' && (
                <Button
                  variant="subtle"
                  size="xs"
                  color="gray"
                  onClick={() => onMarkAsRead(notification?._id)}
                >
                  Mark Read
                </Button>
              )}
            </Group>
          </>
        );

      case 'booking-approval':
        return (
          <>
            <Text size="sm" mb="sm">
              {`${notification.sender_name || 'User'} has approved your booking request for: ${notification.content || 'Unknown listing'}`}
            </Text>
            <Group mb="md">
              <Paper
                onClick={() => handleCardClick(notification.listingId)}
                radius="md"
                withBorder
                style={{
                  cursor: 'pointer',
                  width: 70,
                  height: 70,
                  backgroundImage: notification?.firstPhoto ? `url(${notification.firstPhoto})` : 'url(/placeholder.jpg)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              />
              <Box spacing={3}>
                {notification?.price && (
                  <Group spacing={5}>
                    <Text size="xs">{`${notification.price} TND/month`}</Text>
                  </Group>
                )}
                <Badge color="green" size="sm">Booking Approved</Badge>
              </Box>
            </Group>
            <Group spacing="xs" mt="md">
              <Button
                variant="outline"
                size="xs"
                color="blue"
                leftSection={<IconMessage size={14} />}
                onClick={handleOpenChat}
                disabled={notification?.booking_status === 'confirmed'}
              >
                {notification?.booking_status === 'confirmed' ? 'Messaged' : 'Message'}
              </Button>
              <Button
                variant="outline"
                size="xs"
                color="green"
                leftSection={<IconCheck size={14} />}
                onClick={() => handleBookingAction('confirm')}
                disabled={notification?.booking_status === 'confirmed'}
              >
                {notification?.booking_status === 'confirmed' ? 'Confirmed' : 'Confirm'}
              </Button>
              <Button
                variant="outline"
                size="xs"
                color="red"
                leftSection={<IconX size={14} />}
                onClick={() => handleBookingAction('cancel')}
                disabled={notification?.booking_status === 'confirmed'}
              >
                Cancel
              </Button>
              {notification?.status === 'unread' && (
                <Button
                  variant="subtle"
                  size="xs"
                  color="gray"
                  onClick={() => onMarkAsRead(notification?._id)}
                >
                  Mark Read
                </Button>
              )}
            </Group>
          </>
        );

      default:
        return (
          <Paper p="sm" radius="sm" mt="xs" mb="sm" style={{ width: '100%' }}>
            <Text size="sm">{notification.content || 'No content'}</Text>
          </Paper>
        );
    }
  };

  return (
    <>
      <Paper p="md" withBorder={notification?.status === 'unread'} bg={bgColor} mb="md">
        <Group align="flex-start" noWrap>
          <Avatar src={notification?.sender_image} size="lg" radius="xl">
            {notification?.type === 'system' && <IconBell size={24} />}
          </Avatar>
          <Box style={{ flex: 1 }}>
            <Group position="apart" wrap="nowrap">
              <Text fw={500}>{notification?.sender_name || 'System'}</Text>
              <Group spacing="xs">
                {notification.status === 'unread' && <Badge color="blue" size="sm">New</Badge>}
                <Text size="xs" c="dimmed">
                  {notification?.created_at ? new Date(notification.created_at).toLocaleString() : 'Unknown'}
                </Text>
              </Group>
            </Group>
            {renderNotificationContent()}
          </Box>
        </Group>
      </Paper>

      <Modal
        opened={modalOpened}
        onClose={() => {
          setModalOpened(false);
          setReplyMessage('');
        }}
        title={`Message to ${notification.sender_name || 'User'}`}
        size="md"
        closeOnClickOutside={false}
      >
        <Paper withBorder p="md" radius="md">
          <Group mb="md">
            <Avatar radius="xl">
              {notification.sender_name?.charAt(0).toUpperCase() || "?"}
            </Avatar>
            <Text fw={500}>{notification.sender_name || 'User'}</Text>
          </Group>
          <Textarea
            value={replyMessage}
            onChange={(e) => setReplyMessage(e.target.value)}
            placeholder={`Message ${notification.sender_name || 'User'}...`}
            minRows={3}
            mb="md"
            styles={{ input: { height: '120px', paddingRight: '40px' } }}
            autoFocus
            rightSection={
              <ActionIcon
                variant="subtle"
                color="blue"
                onClick={sendMessage}
                disabled={!replyMessage.trim()}
                style={{ position: 'absolute', right: 10, bottom:10 }}
              >
                <IconSend size={18} />
              </ActionIcon>
            }
          />
          <Button onClick={sendMessage} fullWidth disabled={!replyMessage.trim()}>
            Send Message
          </Button>
        </Paper>
      </Modal>
    </>
  );
};

export default NotificationCard;