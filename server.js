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

        // 1. Extract message text safely
        let messageText = "";
        if (incomingData.data && incomingData.data.body) {
            messageText = incomingData.data.body.trim();
        } else if (incomingData.text) {
            messageText = incomingData.text.trim();
        }

        // 2. Extract group ID safely 
        let rawGroupId = "";
        if (incomingData.data && incomingData.data.from) {
            rawGroupId = incomingData.data.from;
        } else {
            rawGroupId = incomingData.groupId || incomingData.chatId || "";
        }
        
        const cleanGroupId = rawGroupId.split('@')[0];
        console.log(`Extracted Text: "${messageText}" | Group: "${cleanGroupId}"`);

        // Block loops
        if (messageText.includes("Stock Asset Found") || messageText.includes("was not found")) {
            return res.status(200).json({ success: true });
        }

        if (!messageText || cleanGroupId !== TARGET_GROUP_ID) {
            console.log("Ignored: Empty text or unauthorized group.");
            return res.status(200).json({ success: true });
        }

        console.log(`Querying Google Drive for stock code: "${messageText}"`);

        // 3. Contact Google Script
        const driveLookup = await axios.get(`${GOOGLE_SCRIPT_URL}?stock=${encodeURIComponent(messageText)}`);
        const driveData = driveLookup.data;
        console.log("Google Drive Script Response:", JSON.stringify(driveData));

        const recipient = `${cleanGroupId}@g.us`;

        if (driveData && driveData.success) {
            // 🛠️ FIX: Extract the raw file ID from whatever link format Google Script sent back
            let fileId = "";
            if (driveData.imageUrl.includes("id=")) {
                fileId = driveData.imageUrl.split("id=")[1].split("&")[0];
            } else if (driveData.imageUrl.includes("/d/")) {
                fileId = driveData.imageUrl.split("/d/")[1].split("/")[0];
            } else {
                fileId = driveData.imageUrl;
            }

            // 🛠️ This special CDN endpoint forces Google to stream the image data directly so WhatsApp can render it
            const directStreamUrl = `https://lh3.googleusercontent.com/d/${fileId}`;
            console.log(`Generated Direct WhatsApp View Link: ${directStreamUrl}`);

            console.log("Sending clean image link to Aumpfy...");
            await axios.post(`https://api.aumpfy.com/api/v1/messages/send-media`, {
                to: recipient,
                type: "image",
                mediaUrl: directStreamUrl,
                caption: `✅ Stock Asset Found: ${driveData.fileName}`
            }, {
                headers: { 
                    'Authorization': `Bearer ${AUMPFY_API_KEY}`, 
                    'Content-Type': 'application/json' 
                }
            });
            console.log("🚀 Media dispatched successfully!");
        } else {
            console.log("Asset not found. Sending fallback notification...");
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
        return res.status(200).json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running dynamically on port ${PORT}`));
