const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=leadsmart_token&hub.challenge=1158201444',
  method: 'GET'
};

const req = http.request(options, res => {
  console.log(`statusCode: ${res.statusCode}`);
  console.log(`Content-Type: ${res.headers['content-type']}`);
  res.on('data', d => process.stdout.write(d));
});

req.on('error', error => console.error(error));
req.end();
