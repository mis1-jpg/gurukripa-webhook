const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

// ⚙️ GLOBAL SETTINGS
const AUMPFY_API_KEY = "sl_1fb665f";
const TARGET_GROUP_ID = "120363424655127657"; 

// 🔗 Your Google Apps Script Web App URL
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyby8T5B3F27QlZJ3pD6j3U3Q3nSLo8ulWHiET2yryE3kslhSHQZlU2Tf8kOr0PzWAF/exec";

app.post('/guru-kripa/webhook', async (req, res) => {
    try {
        const incomingData = req.body;
        console.log("=== NEW WEBHOOK INBOUND ===");

        // 1. Extract message text safely from Waumfy's custom data format
        let messageText = "";
        if (incomingData.data && incomingData.data.body) {
            messageText = incomingData.data.body.trim();
        } else if (incomingData.text) {
            messageText = incomingData.text.trim();
        }

        // 2. Extract chat group origin id safely 
        let rawGroupId = "";
        if (incomingData.data && incomingData.data.from) {
            rawGroupId = incomingData.data.from;
        } else {
            rawGroupId = incomingData.groupId || incomingData.chatId || "";
        }
        
        const cleanGroupId = rawGroupId.split('@')[0];
        console.log(`Extracted Text: "${messageText}" | Group: "${cleanGroupId}"`);

        // 3. Block loop triggers
        if (messageText.includes("Stock Asset Found") || messageText.includes("was not found")) {
            console.log("Ignored: Automated bot response loop detected.");
            return res.status(200).json({ success: true });
        }

        if (!messageText || cleanGroupId !== TARGET_GROUP_ID) {
            console.log("Ignored: Empty message text or unauthorized WhatsApp chat group origin.");
            return res.status(200).json({ success: true });
        }

        console.log(`Connecting to Google Drive to query item code: "${messageText}"`);

        // 4. Contact Google Script Web App
        const driveLookup = await axios.get(`${GOOGLE_SCRIPT_URL}?stock=${encodeURIComponent(messageText)}`);
        const driveData = driveLookup.data;
        console.log("Google Drive Script Response:", JSON.stringify(driveData));

        const recipient = `${cleanGroupId}@g.us`;

        // 5. If successful, pass the public image resource directly to Waumfy
        if (driveData && driveData.success) {
            console.log("Asset located! Sending image stream back to WhatsApp...");
            
            await axios.post(`https://api.aumpfy.com/api/v1/messages/send-media`, {
                to: recipient,
                type: "image",
                mediaUrl: driveData.imageUrl,
                caption: `✅ Stock Asset Found: ${driveData.fileName}`
            }, {
                headers: { 
                    'Authorization': `Bearer ${AUMPFY_API_KEY}`, 
                    'Content-Type': 'application/json' 
                }
            });
            
            console.log("🚀 Media dispatched successfully!");
        } else {
            console.log("Asset not found. Sending text notification...");
            
            await axios.post(`https://api.aumpfy.com/api/v1/messages/send-text`, {
                to: recipient,
                text: `❌ Stock item "${messageText}" was not found in folders.`
            }, {
                headers: { 
                    'Authorization': `Bearer ${AUMPFY_API_KEY}`, 
                    'Content-Type': 'application/json' 
                }
            });
        }

        return res.status(200).json({ success: true });

    } catch (error) {
        console.error("🔴 SERVER EXCEPTION ERROR:", error.message);
        // Always respond back with a 200 to prevent Aumpfy from getting stuck in an infinite retry lock loop
        return res.status(200).json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running dynamically on port ${PORT}`));
