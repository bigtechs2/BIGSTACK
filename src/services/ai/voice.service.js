// ──────────────────────────────────────────────────
//  BIGSTACK — Voice Service (TTS + STT)
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");
const config = require("../../config");
const logger = require("../../core/logger");

// ══════════════════════════════════════════════════
//  TTS ⏤ Text to Speech
// ══════════════════════════════════════════════════
async function textToSpeech(text) {
    if (!text) throw new Error("Text is required");

    const providers = config.aiProviders?.tts || [];
    let lastError = null;

    for (const provider of providers) {
        if (provider.enabled === false) continue;

        try {
            logger.info(`[tts] trying ${provider.name}...`);

            const { data } = await axios.get(provider.url, {
                params: { [provider.param]: text.slice(0, 1000) },
                timeout: provider.timeout || 30000
            });

            const url = data?.result || data?.url || null;
            if (!url || !url.startsWith("http")) throw new Error("No audio URL");

            logger.info(`[tts] ✓ ${provider.name}`);
            return { url, provider: provider.name };

        } catch (err) {
            const msg = err.response ? `HTTP ${err.response.status}` : err.message;
            logger.warn(`[tts] ✗ ${provider.name}: ${msg}`);
            lastError = err;
        }
    }

    throw lastError || new Error("All TTS providers failed");
}

// ══════════════════════════════════════════════════
//  STT ⏤ Speech to Text (Groq Whisper)
// ══════════════════════════════════════════════════
async function speechToText(audioFilePath, language = "en") {
    if (!audioFilePath || !fs.existsSync(audioFilePath)) {
        throw new Error("Audio file not found");
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY missing in .env");

    logger.info(`[stt] uploading to Groq Whisper...`);

    const form = new FormData();
    form.append("file", fs.createReadStream(audioFilePath));
    form.append("model", "whisper-large-v3-turbo");
    form.append("response_format", "json");
    form.append("language", language);

    const { data } = await axios.post(
        "https://api.groq.com/openai/v1/audio/transcriptions",
        form,
        {
            headers: {
                ...form.getHeaders(),
                "Authorization": `Bearer ${apiKey}`
            },
            timeout: 60000,
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        }
    );

    const text = data?.text || "";
    if (!text) throw new Error("Empty transcription");

    logger.info(`[stt] ✓ ${text.length} chars`);
    return { text: text.trim() };
}

module.exports = { textToSpeech, speechToText };