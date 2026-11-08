const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const logger = require("../core/logger");

async function convertMedia(buffer, outputExt) {
    const tempDir = path.resolve(__dirname, "../../downloads/temp");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    
    const id = Date.now() + "_" + Math.floor(Math.random() * 1000);
    const inPath = path.join(tempDir, `in_${id}.tmp`);
    const outPath = path.join(tempDir, `out_${id}.${outputExt}`);
    
    // Save the raw downloaded file to disk
    fs.writeFileSync(inPath, buffer);
    
    let command = "";
    if (outputExt === "mp3") {
        // Convert to standard 192kbps MP3
        command = `ffmpeg -i "${inPath}" -vn -ar 44100 -ac 2 -b:a 192k "${outPath}" -y`;
    } else if (outputExt === "mp4") {
        // Convert to H.264 + AAC (Telegram's perfect video format)
        command = `ffmpeg -i "${inPath}" -c:v libx264 -preset fast -c:a aac "${outPath}" -y`;
    }
    
    return new Promise((resolve) => {
        // Increase maxBuffer to prevent crashes from ffmpeg logs
        exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error) => {
            // Cleanup input file
            try { fs.unlinkSync(inPath); } catch (e) {}
            
            if (error) {
                logger.warn(`[FFmpeg] Conversion failed: ${error.message}. Sending original file.`);
                resolve(buffer); // Fallback to original if ffmpeg fails
            } else {
                const convertedBuffer = fs.readFileSync(outPath);
                try { fs.unlinkSync(outPath); } catch (e) {}
                logger.info(`[FFmpeg] Successfully converted to ${outputExt}`);
                resolve(convertedBuffer);
            }
        });
    });
}

module.exports = { convertMedia };