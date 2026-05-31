const User = require("../models/userModels");
const GameRoom = require("../models/gameRoom");
const { getAppSettings } = require("../services/appSettingsService");
const CONFIG = require("../config/config");
const logger = require("../utils/winstonLogger");
const {
  sendBotMessageToChat,
  sendBotPhotoToChat,
  sendBotDocumentToChat,
} = require("../botController/notification");

// --- Telegram constraints and helpers ---
const BOT_GLOBAL_RATE_PER_SEC =
  typeof CONFIG.telegramRatePerSec === "number" &&
  Number.isFinite(CONFIG.telegramRatePerSec)
    ? CONFIG.telegramRatePerSec
    : 25; // conservative vs ~30/s
const BATCH_SIZE = BOT_GLOBAL_RATE_PER_SEC; // one API call per chat per tick
const TICK_MS = 1000; // 1s tick window
const MAX_MESSAGE_LEN = 4096; // Telegram message text limit
const MAX_CAPTION_LEN = 1024; // Telegram caption limit
const MAX_PHOTO_BYTES = 10 * 1024 * 1024; // ~10MB (photo upload limit)
const MAX_DOCUMENT_BYTES = 50 * 1024 * 1024; // ~50MB (bot file upload limit)

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function uniqueDefined(arr) {
  return Array.from(new Set(arr.filter(Boolean)));
}

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function splitByLimit(text, limit) {
  if (!text) return [];
  if (text.length <= limit) return [text];
  const parts = [];
  let remaining = text;
  while (remaining.length > limit) {
    // try to split at a newline near the limit
    let idx = remaining.lastIndexOf("\n", limit);
    if (idx < 0 || idx < limit - 512) idx = limit; // fallback hard split
    parts.push(remaining.slice(0, idx));
    remaining = remaining.slice(idx);
  }
  if (remaining) parts.push(remaining);
  return parts;
}

// Helper to send one message to many chats with batching and global rate limiting
async function sendBulk({
  chatIds,
  sendPerChat, // async (chatId) => void
  label = "message",
}) {
  const batches = chunk(chatIds, BATCH_SIZE);
  let sent = 0;
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    // run this batch in parallel (<= BATCH_SIZE per second)
    await Promise.all(
      batch.map(async (chatId) => {
        const result = await sendPerChat(chatId);
        if (result?.ok) sent += 1;
      })
    );
    if (i < batches.length - 1) await sleep(TICK_MS); // throttle between batches
  }
  logger.info("sendBulk done", { label, sentOk: sent, total: chatIds.length });
}

const sendNotification = async (req, res) => {
  try {
    const { description, amount, header, descriptionAbove } = req.body;
    const image = req.file ? req.file.buffer : null;

    // Enhanced validation
    if (!description && !image && !descriptionAbove) {
      return res.status(400).json({
        error:
          "A notification must include at least an image, a main message, or a message above the image.",
      });
    }
    if (amount && (isNaN(amount) || amount <= 0)) {
      return res
        .status(400)
        .json({ error: "Amount must be a positive number" });
    }

    // Fetch all real players with Telegram chat IDs (exclude robots and web placeholders)
    const players = await User.find({
      telegramId: { $exists: true, $ne: null, $not: /^web_/ },
      role: { $ne: "robot" },
      isRobot: { $ne: true },
    });
    if (!players || players.length === 0) {
      return res
        .status(404)
        .json({ error: "No players with Telegram chat IDs found" });
    }

    const playerChatIds = players.map((player) => player.telegramId);
    const supportGroupChatId = CONFIG.supportGroupChatId;
    const allChatIds = uniqueDefined([...playerChatIds, supportGroupChatId]);

    // Fetch game room if amount is provided
    let gameRoom = null;
    let playButton = null;
    if (amount) {
      gameRoom = await GameRoom.findOne({ stakeAmount: parseFloat(amount) });
      if (gameRoom) {
        const {
          _id: roomId,
          stakeAmount,
          numberOfPlayers,
          winAmount,
        } = gameRoom;
  const miniappdUrl = CONFIG.miniAppUrl;
        const miniAppUrl = `${miniappdUrl}/cards-list/${stakeAmount}`;
        playButton = { text: "🎮 Play Now", web_app: { url: miniAppUrl } };
      } else {
        logger.warn("notificationController: no game room found for stake amount", { amount });
      }
    }

    // Construct the notification message components
    const { identity } = await getAppSettings();
    const defaultTitle = identity?.appName
      ? `🎉 ${identity.appName} Update 🎉`
      : "🎉 Game Update 🎉";
    const title = header || defaultTitle;
    const divider = "━━━━━━━━━━━━━━━━━━━";

    const formatText = (text, icon) =>
      text
        ? text
            .split("\n")
            .map((line) => `${icon} ${escapeHtml(line.trim())}`)
            .join("\n")
        : "";

    const formattedDescriptionAbove = formatText(descriptionAbove, "📢");
    const formattedDescription = formatText(description, "✨");
    const stakeInfo = amount
      ? `💰 <b>Stake Amount:</b> ${escapeHtml(amount)}`
      : "";

    // Build title block in HTML to avoid Markdown parsing issues
    const htmlTitle = `<b>${escapeHtml(title)}</b>`;

    // Scenario 1: Text above and below an image
    if (image && formattedDescriptionAbove && formattedDescription) {
      // Scenario 1: Text above and below an image
      const aboveHtml = [formattedDescriptionAbove]
        .filter(Boolean)
        .join("\n\n");
      const belowCaptionHtml = [
        htmlTitle,
        divider,
        formattedDescription,
        stakeInfo,
        divider,
      ]
        .filter(Boolean)
        .join("\n");

      // 1) Send the "above" text first to everyone with batching
      await sendBulk({
        chatIds: allChatIds,
        label: "above-text",
        sendPerChat: async (chatId) => {
          const parts = splitByLimit(aboveHtml, MAX_MESSAGE_LEN);
          for (const part of parts) {
            const r = await sendBotMessageToChat(chatId, part, { parseMode: "HTML" });
            if (!r.ok) return r;
          }
          return { ok: true };
        },
      });

      // 2) Then send the image with caption (auto-fallback to document if too large)
      const captionParts = splitByLimit(belowCaptionHtml, MAX_CAPTION_LEN);
      const firstCaption = captionParts[0] || "";
      const remainingCaption = captionParts.slice(1).join("");
      const replyMarkup = playButton
        ? { inline_keyboard: [[playButton]] }
        : undefined;

      await sendBulk({
        chatIds: allChatIds,
        label: "image-with-caption",
        sendPerChat: async (chatId) => {
          // if image too large even for document, fall back to text-only note
          if (image.length > MAX_DOCUMENT_BYTES) {
            const note = `${belowCaptionHtml}\n\n⚠️ Image too large to deliver. Please check the app or website for details.`;
            const parts = splitByLimit(note, MAX_MESSAGE_LEN);
            for (const part of parts) {
              const r = await sendBotMessageToChat(chatId, part, {
                parseMode: "HTML",
                replyMarkup,
              });
              if (!r.ok) return r;
            }
            return { ok: true };
          }

          // prefer photo if size permits, else send as document
          let res;
          if (image.length > MAX_PHOTO_BYTES) {
            res = await sendBotDocumentToChat(chatId, image, {
              filename: "image.jpg",
              contentType: "image/jpeg",
              caption: firstCaption,
              parseMode: "HTML",
              replyMarkup,
            });
          } else {
            res = await sendBotPhotoToChat(chatId, image, {
              filename: "image.jpg",
              contentType: "image/jpeg",
              caption: firstCaption,
              parseMode: "HTML",
              replyMarkup,
            });
            // Fallback: if photo fails, try document once
            if (!res.ok && !res.skip) {
              res = await sendBotDocumentToChat(chatId, image, {
                filename: "image.jpg",
                contentType: "image/jpeg",
                caption: firstCaption,
                parseMode: "HTML",
                replyMarkup,
              });
            }
          }

          // If we have leftover caption text, send it as a follow-up text
          if (res.ok && remainingCaption) {
            const parts = splitByLimit(remainingCaption, MAX_MESSAGE_LEN);
            for (const part of parts) {
              const r2 = await sendBotMessageToChat(chatId, part, { parseMode: "HTML" });
              if (!r2.ok) break;
            }
          }
          return res;
        },
      });
    } else {
      // Scenario 2: A single message (text only, or image with one caption)
      const messageHtml = [
        htmlTitle,
        divider,
        formattedDescriptionAbove,
        formattedDescription,
        stakeInfo,
        divider,
      ]
        .filter(Boolean)
        .join("\n\n");

      const replyMarkup = playButton
        ? { inline_keyboard: [[playButton]] }
        : undefined;

      if (!image) {
        // text-only, split if needed
        const parts = splitByLimit(messageHtml, MAX_MESSAGE_LEN);
        for (let idx = 0; idx < parts.length; idx++) {
          const label = idx === 0 ? "text" : `text-part-${idx + 1}`;
          await sendBulk({
            chatIds: allChatIds,
            label,
            sendPerChat: (chatId) =>
              sendBotMessageToChat(chatId, parts[idx], {
                parseMode: "HTML",
                replyMarkup,
              }),
          });
        }
      } else {
        // image + caption
        const captionParts = splitByLimit(messageHtml, MAX_CAPTION_LEN);
        const firstCaption = captionParts[0] || "";
        const remaining = captionParts.slice(1).join("");

        await sendBulk({
          chatIds: allChatIds,
          label: "image-single",
          sendPerChat: async (chatId) => {
            if (image.length > MAX_DOCUMENT_BYTES) {
              const note = `${messageHtml}\n\n⚠️ Image too large to deliver. Please check the app or website for details.`;
              const parts = splitByLimit(note, MAX_MESSAGE_LEN);
              for (const part of parts) {
                const r = await sendBotMessageToChat(chatId, part, {
                  parseMode: "HTML",
                  replyMarkup,
                });
                if (!r.ok) return r;
              }
              return { ok: true };
            }

            let r;
            if (image.length > MAX_PHOTO_BYTES) {
              r = await sendBotDocumentToChat(chatId, image, {
                filename: "image.jpg",
                contentType: "image/jpeg",
                caption: firstCaption,
                parseMode: "HTML",
                replyMarkup,
              });
            } else {
              r = await sendBotPhotoToChat(chatId, image, {
                filename: "image.jpg",
                contentType: "image/jpeg",
                caption: firstCaption,
                parseMode: "HTML",
                replyMarkup,
              });
              if (!r.ok && !r.skip) {
                r = await sendBotDocumentToChat(chatId, image, {
                  filename: "image.jpg",
                  contentType: "image/jpeg",
                  caption: firstCaption,
                  parseMode: "HTML",
                  replyMarkup,
                });
              }
            }
            if (r.ok && remaining) {
              const parts = splitByLimit(remaining, MAX_MESSAGE_LEN);
              for (const part of parts) {
                const r2 = await sendBotMessageToChat(chatId, part, { parseMode: "HTML" });
                if (!r2.ok) break;
              }
            }
            return r;
          },
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Notifications queued and sent in batches",
    });
  } catch (error) {
    logger.error("Error in sendNotification", {
      error: error?.message || String(error),
      stack: error?.stack,
    });
    return res.status(500).json({ error: "Failed to send notifications" });
  }
};

module.exports = { sendNotification };
