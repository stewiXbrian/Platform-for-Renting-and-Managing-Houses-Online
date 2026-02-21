import { useState, useCallback, Suspense } from 'react';
import {
  AppShell, Box, Title, Container, Divider, Group, Tabs, Badge, Center, Loader
} from "@mantine/core";
import { IconMessage, IconUserCheck, IconCircleCheck } from "@tabler/icons-react";
import { Await, redirect, useLoaderData } from 'react-router-dom';
import NotificationContainer from './NotificationContainer';
import SearchHeader from "./SearchHeader";

export async function loader() {
  const userId = localStorage.getItem('userId');
  if (!userId) {
      throw redirect ("/")
      
  }



  try {
    const response = await fetch(`http://localhost:5000/profile/notification?userId=${userId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch notifications');
    }
    return { notifications: await response.json() };
  } catch (err) {
    console.error('Notifications fetch failed:', err);
    return { notifications: [], error: err.message };
  }
}

export default function Notifications() {
  const { notifications } = useLoaderData() || { notifications: [] };
  const [activeTab, setActiveTab] = useState('message');
  const [allNotifications, setAllNotifications] = useState(notifications || []);

  const fetchNotifications = useCallback(async () => {
    const userId = localStorage.getItem('userId');
    try {
      const response = await fetch(`http://localhost:5000/profile/notification?userId=${userId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        const data = await response.json();
        setAllNotifications(data);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  }, []);

  const getNotificationCount = (type) => {
    return allNotifications.filter(n => {
      if (type === 'message')
        return (n?.type === 'message' || n?.type === 'system') && n?.status === 'unread';
      return n?.type === type && n?.status === 'unread';
    }).length;
  };

  const getFilteredNotifications = () => {
    return allNotifications.filter(notification => {
      if (activeTab === 'message')
        return notification?.type === 'message' || notification?.type === 'system';
      return notification?.type === activeTab;
    });
  };

  const markAsRead = async (notificationId) => {
    const response = await fetch(`http://localhost:5000/profile/notification/read`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationId, userId: localStorage.getItem('userId') })
    });
    if (response.ok) {
      setAllNotifications(prev =>
        prev.map(item => item?._id === notificationId ? { ...item, status: 'read' } : item)
      );
    } else {
      console.error('Failed to mark notification as read:', await response.json());
    }
  };

  const markAllAsReadInTab = async () => {
    const notificationsToMark = getFilteredNotifications()
      .filter(n => n.status === 'unread')
      .map(n => n._id);
    if (notificationsToMark.length === 0) return;
    const response = await fetch(`http://localhost:5000/profile/notification/read`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationIds: notificationsToMark, userId: localStorage.getItem('userId') })
    });
    if (response.ok) {
      setAllNotifications(prev =>
        prev.map(item => notificationsToMark.includes(item._id) ? { ...item, status: 'read' } : item)
      );
    } else {
      console.error('Failed to mark notifications as read:', await response.json());
    }
  };

  const clearAllNotificationsInTab = async () => {
    const notificationsToDelete = getFilteredNotifications().map(n => n._id);
    if (notificationsToDelete.length === 0) return;
    const response = await fetch('http://localhost:5000/profile/notification', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationIds: notificationsToDelete, userId: localStorage.getItem('userId') })
    });
    if (response.ok) {
      setAllNotifications(prev => prev.filter(item => !notificationsToDelete.includes(item._id)));
    } else {
      console.error('Failed to delete notifications:', await response.json());
    }
  };

  const handleBookingAction = async (action, notificationId) => {
    const response = await fetch(`http://localhost:5000/bookings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationId, userId: localStorage.getItem('userId'), action })
    });
    if (response.ok) {
      if (action === 'decline' || action === 'cancel') {
        setAllNotifications(prev => prev.filter(item => item?._id !== notificationId));
        return false;
      } else {
        setAllNotifications(prev =>
          prev.map(item =>
            item?._id === notificationId ? { ...item, status: 'read', booking_status: `${action}ed` } : item
          )
        );
        return true;
      }
    } else {
      console.error(`Failed to ${action} booking:`, await response.json());
      return false;
    }
  };

  const filteredNotifications = getFilteredNotifications();

  return (
    <AppShell header={{ height: 80 }}>
      <SearchHeader />
      <AppShell.Main>
        <Container size="md" mt="xl">
          <Group justify="space-between" mb="lg">
            <Title order={2}>Notifications</Title>
          </Group>

          <Tabs value={activeTab} onChange={setActiveTab} mb="xl">
            <Tabs.List>
              <Tabs.Tab
                value="message"
                leftSection={<IconMessage size={16} />}
                rightSection={getNotificationCount('message') > 0 &&
                  <Badge size="xs" variant="filled" color="blue" circle>{getNotificationCount('message')}</Badge>}
              >
                Messages
              </Tabs.Tab>
              <Tabs.Tab
                value="booking-request"
                leftSection={<IconUserCheck size={16} />}
                rightSection={getNotificationCount('booking-request') > 0 &&
                  <Badge size="xs" variant="filled" color="blue" circle>{getNotificationCount('booking-request')}</Badge>}
              >
                Booking Requests
              </Tabs.Tab>
              <Tabs.Tab
                value="booking-approval"
                leftSection={<IconCircleCheck size={16} />}
                rightSection={getNotificationCount('booking-approval') > 0 &&
                  <Badge size="xs" variant="filled" color="green" circle>{getNotificationCount('booking-approval')}</Badge>}
              >
                Booking Approvals
              </Tabs.Tab>
            </Tabs.List>
          </Tabs>

          <Divider mb="xl" />

          <Suspense fallback={<Center style={{ height: "calc(100vh - 120px)" }}><Loader color="blue" type="bars" size="xl" /></Center>}>
            <NotificationContainer
              notifications={filteredNotifications}
              activeTab={activeTab}
              onMarkAsRead={markAsRead}
              onMarkAllAsRead={markAllAsReadInTab}
              onClearAll={clearAllNotificationsInTab}
              onBookingAction={handleBookingAction}
              refetchNotifications={fetchNotifications}
            />
          </Suspense>
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}