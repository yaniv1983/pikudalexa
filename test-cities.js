/**
 * Test script: Fetch cities data from TzevaAdom and find Sal'it (סלעית)
 */
const https = require('https');

// First get the version number
https.get('https://api.tzevaadom.co.il/lists-versions', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('API versions:', data);
    const versions = JSON.parse(data);

    // Now fetch cities with version
    const citiesUrl = `https://www.tzevaadom.co.il/static/cities.json?v=${versions.cities}`;
    console.log(`\nFetching cities from: ${citiesUrl}\n`);

    https.get(citiesUrl, (res2) => {
      let citiesData = '';
      res2.on('data', chunk => citiesData += chunk);
      res2.on('end', () => {
        const json = JSON.parse(citiesData);
        const cities = json.cities || json;
        const areas = json.areas || {};

        // Search for Sal'it
        console.log('=== Searching for סלעית ===\n');
        for (const [name, info] of Object.entries(cities)) {
          if (name.includes('סלעית') || (info.en && info.en.toLowerCase().includes("sal'it")) || (info.en && info.en.toLowerCase().includes("saleit")) || (info.en && info.en.toLowerCase().includes("sal"))) {
            const area = areas[info.area] || {};
            console.log(`Found: ${name}`);
            console.log(`  ID: ${info.id}`);
            console.log(`  English: ${info.en}`);
            console.log(`  Area ID: ${info.area} (${area.he || 'unknown'} / ${area.en || 'unknown'})`);
            console.log(`  Countdown: ${info.countdown} seconds`);
            console.log(`  Coordinates: ${info.lat}, ${info.lng}`);
            console.log('');
          }
        }

        // Show some stats
        const cityNames = Object.keys(cities);
        console.log(`\n=== Stats ===`);
        console.log(`Total cities: ${cityNames.length}`);
        console.log(`Total areas: ${Object.keys(areas).length}`);

        // Show Sharon area cities as context
        console.log(`\n=== Sample: cities in the same area as סלעית ===`);
        let salitArea = null;
        for (const [name, info] of Object.entries(cities)) {
          if (name.includes('סלעית')) { salitArea = info.area; break; }
        }
        if (salitArea) {
          const areaCities = [];
          for (const [name, info] of Object.entries(cities)) {
            if (info.area === salitArea) areaCities.push(`${name} (${info.en})`);
          }
          console.log(`Area ${salitArea} (${(areas[salitArea] || {}).he}): ${areaCities.length} cities`);
          console.log(areaCities.slice(0, 15).join(', '));
          if (areaCities.length > 15) console.log(`... and ${areaCities.length - 15} more`);
        }
      });
    });
  });
}).on('error', (err) => {
  console.error('Error fetching versions:', err.message);
});
