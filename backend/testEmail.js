require('dotenv').config();
const { sendOTP } = require('./src/services/otpService');

async function test() {
  try {
    await sendOTP('test@example.com', '123456');
    console.log('Test success');
  } catch (e) {
    console.error('Test failed', e);
  }
}
test();
