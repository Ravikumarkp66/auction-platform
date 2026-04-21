const http = require('http');
const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Hello world');
});
server.listen(5051, '127.0.0.1', () => {
  console.log('Test server running on 5051');
});
