const http = require('http');
const express = require('../server/node_modules/express');
const jwt = require('../server/node_modules/jsonwebtoken');
const { io: Client } = require('../client/node_modules/socket.io-client');
const { initSocket } = require('../server/src/config/socket');

async function testSocketLive() {
  const app = express();
  const server = http.createServer(app);
  const ioServer = initSocket(server);

  const testPort = 5099;
  await new Promise((resolve) => server.listen(testPort, resolve));
  console.log(`[Test Server] Socket server listening on ${testPort}`);

  // Generate valid test token
  const token = jwt.sign(
    { id: 1, email: 'admin@company.com', role: 'ADMIN' },
    'super_secret_company_management_jwt_key_2026',
    { expiresIn: '1h' }
  );

  const client = Client(`http://localhost:${testPort}`, {
    auth: { token },
    transports: ['websocket'],
  });

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Connection timed out')), 5000);

    client.on('connect', () => {
      clearTimeout(timeout);
      console.log(`✅ [Socket Test] Client connected successfully with Socket ID: ${client.id}`);

      // Test joining a conversation
      client.emit('join_conversation', { conversationId: 10 });
      console.log(`✅ [Socket Test] Client emitted join_conversation`);

      // Wait a tick for server to process join room, then emit
      setTimeout(() => {
        ioServer.to('conv_10').emit('new_message', {
          id: 999,
          conversation_id: 10,
          message: 'Hello Real-time Socket!',
        });
      }, 150);
    });

    client.on('new_message', (data) => {
      console.log(`✅ [Socket Test] Client received live message: "${data.message}"`);
      client.disconnect();
      server.close(() => {
        console.log(`✅ [Socket Test] Server and client closed cleanly.`);
        resolve();
      });
    });

    client.on('connect_error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

testSocketLive()
  .then(() => {
    console.log('\n🎉 ALL REAL-TIME SOCKET.IO INTEGRATION TESTS PASSED!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Socket Test Failed:', err);
    process.exit(1);
  });
