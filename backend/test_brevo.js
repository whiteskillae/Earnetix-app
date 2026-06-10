require('dotenv').config();
const { BrevoClient } = require('@getbrevo/brevo');

async function testBrevo() {
  try {
    const brevo = new BrevoClient({
        apiKey: process.env.BREVO_API_KEY
    });

    console.log("Sending email with API key ending in:", process.env.BREVO_API_KEY ? process.env.BREVO_API_KEY.slice(-5) : 'NONE');
    const response = await brevo.transactionalEmails.sendTransacEmail({
      subject: 'Test from Earnetix',
      htmlContent: '<html><body><h1>This is a test email</h1></body></html>',
      sender: { name: 'EARNETIX', email: 'whiteskillae@gmail.com' },
      to: [{ email: 'whiteskillae@gmail.com' }]
    });
    
    console.log("Email sent successfully! API returned:", response);
  } catch (error) {
    console.error("Error sending email:");
    if (error.response && error.response.body) {
        console.error(error.response.body);
    } else {
        console.error(error);
    }
  }
}

testBrevo();
