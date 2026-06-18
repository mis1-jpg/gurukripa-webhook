const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

// CONFIG
const AUMPFY_API_KEY = "sl_1fb665f";
const TARGET_GROUP_ID = "120363424655127657"; 

// 🔗 Your live Google Apps Script web app URL
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyby8T5B3F27QlZJ3pD6j3U3Q3nSLo8ulWHiET2yryE3kslhSHQZlU2Tf8kOr0PzWAF/exec";

app.post('/guru-kripa/webhook', async (req, res) => {
    try {
        const incomingData = req.body;
        console.log("=== NEW WEBHOOK RECEIVED ===");

        const eventType = incomingData.event;
        if (eventType && eventType !== "MESSAGE_RECEIVED") {
            return res.status(200).json({ success: true, message: "Ignored non-message event" });
        }

        // Extract message text safely
        let messageText = "";
        if (incomingData.data && incomingData.data.body) {
            messageText = incomingData.data.body.trim();
        } else if (incomingData.text) {
            messageText = incomingData.text.trim();
        }

        // Extract and clean Group ID
        let rawGroupId = "";
        if (incomingData.data && incomingData.data.from) {
            rawGroupId = incomingData.data.from;
        } else {
            rawGroupId = incomingData.groupId || incomingData.chatId || "";
        }
        
        const cleanGroupId = rawGroupId.split('@')[0];

        console.log(`Extracted Text: "${messageText}"`);
        console.log(`Cleaned Group ID: "${cleanGroupId}"`);

        // Prevent loop triggers
        if (messageText.includes("Stock Asset Found") || messageText.includes("was not found")) {
            return res.status(200).json({ success: true, message: "Ignored loop" });
        }

        if (!messageText) {
            return res.status(200).json({ success: true, message: "Empty text message ignored" });
        }

        // Validate Group ID
        if (cleanGroupId !== TARGET_GROUP_ID) {
            console.log(`Ignored: Group ${cleanGroupId} does not match target ${TARGET_GROUP_ID}`);
            return res.status(200).json({ success: true, message: "Group mismatch" });
        }

        console.log(`Searching Drive for Stock Number: "${messageText}"`);

        // Ask Google Drive
        const driveLookup = await axios.get(`${GOOGLE_SCRIPT_URL}?stock=${encodeURIComponent(messageText)}`);
        const driveData = driveLookup.data;
        console.log("Google Drive Response:", JSON.stringify(driveData));

        const recipient = cleanGroupId + "@g.us";

        if (driveData && driveData.success) {
            // Extract the pure file ID from Google's response link
            let fileId = "";
            if (driveData.imageUrl.includes("id=")) {
                fileId = driveData.imageUrl.split("id=")[1];
            } else if (driveData.imageUrl.includes("/d/")) {
                fileId = driveData.imageUrl.split("/d/")[1].split("/")[0];
            } else {
                fileId = driveData.imageUrl;
            }
            
            // Format to a clean, verifiable direct view source link
            const verifiedDirectUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
            console.log(`Sending streaming link back to WhatsApp: ${verifiedDirectUrl}`);

            await axios.post(`https://api.aumpfy.com/api/v1/messages/send-media`, {
                to: recipient,
                type: "image",
                mediaUrl: verifiedDirectUrl,
                caption: `✅ Stock Asset Found: ${driveData.fileName}`
            }, {
                headers: { 'Authorization': `Bearer ${AUMPFY_API_KEY}`, 'Content-Type': 'application/json' }
            });
            console.log("Image successfully sent to WhatsApp!");
        } else {
            console.log(`Stock number not found.`);
            await axios.post(`https://api.aumpfy.com/api/v1/messages/send-text`, {
                to: recipient,
                text: `❌ Stock item "${messageText}" was not found in folders.`
            }, {
                headers: { 'Authorization': `Bearer ${AUMPFY_API_KEY}`, 'Content-Type': 'application/json' }
            });
        }

        res.status(200).json({ success: true });

    } catch (error) {
        console.error("🔴 SERVER ERROR:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running dynamically on port ${PORT}`));
