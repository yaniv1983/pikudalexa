/**
 * Quick test: Run the monitor with Sal'it (882) configured,
 * connect to WebSocket, and listen for 30 seconds.
 */
import { TzevaAdomMessage } from '@pikudalexa/shared';
import { TzevaAdomClient } from './websocket-client';
import { CitiesCache } from './cities-cache';
import { AlertProcessor } from './alert-processor';

async function test() {
  console.log('=== Monitor Integration Test ===\n');

  const cities = new CitiesCache();
  await cities.load();

  const salit = cities.getCityById(882);
  console.log(`Target city: ${salit?.he} (${salit?.en}), countdown: ${salit?.countdown}s\n`);

  const processor = new AlertProcessor(cities);
  const client = new TzevaAdomClient();

  client.on('connected', () => {
    console.log('Connected! Listening for 30 seconds...\n');
  });

  client.on('alert', (msg: TzevaAdomMessage) => {
    console.log('Raw message:', JSON.stringify(msg, null, 2));
    const processed = processor.process(msg);
    if (processed) {
      console.log('Processed alert:', JSON.stringify(processed, null, 2));

      // Check if relevant to Sal'it
      const isRelevant = processor.isRelevantToUser(processed, {
        userId: 'test',
        cities: [882],
        alertAreas: [],
        enabledThreats: [0, 2, 5, 7],
        enableDrills: false,
        enableSystemMessages: true,
        createdAt: '',
        updatedAt: '',
      });
      console.log(`Relevant to Sal'it: ${isRelevant}`);
    }
  });

  client.connect();

  setTimeout(() => {
    console.log('\n=== Test complete (30s timeout) ===');
    client.stop();
    process.exit(0);
  }, 30_000);
}

test().catch(console.error);
