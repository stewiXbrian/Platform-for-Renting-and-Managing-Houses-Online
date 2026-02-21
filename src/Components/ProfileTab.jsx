import { Avatar, Group, Menu, Text } from "@mantine/core";
import { IconHeart, IconHome2, IconHomeDollar, IconNotification, IconUser } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

async function fetchData() {
  try {
    const userId = localStorage.getItem('userId');

    const response = await fetch(`http://localhost:5000/profile?userId=${userId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const result = await response.json();
    return result; // Assuming result contains { host, avatar }
  } catch (err) {
    console.error("Profile fetch failed:", err.message);
    return null;
  }
}

export default function ProfileTab() {
  const navigate = useNavigate();
  const [tabData, setTabData] = useState(null);

  useEffect(() => {
    async function loadData() {
      const data = await fetchData();
      if (data) {
        setTabData(data);
        // Optionally save to localStorage for later use
        localStorage.setItem('tabData', JSON.stringify({
          host: data.host,
          avatar: data.avatar
        }));
      }
    }
    loadData();
  }, []); // Empty dependency array to run once on mount

  return (
    <Menu width={170}>
      <Menu.Target>
        <Group gap="xs" style={{ cursor: "pointer" }}>
          <Text color="red" size="lg" mr={5}>
            {tabData?.host || "Loading..."}
          </Text>
          <Avatar
            radius="xl"
            size="lg"
            color="green"
            src={tabData?.avatar || null}
          />
        </Group>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Item leftSection={<IconUser size={16} />} onClick={() => navigate("/profile")}>
          My profile
        </Menu.Item>
        <Menu.Item leftSection={<IconNotification size={16} />} onClick={() => navigate("/notifications")}>
          Notifications
        </Menu.Item>
        <Menu.Item leftSection={<IconHeart size={16} />} onClick={() => navigate("/bookmarks")}>
          Bookmarks
        </Menu.Item>
        <Menu.Item leftSection={<IconHomeDollar size={16} />} onClick={() => navigate("/myListings")}>
          My Listings
        </Menu.Item>
        <Menu.Item leftSection={<IconHome2 size={16} />} onClick={() => navigate("/myRentals")}>
          My Rentals
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item 
          onClick={() => {
            localStorage.removeItem('userId');
            localStorage.removeItem('tabData');
            navigate("/");
          }} 
          color="red" >
          Log out
          
          </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}