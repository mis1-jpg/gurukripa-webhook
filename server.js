const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

// ⚙️ GLOBAL PARAMETERS
const AUMPFY_API_KEY = "sl_1fb665f";
const TARGET_GROUP_ID = "120363424655127657"; 

// 🔗 PASTE YOUR COPIED GOOGLE EXEC URL HERE:
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyby8T5B3F27QlZJ3pD6j3U3Q3nSLo8ulWHiET2yryE3kslhSHQZlU2Tf8kOr0PzWAF/exec";

app.post('/guru-kripa/webhook', async (req, res) => {
    try {
        const incomingData = req.body;
        console.log("=== NEW WEBHOOK INBOUND ===");

        // Safely check message format
        let messageText = "";
        if (incomingData.data && incomingData.data.body) {
            messageText = incomingData.data.body.trim();
        } else if (incomingData.text) {
            messageText = incomingData.text.trim();
        }

        let rawGroupId = "";
        if (incomingData.data && incomingData.data.from) {
            rawGroupId = incomingData.data.from;
        } else {
            rawGroupId = incomingData.groupId || incomingData.chatId || "";
        }
        
        const cleanGroupId = rawGroupId.split('@')[0];

        console.log(`Extracted Text: "${messageText}" | Group: "${cleanGroupId}"`);

        // Avoid infinite looping loops
        if (messageText.includes("Stock Asset Found") || messageText.includes("was not found")) {
            return res.status(200).json({ success: true });
        }

        if (!messageText || cleanGroupId !== TARGET_GROUP_ID) {
            console.log("Ignored: Message empty or unauthorized chat origin group.");
            return res.status(200).json({ success: true });
        }

        console.log(`Processing inventory search loop for item ID: ${messageText}`);

        // Fetch link from script
        const driveLookup = await axios.get(`${GOOGLE_SCRIPT_URL}?stock=${encodeURIComponent(messageText)}`);
        const driveData = driveLookup.data;
        console.log("Google Drive Script Response:", JSON.stringify(driveData));

        const recipient = `${cleanGroupId}@g.us`;

        if (driveData && driveData.success) {
            console.log("Sending photo back to WhatsApp...");
            await axios.post(`https://api.aumpfy.com/api/v1/messages/send-media`, {
                to: recipient,
                type: "image",
                mediaUrl: driveData.imageUrl,
                caption: `✅ Stock Asset Found: ${driveData.fileName}`
            }, {
                headers: { 'Authorization': `Bearer ${AUMPFY_API_KEY}`, 'Content-Type': 'application/json' }
            });
            console.log("🚀 Media dispatch successfully completed!");
        } else {
            console.log("Item not matched. Dispatching text notification...");
            await axios.post(`https://api.aumpfy.com/api/v1/messages/send-text`, {
                to: recipient,
                text: `❌ Stock item "${messageText}" was not found in folders.`
            }, {
                headers: { 'Authorization': `Bearer ${AUMPFY_API_KEY}`, 'Content-Type': 'application/json' }
            });
        }

        res.status(200).json({ success: true });
    } catch (error) {
        console.error("🔴 SERVER EXCEPTION ERROR:", error.message);
        res.status(500).json({ success: false });
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running dynamically on port ${PORT}`));
