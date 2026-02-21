import {
  RouterProvider,
  createBrowserRouter,
  createRoutesFromElements,
  Route
} from "react-router-dom";
import Profile ,{ loader as addListing} from "./pages/Profile";
import WelcomePage from "./pages/WelcomePage";
import BookMarks,{loader as getBookmarksData} from "./pages/BookMarks";
import Notifications,{loader as getNotifications} from "./pages/Notifications";
import NotFound from "./pages/NotFound";
import RoomPage ,{loader as roomLoader} from "./pages/RoomPage";
import Owner,{loader as getOwnerData} from "./pages/Owner";
import EditProfile from "./pages/EditProfile";
import MyListings,{loader as getMyListingsData} from "./pages/MyListings";
import CreateListing from "./pages/CreateListing";
import { loader as getProfileData } from "./pages/Profile";
import LocationMap from "./pages/LocationMap";
import MapPage,{ loader as getHousingDataByCity } from "./pages/MapPage";
import MyRentals,{loader as getMyRentalsData} from "./pages/MyRentals";




const router = createBrowserRouter(createRoutesFromElements(
  <Route>
   <Route path="/" element={<WelcomePage />}  />  
    <Route path="profile" element={<Profile />} loader={getProfileData}/>
    <Route path="map" element={<MapPage />} loader={getHousingDataByCity}   />
    <Route path="bookmarks" element={<BookMarks />} loader={getBookmarksData}/>
    <Route path="room/:listingId" element={<RoomPage />} loader={roomLoader} />
    <Route path="notifications" element={<Notifications />} loader={getNotifications}/>
    <Route path="owner/:userId" element={<Owner />} loader={getOwnerData} />
    <Route path="editProfile" element={<EditProfile />} />
    <Route path="myListings" element={<MyListings />} loader={ getMyListingsData}/>
    <Route path="createListing" element={<CreateListing />} />
    <Route path="myRentals" element={<MyRentals />} loader={ getMyRentalsData}/>
    <Route path="*" element={<NotFound />} />
  </Route>
));

export default function App() {
  return (
    <RouterProvider router={router} />
  );
}