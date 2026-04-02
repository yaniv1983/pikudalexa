/**
 * Test script: Check if TzevaAdom (Tzofar) WebSocket works from this machine.
 * Tests both endpoints and checks for geo-blocking.
 */
const WebSocket = require('ws');
const crypto = require('crypto');

const ENDPOINTS = [
  { name: 'Primary (port 443)', url: 'wss://ws.tzevaadom.co.il/socket?platform=ANDROID' },
  { name: 'Alternative (port 8443)', url: 'wss://ws.tzevaadom.co.il:8443/socket?platform=WEB' },
];

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36',
  'Referer': 'https://www.tzevaadom.co.il',
  'Origin': 'https://www.tzevaadom.co.il',
  'tzofar': crypto.randomBytes(16).toString('hex'),
};

let testsCompleted = 0;
const totalTests = ENDPOINTS.length;

function testEndpoint(endpoint) {
  console.log(`\n--- Testing: ${endpoint.name} ---`);
  console.log(`URL: ${endpoint.url}`);

  const ws = new WebSocket(endpoint.url, { headers: HEADERS });
  let connected = false;
  let messagesReceived = 0;

  const timeout = setTimeout(() => {
    if (connected) {
      console.log(`[${endpoint.name}] ✓ Connected successfully! Waited 15s for messages, got ${messagesReceived}.`);
      console.log(`[${endpoint.name}] (No active alerts right now - this is normal)`);
    } else {
      console.log(`[${endpoint.name}] ✗ Connection timeout after 15s - may be geo-blocked or unreachable`);
    }
    ws.close();
    testsCompleted++;
    if (testsCompleted === totalTests) {
      console.log('\n=== All tests complete ===');
      process.exit(0);
    }
  }, 15000);

  ws.on('open', () => {
    connected = true;
    console.log(`[${endpoint.name}] ✓ WebSocket CONNECTED! Not geo-blocked!`);
  });

  ws.on('message', (data) => {
    messagesReceived++;
    try {
      const parsed = JSON.parse(data.toString());
      console.log(`[${endpoint.name}] Message received:`, JSON.stringify(parsed, null, 2));
    } catch {
      console.log(`[${endpoint.name}] Raw message:`, data.toString().substring(0, 200));
    }
  });

  ws.on('error', (err) => {
    console.log(`[${endpoint.name}] ✗ ERROR: ${err.message}`);
    clearTimeout(timeout);
    testsCompleted++;
    if (testsCompleted === totalTests) {
      console.log('\n=== All tests complete ===');
      process.exit(0);
    }
  });

  ws.on('close', (code, reason) => {
    if (!connected) {
      console.log(`[${endpoint.name}] Connection closed before establishing. Code: ${code}`);
    }
  });
}

console.log('=== TzevaAdom/Tzofar WebSocket Connectivity Test ===');
console.log('Testing from this machine to check if geo-blocked...');
console.log('(Will wait 15 seconds per endpoint for messages)\n');

ENDPOINTS.forEach(testEndpoint);
