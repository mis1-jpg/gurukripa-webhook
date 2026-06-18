const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

// CONFIG
const AUMPFY_API_KEY = "sl_1fb665f";
const TARGET_GROUP_ID = "120363424655127657";

// 🔗 PASTE YOUR GOOGLE DEPLOYMENT LINK HERE
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyby8T5B3F27QlZJ3pD6j3U3Q3nSLo8ulWHiET2yryE3kslhSHQZlU2Tf8kOr0PzWAF/exec";

app.post('/guru-kripa/webhook', async (req, res) => {
    try {
        const incomingData = req.body;
        console.log("Webhook Received:", incomingData);

        // Filter out status updates like MESSAGE_SENT or MESSAGE_DELIVERED to avoid infinite loops
        if (incomingData.event && incomingData.event !== "MESSAGE_RECEIVED") {
            return res.status(200).json({ success: true, message: "Ignored event status update" });
        }

        const messageText = (incomingData.text || "").trim(); // This is the stock number typed in the group
        const groupId = incomingData.groupId || incomingData.chatId || incomingData.fromGroup;

        // ❌ IGNORE if NOT from your target group
        if (groupId !== TARGET_GROUP_ID) {
            console.log("Ignored: Not target group");
            return res.status(200).json({ success: true, message: "Ignored non-group message" });
        }

        if (!messageText) {
            return res.status(200).json({ success: true, message: "No stock text provided" });
        }

        console.log(`Processing Stock Query for Group ${groupId}: "${messageText}"`);

        // 🔍 QUERY GOOGLE DRIVE VIA APPS SCRIPT
        const driveLookup = await axios.get(`${GOOGLE_SCRIPT_URL}?stock=${encodeURIComponent(messageText)}`);
        const driveData = driveLookup.data;

        const whatsappApiUrl = `https://api.aumpfy.com/api/v1/messages/send-media`;

        if (driveData && driveData.success) {
            console.log(`Found file ${driveData.fileName}! Replying back to group...`);
            
            // Send matching Image back to the same WhatsApp group
            const payload = {
                to: groupId,
                type: "image",
                mediaUrl: driveData.imageUrl,
                caption: `✅ Image found for Stock Number: ${messageText}`
            };

            await axios.post(whatsappApiUrl, payload, {
                headers: {
                    'Authorization': `Bearer ${AUMPFY_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            });
        } else {
            console.log(`Stock number "${messageText}" not found in Drive folders.`);
            
            // Inform the group if the stock item isn't found
            await axios.post(`https://api.aumpfy.com/api/v1/messages/send-text`, {
                to: groupId,
                text: `❌ Stock item "${messageText}" was not found in the Nakshi/Jawadu catalog folders.`
            }, {
                headers: {
                    'Authorization': `Bearer ${AUMPFY_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            });
        }

        res.status(200).json({ success: true, message: "Processed group stock verification lookup" });

    } catch (error) {
        console.error("Error running script:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
