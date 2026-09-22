// ──────────────────────────────────────────────────
//  BIGSTACK — AI Providers
//  © BIGSTACK by bigmanjtech™ with ♥︎
//
//  Ordered list ⏤ try top to bottom ⏤ first success wins.
// ──────────────────────────────────────────────────

module.exports = {

    chat: [
        // ═════════════════════════════════════════
        //  ZELLRAYY ⏤ main provider, rich models
        // ═════════════════════════════════════════
        {
            name: "zellrayy-gpt",
            url: "https://zellrayy.com/ai/gpt",
            method: "GET",
            param: "q",
            extraParams: { model: "gpt-5-6-terra" },
            timeout: 30000,
            enabled: true,
            shape: "zellrayy",
            tier: 1
        },
        {
            name: "zellrayy-gemini",
            url: "https://zellrayy.com/ai/gemini",
            method: "GET",
            param: "q",
            extraParams: { model: "3-1-pro" },
            timeout: 30000,
            enabled: true,
            shape: "zellrayy",
            tier: 1
        },
        {
            name: "zellrayy-deepseek",
            url: "https://zellrayy.com/ai/deepseek",
            method: "GET",
            param: "q",
            extraParams: { model: "v4-pro" },
            timeout: 30000,
            enabled: true,
            shape: "zellrayy",
            tier: 1
        },
        {
            name: "zellrayy-claude",
            url: "https://zellrayy.com/ai/claude",
            method: "GET",
            param: "q",
            extraParams: { model: "haiku-4-5" },
            timeout: 30000,
            enabled: true,
            shape: "zellrayy",
            tier: 1
        },
        {
            name: "zellrayy-grok",
            url: "https://zellrayy.com/ai/grok",
            method: "GET",
            param: "q",
            extraParams: { model: "grok-4-1-fast" },
            timeout: 30000,
            enabled: true,
            shape: "zellrayy",
            tier: 1
        },
        {
            name: "zellrayy-unlimited",
            url: "https://zellrayy.com/ai/unlimited",
            method: "GET",
            param: "q",
            timeout: 30000,
            enabled: true,
            shape: "zellrayy",
            tier: 2
        },

        // ═════════════════════════════════════════
        //  NEXRAY ⏤ backup provider
        // ═════════════════════════════════════════
        {
            name: "nexray-claude",
            url: "https://api.nexray.eu.cc/ai/claude",
            method: "GET",
            param: "text",
            timeout: 30000,
            enabled: true,
            shape: "nexray",
            tier: 2
        },
        {
            name: "nexray-gpt",
            url: "https://api.nexray.eu.cc/ai/gpt-3.5-turbo",
            method: "GET",
            param: "text",
            timeout: 30000,
            enabled: true,
            shape: "nexray",
            tier: 2
        },
        {
            name: "nexray-public",
            url: "https://api.nexray.eu.cc/ai/public",
            method: "GET",
            param: "text",
            timeout: 30000,
            enabled: true,
            shape: "nexray",
            tier: 3
        },

        // ═════════════════════════════════════════
        //  AZBRY ⏤ final fallback
        // ═════════════════════════════════════════
        {
            name: "azbry-gptfree",
            url: "https://api.azbry.com/api/ai/gptfree",
            method: "GET",
            param: "q",
            timeout: 30000,
            enabled: true,
            shape: "azbry",
            tier: 3
        }
    ]

};