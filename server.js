const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

// ⚙️ GLOBAL ACCESS CODES
const AUMPFY_API_KEY = "sl_1fb665f";
const TARGET_GROUP_ID = "120363424655127657"; 
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyby8T5B3F27QlZJ3pD6j3U3Q3nSLo8ulWHiET2yryE3kslhSHQZlU2Tf8kOr0PzWAF/exec";

app.post('/guru-kripa/webhook', async (req, res) => {
    try {
        const incomingData = req.body;
        
        // 1. Extract plain incoming text safely
        let messageText = "";
        if (incomingData.data && incomingData.data.body) {
            messageText = incomingData.data.body.trim();
        } else if (incomingData.text) {
            messageText = incomingData.text.trim();
        }

        // 2. Extract chat room metadata group code safely
        let rawGroupId = "";
        if (incomingData.data && incomingData.data.from) {
            rawGroupId = incomingData.data.from;
        } else {
            rawGroupId = incomingData.groupId || incomingData.chatId || "";
        }
        const cleanGroupId = rawGroupId.split('@')[0];

        // 3. Prevent infinite system loop notifications
        if (messageText.includes("Stock Asset") || messageText.includes("not found") || !messageText) {
            return res.status(200).json({ success: true });
        }

        // 4. Group Guard Validation Filter
        if (cleanGroupId !== TARGET_GROUP_ID) {
            return res.status(200).json({ success: true });
        }

        console.log(`Searching Drive repository for match entry: ${messageText}`);

        // 5. Query Google Sheet/Drive Script macro database engine
        const driveLookup = await axios.get(`${GOOGLE_SCRIPT_URL}?stock=${encodeURIComponent(messageText)}`);
        const driveData = driveLookup.data;

        const recipient = `${cleanGroupId}@g.us`;

        // 6. Deliver the output cleanly back to WhatsApp group
        if (driveData && driveData.success) {
            // Sends the file information alongside its live web view link
            await axios.post(`https://api.aumpfy.com/api/v1/messages/send-text`, {
                to: recipient,
                text: `✅ *Stock Asset Found!*\n📦 *Name:* ${driveData.fileName}\n🔗 *View File:* ${driveData.imageUrl}`
            }, {
                headers: { 'Authorization': `Bearer ${AUMPFY_API_KEY}`, 'Content-Type': 'application/json' }
            });
            console.log("Response dispatched!");
        } else {
            await axios.post(`https://api.aumpfy.com/api/v1/messages/send-text`, {
                to: recipient,
                text: `❌ Stock item "${messageText}" was not found in folders.`
            }, {
                headers: { 'Authorization': `Bearer ${AUMPFY_API_KEY}`, 'Content-Type': 'application/json' }
            });
            console.log("Fallback alert dispatched!");
        }

        return res.status(200).json({ success: true });

    } catch (error) {
        console.error("Internal Engine Error Loop Exception:", error.message);
        return res.status(200).json({ success: false });
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => console.log(`Active connection stream hosted on port: ${PORT}`));
