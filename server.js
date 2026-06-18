const express = require('express');
const axios = require('axios'); // Used to send the image back via API
const app = express();
app.use(express.json());

// CONFIGURATION: Replace these with your actual details
const AUMPFY_API_KEY = "sl_1fb665f"; 
const REPLY_IMAGE_URL = "https://your-website.com/thank-you-image.jpg"; // The image URL you want to send back

app.post('/guru-kripa/webhook', async (req, res) => {
    try {
        const incomingData = req.body;
        console.log(" New Webhook Received Data:", incomingData);
        
        // 1. Extract customer's WhatsApp number and sent details
        const customerPhone = incomingData.phone; // e.g., "919999999999"
        const messageText = incomingData.text || "";

        // 2. [YOUR LOGIC] Code to save to Google Sheets goes here...
        console.log(`Saved entry for ${customerPhone} to MIS.`);

        // 3. SEND IMAGE BACK TO WHATSAPP
        // We make a POST request to Aumpfy's Send Media API endpoint
        const whatsappApiUrl = `https://api.aumpfy.com/api/v1/messages/send-media`; 
        
        const payload = {
            to: customerPhone,        // Sends it directly back to the person who texted
            type: "image",
            mediaUrl: REPLY_IMAGE_URL, // The URL of the image you want them to receive
            caption: "Thank you! Your submission has been successfully recorded in our Gurukripa MIS system. 🙏"
        };

        await axios.post(whatsappApiUrl, payload, {
            headers: {
                'Authorization': `Bearer ${AUMPFY_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`Image successfully sent back to ${customerPhone}`);

        // Respond 200 OK to Aumpfy to close the webhook loop
        res.status(200).json({ success: true, message: "Logged and image sent back!" });

    } catch (error) {
        console.error("Error processing webhook:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
