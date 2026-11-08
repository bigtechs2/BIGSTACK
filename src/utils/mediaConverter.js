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
    
    fs.writeFileSync(inPath, buffer);
    
    let command = "";
    if (outputExt === "mp3") {
        // Force standard MP3 codec (works on all Androids)
        command = `ffmpeg -i "${inPath}" -vn -c:a libmp3lame -ar 44100 -ac 2 -b:a 192k "${outPath}" -y`;
    } else if (outputExt === "mp4") {
        // Force standard H.264 + AAC + yuv420p (works on all Androids)
        command = `ffmpeg -i "${inPath}" -c:v libx264 -preset fast -pix_fmt yuv420p -c:a aac -b:a 128k "${outPath}" -y`;
    }
    
    return new Promise((resolve, reject) => {
        exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error) => {
            try { fs.unlinkSync(inPath); } catch (e) {}
            
            if (error) {
                logger.error(`[FFmpeg] Conversion failed: ${error.message}`);
                // Delete broken output if it exists
                try { fs.unlinkSync(outPath); } catch (e) {}
                // Reject the promise so the bot knows the file is bad
                return reject(new Error("Failed to convert media. Source might be corrupt."));
            } 
            
            const convertedBuffer = fs.readFileSync(outPath);
            try { fs.unlinkSync(outPath); } catch (e) {}
            logger.info(`[FFmpeg] Successfully converted to ${outputExt}`);
            resolve(convertedBuffer);
        });
    });
}

module.exports = { convertMedia };