// ──────────────────────────────────────────────────
//  BIGSTACK — AI Providers
//  © BIGSTACK by bigmanjtech™ with ♥︎
// ──────────────────────────────────────────────────

const DC_KEY = process.env.DAVIDCYRIL_KEY || "dc_live__QTnLsE1YSVTzwpNmWqTA1VilR2bP8WX";

module.exports = {

    // ═════════════════════════════════════════════
    //  CHAT — ordered by quality
    // ═════════════════════════════════════════════
    chat: [
        // ─── David Cyril ⏤ best models ───
        { name: "dc-claude-opus-4.7",  url: "https://apis.davidcyriltech.my.id/ai/claude-opus-4.7",  param: "prompt", shape: "davidcyril", headers: { "X-API-Key": DC_KEY }, timeout: 40000, tier: 1, enabled: true },
        { name: "dc-gpt-4o",            url: "https://apis.davidcyriltech.my.id/ai/gpt-4o",            param: "prompt", shape: "davidcyril", headers: { "X-API-Key": DC_KEY }, timeout: 40000, tier: 1, enabled: true },
        { name: "dc-gemini-3.1-pro",    url: "https://apis.davidcyriltech.my.id/ai/gemini-3.1-pro",    param: "prompt", shape: "davidcyril", headers: { "X-API-Key": DC_KEY }, timeout: 40000, tier: 1, enabled: true },
        { name: "dc-claude-sonnet-4.6", url: "https://apis.davidcyriltech.my.id/ai/claude-sonnet-4.6", param: "prompt", shape: "davidcyril", headers: { "X-API-Key": DC_KEY }, timeout: 40000, tier: 1, enabled: true },
        { name: "dc-deepseek-v4-pro",   url: "https://apis.davidcyriltech.my.id/ai/deepseek-v4-pro",   param: "prompt", shape: "davidcyril", headers: { "X-API-Key": DC_KEY }, timeout: 40000, tier: 1, enabled: true },
        { name: "dc-llama-4-maverick",  url: "https://apis.davidcyriltech.my.id/ai/llama-4-maverick",  param: "prompt", shape: "davidcyril", headers: { "X-API-Key": DC_KEY }, timeout: 40000, tier: 2, enabled: true },
        { name: "dc-gemini-flash",      url: "https://apis.davidcyriltech.my.id/ai/gemini-3.1-flash-lite", param: "prompt", shape: "davidcyril", headers: { "X-API-Key": DC_KEY }, timeout: 30000, tier: 2, enabled: true },
        { name: "dc-deepseek-thinking", url: "https://apis.davidcyriltech.my.id/ai/deepseek-v3.2-thinking", param: "prompt", shape: "davidcyril", headers: { "X-API-Key": DC_KEY }, timeout: 40000, tier: 2, enabled: true },

        // ─── Zellrayy ⏤ backup ───
        { name: "zellrayy-gpt",         url: "https://zellrayy.com/ai/gpt",    param: "q", shape: "zellrayy", extraParams: { model: "gpt-5-6-terra" }, timeout: 30000, tier: 3, enabled: true },
        { name: "zellrayy-gemini",      url: "https://zellrayy.com/ai/gemini", param: "q", shape: "zellrayy", extraParams: { model: "3-1-pro" },     timeout: 30000, tier: 3, enabled: true },

        // ─── Nexray ⏤ last resort ───
        { name: "nexray-claude",        url: "https://api.nexray.eu.cc/ai/claude",        param: "text", shape: "nexray", timeout: 30000, tier: 4, enabled: true },
        { name: "nexray-gpt",           url: "https://api.nexray.eu.cc/ai/gpt-3.5-turbo", param: "text", shape: "nexray", timeout: 30000, tier: 4, enabled: true },
        { name: "nexray-public",        url: "https://api.nexray.eu.cc/ai/public",        param: "text", shape: "nexray", timeout: 30000, tier: 5, enabled: true }
    ],

    // ═════════════════════════════════════════════
    //  IMAGE GENERATION
    // ═════════════════════════════════════════════
    image: [
        { name: "dc-anonymous",  url: "https://apis.davidcyriltech.my.id/ai/anonymous/image", param: "prompt", shape: "dc-image-1", headers: { "X-API-Key": DC_KEY }, timeout: 60000, enabled: true },
        { name: "dc-fluxv2",     url: "https://apis.davidcyriltech.my.id/fluxv2",             param: "prompt", shape: "dc-image-2", headers: { "X-API-Key": DC_KEY }, timeout: 60000, enabled: true },
        { name: "dc-writecream", url: "https://apis.davidcyriltech.my.id/ai/writecream/image", param: "prompt", shape: "dc-image-3", extraParams: { ratio: "1:1" }, headers: { "X-API-Key": DC_KEY }, timeout: 60000, enabled: true },
        { name: "azbry-imagegen", url: "https://api.azbry.com/api/ai/imagegen", param: "prompt", shape: "azbry-image", timeout: 60000, enabled: true },
        { name: "nexray-ideogram", url: "https://api.nexray.eu.cc/ai/ideogram", param: "prompt", shape: "nexray-image", timeout: 60000, enabled: true }
    ],

    // ═════════════════════════════════════════════
    //  VISION ⏤ describe images
    // ═════════════════════════════════════════════
    vision: [
        { name: "dc-vision",     url: "https://apis.davidcyriltech.my.id/ai/vision",           param: "image", shape: "dc-vision", headers: { "X-API-Key": DC_KEY }, timeout: 40000, enabled: true },
        { name: "dc-anon-vision", url: "https://apis.davidcyriltech.my.id/ai/anonymous/vision", param: "image", shape: "dc-vision", headers: { "X-API-Key": DC_KEY }, timeout: 40000, enabled: true }
    ],

    // ═════════════════════════════════════════════
    //  TTS ⏤ text to speech
    // ═════════════════════════════════════════════
    tts: [
        { name: "nexray-tts", url: "https://api.nexray.eu.cc/ai/gemini-tts", param: "text", shape: "nexray-tts", timeout: 30000, enabled: true }
    ],

    // ═════════════════════════════════════════════
    //  STT ⏤ speech to text (Groq Whisper)
    // ═════════════════════════════════════════════
    stt: [
        { name: "groq-whisper", url: "https://api.groq.com/openai/v1/audio/transcriptions", model: "whisper-large-v3-turbo", shape: "groq", enabled: true }
    ],

    // ═════════════════════════════════════════════
    //  UPLOAD ⏤ file hosting
    // ═════════════════════════════════════════════
    upload: [
        { name: "nexray", url: "https://api.nexray.eu.cc/upload", shape: "nexray-upload", timeout: 60000, enabled: true }
    ],

    // ═════════════════════════════════════════════
    //  MUSIC RECOGNITION
    // ═════════════════════════════════════════════
    music: [
        { name: "nexray-whatsmusic", url: "https://api.nexray.eu.cc/tools/whatsmusic", param: "url", shape: "whatsmusic", timeout: 30000, enabled: true }
    ]

};