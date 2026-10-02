const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const INSTAGRAM_TOKEN = process.env.INSTAGRAM_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

app.post('/webhook', async (req, res) => {
  const body = req.body;

  if (body.object === 'instagram') {
    for (const entry of body.entry) {
      const messaging = entry.messaging[0];
      const senderId = messaging.sender.id;
      const userMessage = messaging.message?.text;

      if (userMessage) {
        try {
          const geminiResponse = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            { contents: [{ parts: [{ text: userMessage }] }] }
          );

          const aiReply = geminiResponse.data.candidates[0].content.parts[0].text;

          await axios.post(
            `https://graph.instagram.com/v21.0/me/messages`,
            { recipient: { id: senderId }, message: { text: aiReply } },
            { headers: { Authorization: `Bearer ${INSTAGRAM_TOKEN}` } }
          );
        } catch (error) {
          console.error(error);
        }
      }
    }
    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.sendStatus(404);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
