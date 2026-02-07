function log(testInfo, message) {
  testInfo.attach('LOG', {
    body: message,
    contentType: 'text/plain',
  });
}
 
module.exports = { log };