import { AppShell, Group } from "@mantine/core";
import ProfileTab from "../Components/ProfileTab";
import LocationSearchInput from "../Components/LocationSearchInput";

function SearchHeader({ onLocationSelect }) {

  return (
 <AppShell.Header p="md" bg="black" >
      <Group justify="space-between">
        <LocationSearchInput onLocationSelect={onLocationSelect} />
        <ProfileTab  />
      </Group>
    </AppShell.Header>

   
  );
}

export default SearchHeader;