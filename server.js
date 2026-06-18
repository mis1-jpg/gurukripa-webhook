const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

// CONFIG
const AUMPFY_API_KEY = "YOUR_AUMPFY_API_KEY";
const REPLY_IMAGE_URL = "https://your-website.com/thank-you-image.jpg";

// YOUR WHATSAPP GROUP ID
const TARGET_GROUP_ID = "120363424655127657";

app.post('/guru-kripa/webhook', async (req, res) => {
    try {

        const incomingData = req.body;
        console.log("Webhook Received:", incomingData);

        const customerPhone = incomingData.phone;
        const messageText = incomingData.text || "";
        const groupId = incomingData.groupId || incomingData.chatId || incomingData.fromGroup;

        // ❌ IGNORE if NOT from your group
        if (groupId !== TARGET_GROUP_ID) {
            console.log("Ignored: Not target group");
            return res.status(200).json({ success: true, message: "Ignored non-group message" });
        }

        // ✅ ONLY GROUP MESSAGE WILL CONTINUE

        console.log(`Processing GROUP message: ${groupId}`);

        // TODO: Save to Google Sheet (your logic here)
        console.log(`Saved entry for ${customerPhone}`);

        // Send image back to SAME GROUP
        const whatsappApiUrl = `https://api.aumpfy.com/api/v1/messages/send-media`;

        const payload = {
            to: groupId,   // IMPORTANT: send back to GROUP, not phone
            type: "image",
            mediaUrl: REPLY_IMAGE_URL,
            caption: "✅ Message recorded successfully in MIS system."
        };

        await axios.post(whatsappApiUrl, payload, {
            headers: {
                'Authorization': `Bearer ${AUMPFY_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        console.log("Image sent to group");

        res.status(200).json({
            success: true,
            message: "Processed group message"
        });

    } catch (error) {
        console.error("Error:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
