const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

// ⚙️ AUTH CONFIGURATION KEYS
const AUMPFY_API_KEY = "sl_1fb665f";
const TARGET_GROUP_ID = "120363424655127657"; 
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyby8T5B3F27QlZJ3pD6j3U3Q3nSLo8ulWHiET2yryE3kslhSHQZlU2Tf8kOr0PzWAF/exec";

app.post('/guru-kripa/webhook', async (req, res) => {
    try {
        const incomingData = req.body;
        console.log("=== NEW WEBHOOK RECEIVED ===");

        // Extract message content safely
        let messageText = "";
        if (incomingData.data && incomingData.data.body) {
            messageText = incomingData.data.body.trim();
        } else if (incomingData.text) {
            messageText = incomingData.text.trim();
        }

        // Extract chat group metadata safely
        let rawGroupId = "";
        if (incomingData.data && incomingData.data.from) {
            rawGroupId = incomingData.data.from;
        } else {
            rawGroupId = incomingData.groupId || incomingData.chatId || "";
        }
        const cleanGroupId = rawGroupId.split('@')[0];

        // Break potential loops
        if (!messageText || messageText.includes("Stock Asset") || messageText.includes("not found")) {
            return res.status(200).json({ success: true });
        }

        // Group Filter Validation Guard
        if (cleanGroupId !== TARGET_GROUP_ID) {
            console.log(`Ignored unauthorized chat: ${cleanGroupId}`);
            return res.status(200).json({ success: true });
        }

        console.log(`Searching catalog for item entry: "${messageText}"`);
        const recipient = `${cleanGroupId}@g.us`;

        // Request information from Google Script macro database
        const driveLookup = await axios.get(`${GOOGLE_SCRIPT_URL}?stock=${encodeURIComponent(messageText)}`);
        const driveData = driveLookup.data;

        if (driveData && driveData.success) {
            // Reply back with text information + direct web view link
            await axios.post(`https://api.aumpfy.com/api/v1/messages/send-text`, {
                to: recipient,
                text: `✅ *Stock Asset Found!*\n📦 *Name:* ${driveData.fileName}\n🔗 *View Link:* ${driveData.imageUrl}`
            }, {
                headers: { 'Authorization': `Bearer ${AUMPFY_API_KEY}`, 'Content-Type': 'application/json' }
            });
            console.log("Success message dispatched!");
        } else {
            // Fallback error code dispatch response card
            await axios.post(`https://api.aumpfy.com/api/v1/messages/send-text`, {
                to: recipient,
                text: `❌ Stock item "${messageText}" was not found in folders.`
            }, {
                headers: { 'Authorization': `Bearer ${AUMPFY_API_KEY}`, 'Content-Type': 'application/json' }
            });
            console.log("Fallback text alert dispatched.");
        }

        return res.status(200).json({ success: true });

    } catch (error) {
        console.error("🔴 SERVER EXCEPTION ERROR:", error.message);
        return res.status(200).json({ success: false });
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => console.log(`Server listening on port ${PORT}`));
