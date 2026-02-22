

 
  export default async function updateMarker(city) {
    const apiKey = 'geoapi key';
    const country = 'Tunisia';
    const query = `${city}, ${country}`;
  
    try {
      const response = await fetch(`https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(query)}&key=${apiKey}`);
      const data = await response.json();
  
      if (data.results.length > 0) {
        const location = data.results[0].geometry;
     //   console.log(data.results[0]); // fixed index to match location
        return { lat: location.lat, lng: location.lng};
        
      } else {
        console.log('No results found.');
        return null;
      }
    } catch (error) {
      console.error('Error fetching location:', error);
      return null;
    }
  }
  
 








