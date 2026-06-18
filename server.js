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
        console.log("Webhook Received:", incomingData);

        // 1. Process ONLY incoming text messages
        if (incomingData.event && incomingData.event !== "MESSAGE_RECEIVED") {
            return res.status(200).json({ success: true, message: "Ignored status event update" });
        }

        const messageText = (incomingData.text || "").trim(); // This extracts the stock number (e.g., 8156)
        const groupId = incomingData.groupId || incomingData.chatId || incomingData.fromGroup;

        // 2. Prevent loops by ignoring the bot's own automated replies
        if (messageText.includes("Stock Asset Found") || messageText.includes("was not found in the Nakshi/Jawadu")) {
            return res.status(200).json({ success: true, message: "Ignored bot's own reply to avoid infinite loop" });
        }

        // 3. ❌ IGNORE if NOT from your target WhatsApp group
        if (groupId !== TARGET_GROUP_ID) {
            console.log(`Ignored: Message from group/chat ${groupId} does not match target.`);
            return res.status(200).json({ success: true, message: "Ignored non-target group" });
        }

        if (!messageText) {
            return res.status(200).json({ success: true, message: "Empty text message ignored" });
        }

        console.log(`Searching Drive catalog for Stock Number: "${messageText}"`);

        // 4. 🔍 Ask Google Drive (via Apps Script Web App) to find the file
        const driveLookup = await axios.get(`${GOOGLE_SCRIPT_URL}?stock=${encodeURIComponent(messageText)}`);
        const driveData = driveLookup.data;

        const whatsappApiUrl = `https://api.aumpfy.com/api/v1/messages/send-media`;

        // 5. ✅ If image is found, send it back to the group
        if (driveData && driveData.success) {
            console.log(`Found file ${driveData.fileName}! Sending media response to group...`);
            
            const payload = {
                to: groupId,
                type: "image",
                mediaUrl: driveData.imageUrl,
                caption: `✅ Stock Asset Found: ${driveData.fileName}`
            };

            await axios.post(whatsappApiUrl, payload, {
                headers: {
                    'Authorization': `Bearer ${AUMPFY_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            });
        } else {
            // 6. ❌ If image is not found, send an alert text to the group
            console.log(`Stock number "${messageText}" was not found in Google Drive.`);
            
            await axios.post(`https://api.aumpfy.com/api/v1/messages/send-text`, {
                to: groupId,
                text: `❌ Stock item "${messageText}" was not found in the Nakshi/Jawadu folders.`
            }, {
                headers: {
                    'Authorization': `Bearer ${AUMPFY_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            });
        }

        res.status(200).json({ success: true, message: "Processed stock query loop" });

    } catch (error) {
        console.error("Error running server automation logic:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running dynamically on port ${PORT}`));
