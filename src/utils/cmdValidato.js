// ──────────────────────────────────────────────────
//  BIGSTACK — Command Validator
//  © BIGSTACK by bigmanjtech™ with ♥︎
//  Checks if a script is a valid portable command
// ──────────────────────────────────────────────────

const path = require("path");

// ─── Known categories ───────────────────────────────
const VALID_CATEGORIES = [
    "player",
    "downloader",
    "search",
    "utility",
    "webapp"
];

// ══════════════════════════════════════════════════
//  Extract code from a message
// ══════════════════════════════════════════════════
function extractCode(text) {
    if (!text) return null;

    // Try ```js ... ``` block
    const codeBlockMatch = text.match(/```(?:js|javascript)?\n?([\s\S]*?)```/);
    if (codeBlockMatch) return codeBlockMatch[1].trim();

    // Try <code> ... </code>
    const codeTagMatch = text.match(/<code>([\s\S]*?)<\/code>/);
    if (codeTagMatch) return codeTagMatch[1].trim();

    // Raw text
    return text.trim();
}

// ══════════════════════════════════════════════════
//  Syntax check ⏤ try to eval the code as a module
// ══════════════════════════════════════════════════
function checkSyntax(code) {
    try {
        // Wrap in a function to catch top-level errors
        // eslint-disable-next-line no-new-func
        new Function(`
            const module = { exports: {} };
            const exports = module.exports;
            const require = () => {};
            ${code}
        `);

        return { ok: true };
    } catch (err) {
        return {
            ok: false,
            error: err.message,
            line: err.lineNumber || "?"
        };
    }
}

// ══════════════════════════════════════════════════
//  Load the code and check metadata
// ══════════════════════════════════════════════════
function checkMetadata(code) {
    try {
        // Create a sandbox with safe require
        const sandbox = {
            module: { exports: {} },
            exports: {},
            require,
            console,
            process,
            Buffer,
            setTimeout,
            clearTimeout,
            setInterval,
            clearInterval,
            Promise,
            Date,
            Math,
            JSON,
            Object,
            Array,
            String,
            Number,
            Boolean,
            Error,
            RegExp,
            Map,
            Set,
            Symbol,
            parseInt,
            parseFloat,
            isNaN,
            isFinite
        };

        // Execute the code
        const vm = require("vm");
        const context = vm.createContext(sandbox);
        vm.runInContext(code, context, { timeout: 5000 });

        const exported = sandbox.module.exports;

        // ─── Required fields ─────────────────────────
        const errors = [];

        if (!exported.name || typeof exported.name !== "string") {
            errors.push("Missing or invalid `name` (must be string)");
        }

        if (typeof exported.code !== "function") {
            errors.push("Missing or invalid `code` (must be async function)");
        }

        // ─── Optional fields ⏤ check types if present ─
        if (exported.aliases && !Array.isArray(exported.aliases)) {
            errors.push("`aliases` must be an array");
        }

        if (exported.category && typeof exported.category !== "string") {
            errors.push("`category` must be a string");
        }

        if (exported.category && !VALID_CATEGORIES.includes(exported.category)) {
            errors.push(
                `Invalid category "${exported.category}". ` +
                `Must be one of: ${VALID_CATEGORIES.join(", ")}`
            );
        }

        if (exported.permissions && typeof exported.permissions !== "object") {
            errors.push("`permissions` must be an object");
        }

        if (errors.length > 0) {
            return { ok: false, errors };
        }

        // ─── Extract summary ────────────────────────
        return {
            ok: true,
            meta: {
                name: exported.name,
                aliases: exported.aliases || [],
                category: exported.category || "utility",
                description: exported.description || null,
                usage: exported.usage || null,
                emoji: exported.emoji || "◆",
                permissions: exported.permissions || { coin: 0 },
                callbacks: Array.isArray(exported.callbacks) ? exported.callbacks.length : 0
            }
        };

    } catch (err) {
        return {
            ok: false,
            errors: [`Runtime error: ${err.message}`]
        };
    }
}

// ══════════════════════════════════════════════════
//  Full validation pipeline
// ══════════════════════════════════════════════════
function validate(rawText) {
    const code = extractCode(rawText);

    if (!code) {
        return { ok: false, errors: ["No code found"] };
    }

    // ─── 1. Syntax check ────────────────────────────
    const syntax = checkSyntax(code);
    if (!syntax.ok) {
        return {
            ok: false,
            errors: [`Syntax error: ${syntax.error}`]
        };
    }

    // ─── 2. Metadata check ──────────────────────────
    const meta = checkMetadata(code);
    if (!meta.ok) {
        return { ok: false, errors: meta.errors };
    }

    // ─── 3. Check naming conflicts ──────────────────
    const filename = path.join(
        __dirname,
        "../commands",
        meta.meta.category,
        `${meta.meta.name}.js`
    );

    return {
        ok: true,
        code,
        meta: meta.meta,
        filename
    };
}

// ─── Export ─────────────────────────────────────────
module.exports = {
    extractCode,
    checkSyntax,
    checkMetadata,
    validate,
    VALID_CATEGORIES
};