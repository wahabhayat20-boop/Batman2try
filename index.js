const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    downloadContentFromMessage,
    delay
} = require('@whiskeysockets/baileys');
const express = require('express');
const cors = require('cors');
const pino = require('pino');
const fs = require('fs-extra');

const app = express();
app.use(cors());
app.use(express.json());

// ------------------- CRASH PREVENTERS -------------------
process.on('uncaughtException', (err) => console.log('Caught exception: ', err));
process.on('unhandledRejection', (reason, promise) => console.log('Unhandled Rejection: ', reason));

let sock;
const SESSION_DIR = './session';

if (!fs.existsSync(SESSION_DIR)) {
    fs.mkdirSync(SESSION_DIR, { recursive: true });
}

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: state,
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut);
            console.log('Connection closed. Reconnecting:', shouldReconnect);
            if (shouldReconnect) setTimeout(startBot, 5000);
        } else if (connection === 'open') {
            console.log('BATMAN MD BOT connected successfully!');
        }
    });

    // ------------------- MESSAGE HANDLER -------------------
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        const m = messages[0];
        if (!m.message) return;

        const from = m.key.remoteJid;
        const isGroup = from.endsWith('@g.us');
        
        // Extract body text
        const typeMsg = Object.keys(m.message)[0];
        let body = (typeMsg === 'conversation') ? m.message.conversation :
                   (typeMsg === 'imageMessage') ? m.message.imageMessage.caption :
                   (typeMsg === 'videoMessage') ? m.message.videoMessage.caption :
                   (typeMsg === 'extendedTextMessage') ? m.message.extendedTextMessage.text : '';

        if (!body.startsWith('.')) return;

        const args = body.slice(1).trim().split(/ +/);
        const command = args.shift().toLowerCase();
        const text = args.join(' ');

        try {
            // ------------------- 1. ADVANCED MENU -------------------
            if (command === 'menu' || command === 'help') {
                const fullMenuText = `
╭━━━〔 🔥 𝘽𝘼𝙏𝙈𝘼𝙉 𝙈𝘿 𝘽𝙊𝙏 🔥 〕━━━╮
┃ 
┃ ⚙️ Prefix : [ . ]
┃ 👤 Owner  : Batman
┃ ⚡ Speed  : 0.02s
┃
┣━━━⪧ ⚙️ 𝘼𝙐𝙏𝙊 𝙎𝙀𝙏𝙏𝙄𝙉𝙂𝙎
┃
┃ ◈ .autoreact on/off
┃ ◈ .autostatusview on/off
┃ ◈ .autostatuslike on/off
┃
┣━━━⪧ 👥 𝙂𝙍𝙊𝙐𝙋 𝘾𝙊𝙉𝙏𝙍𝙊𝙇
┃ 
┃ ◈ .tagall
┃ ◈ .hidetag
┃ ◈ .adminlist
┃ ◈ .groupinfo
┃ ◈ .kick
┃ ◈ .add
┃ ◈ .p
┃ ◈ .d
┃ ◈ .group open/close
┃ ◈ .link
┃ ◈ .revoke
┃ ◈ .setname
┃ ◈ .setdesc
┃ ◈ .mute / .unmute
┃ ◈ .antilink on/off
┃ ◈ .antistatus on/off
┃ ◈ .antispam on/off
┃ ◈ .antibot on/off
┃ ◈ .antiword on/off
┃ ◈ .antidelete on/off
┃ ◈ .warn
┃ ◈ .unwarn
┃ ◈ .resetlink
┃ ◈ .poll
┃ ◈ .del
┃
┣━━━⪧ 🕵️ 𝙎𝙀𝘾𝙍𝙀𝙏 𝙏𝙊𝙊𝙇𝙎
┃
┃ ◈ .vv (Direct In Secret DM)
┃
┣━━━⪧ 🔄 𝙈𝙀𝘿𝙄𝘼 𝘾𝙊𝙉𝙑𝙀𝙍𝙏𝙀𝙍𝙎
┃
┃ ◈ .s / .sticker
┃ ◈ .toimg / .toimage
┃ ◈ .tomp3 / .tovoice
┃ ◈ .tourl
┃
┣━━━⪧ 📥 𝘿𝙊𝙒𝙉𝙇𝙊𝘼𝘿𝙀𝙍
┃
┃ ◈ .play
┃ ◈ .song
┃ ◈ .video
┃ ◈ .ytmp4
┃ ◈ .ig / .instagram
┃ ◈ .fb / .facebook
┃
┣━━━⪧ 🤖 𝘼𝙄 𝘾𝙃𝘼𝙏
┃
┃ ◈ .ai
┃ ◈ .gpt
┃
┣━━━⪧ 🛠️ 𝙐𝙏𝙄𝙇𝙄𝙏𝙄𝙀𝙎 & 𝙎𝙔𝙎𝙏𝙀𝙈
┃
┃ ◈ .google
┃ ◈ .weather
┃ ◈ .ping / .speed
┃ ◈ .runtime / .uptime
┃ ◈ .clearcache
┃
┣━━━⪧ 👑 𝙊𝙒𝙉𝙀𝙍 𝙊𝙉𝙇𝙔
┃
┃ ◈ .public
┃ ◈ .private
┃ ◈ .restart
┃ ◈ .ban
┃ ◈ .unban
┃ ◈ .setprefix
┃ ◈ .block
┃ ◈ .unblock
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;

                await sock.sendMessage(from, {
                    text: fullMenuText,
                    contextInfo: {
                        externalAdReply: {
                            title: "🦇 BATMAN MD WHATSAPP BOT 🦇",
                            body: "Secret View-Once Saver Enabled",
                            mediaType: 1,
                            thumbnailUrl: "https://cdn.phototourl.com/free/2026-09-19-360ade3c-bad1-4cfb-8e77-506cfc80e765.jpg",
                            sourceUrl: "https://google.com",
                            renderLargerThumbnail: true
                        }
                    }
                }, { quoted: m });
            }

            // ------------------- 2. SECRET VIEW ONCE SAVER (.vv) -------------------
            else if (command === 'vv') {
                const quotedMsg = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
                if (!quotedMsg) return;

                let viewOnceMedia = quotedMsg.viewOnceMessageV2?.message || quotedMsg.viewOnceMessage?.message;
                if (!viewOnceMedia) return;

                let mediaType = Object.keys(viewOnceMedia)[0];
                let typeToDownload = 'image';
                if (mediaType === 'videoMessage') typeToDownload = 'video';
                if (mediaType === 'audioMessage') typeToDownload = 'audio';

                let stream = await downloadContentFromMessage(
                    viewOnceMedia[mediaType],
                    typeToDownload
                );

                let buffer = Buffer.from([]);
                for await (const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk]);
                }

                // Owner ka Apna Personal JID (In-box Direct Message Target)
                const ownerJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';

                // Send silently straight into Owner's Inbox (DM)
                if (mediaType === 'imageMessage') {
                    await sock.sendMessage(ownerJid, { image: buffer, caption: "🕵️ *Secret View-Once Photo Saved!*" });
                } else if (mediaType === 'videoMessage') {
                    await sock.sendMessage(ownerJid, { video: buffer, caption: "🕵️ *Secret View-Once Video Saved!*" });
                } else if (mediaType === 'audioMessage') {
                    await sock.sendMessage(ownerJid, { audio: buffer, ptt: true, mimetype: 'audio/mp4' });
                }
            }

            // ------------------- 3. PING / SPEED -------------------
            else if (command === 'ping' || command === 'speed') {
                const start = Date.now();
                await sock.sendMessage(from, { text: '⚡ Checking Speed...' }, { quoted: m });
                const end = Date.now();
                await sock.sendMessage(from, { text: `🚀 *BATMAN MD Speed:* ${end - start} ms` }, { quoted: m });
            }

            // ------------------- 4. GROUP TAGALL -------------------
            else if (command === 'tagall') {
                if (!isGroup) return;
                const groupMetadata = await sock.groupMetadata(from);
                let tagText = `📢 *TAG ALL MEMBERS*\n\n`;
                let mentions = groupMetadata.participants.map(p => p.id);
                for (let mem of groupMetadata.participants) {
                    tagText += `➣ @${mem.id.split('@')[0]}\n`;
                }
                await sock.sendMessage(from, { text: tagText, mentions }, { quoted: m });
            }

            // ------------------- 5. HIDETAG -------------------
            else if (command === 'hidetag') {
                if (!isGroup) return;
                const groupMetadata = await sock.groupMetadata(from);
                const mentions = groupMetadata.participants.map(p => p.id);
                await sock.sendMessage(from, { text: text || 'Attention Everyone!', mentions });
            }

        } catch (err) {
            console.log("Error running command:", err);
        }
    });
}

startBot();

// ------------------- API FOR PAIRING PANEL -------------------
app.post('/get-pairing-code', async (req, res) => {
    try {
        let phone = req.body.phone;
        if (!phone) return res.status(400).json({ error: "Phone number required!" });
        phone = phone.replace(/[^0-9]/g, '');

        if (!sock || !sock.authState.creds.registered) {
            await delay(1500);
            let code = await sock.requestPairingCode(phone);
            code = code?.match(/.{1,4}/g)?.join("-") || code;
            return res.json({ code });
        } else {
            return res.json({ error: "Bot is already connected!" });
        }
    } catch (err) {
        res.status(500).json({ error: "Failed to generate pairing code." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
      
