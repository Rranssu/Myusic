const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const { Readable } = require("stream");

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeMap = {
    ".mp3": "audio/mpeg",
    ".flac": "audio/flac",
    ".wav": "audio/wav",
    ".m4a": "audio/mp4",
    ".aac": "audio/aac",
    ".ogg": "audio/ogg",
    ".opus": "audio/ogg",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".mp4": "video/mp4",
    ".webm": "video/webm"
  };
  return mimeMap[ext] || "application/octet-stream";
}

function setupCustomProtocol(protocol, net, artworkCacheDir, animatedCacheDir) {
  protocol.handle("atom", async (request) => {
    try {
      const urlObj = new URL(request.url);

      // 1. Static Artwork Route
      if (urlObj.hostname === "artwork") {
        const fileName = decodeURIComponent(urlObj.pathname.slice(1));
        const fullPath = path.join(artworkCacheDir, fileName);

        if (fs.existsSync(fullPath)) {
          const buffer = fs.readFileSync(fullPath);
          return new Response(buffer, {
            status: 200,
            headers: {
              "Content-Type": getMimeType(fullPath),
              "Access-Control-Allow-Origin": "*",
              "Cache-Control": "public, max-age=31536000"
            }
          });
        }
      }

      // 2. Animated Artwork Video Route (.mp4 with Range seeking)
      // 2. Animated Artwork Video Route (.mp4 with Range seeking)
      if (urlObj.hostname === "animated") {
        const fileName = decodeURIComponent(urlObj.pathname.slice(1));
        const fullPath = path.join(animatedCacheDir, fileName);

        const fileExists = fs.existsSync(fullPath);
        console.log(`[Protocol atom://animated] Request: "${fileName}" | Exists on disk: ${fileExists}`);

        if (fileExists) {
          const stat = fs.statSync(fullPath);
          const fileSize = stat.size;
          const rangeHeader = request.headers.get("range");

          if (rangeHeader) {
            const parts = rangeHeader.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunkSize = end - start + 1;

            const nodeStream = fs.createReadStream(fullPath, { start, end });
            const webStream = Readable.toWeb(nodeStream);

            return new Response(webStream, {
              status: 206,
              statusText: "Partial Content",
              headers: {
                "Content-Range": `bytes ${start}-${end}/${fileSize}`,
                "Accept-Ranges": "bytes",
                "Content-Length": chunkSize.toString(),
                "Content-Type": "video/mp4",
                "Access-Control-Allow-Origin": "*"
              }
            });
          }

          const nodeStream = fs.createReadStream(fullPath);
          const webStream = Readable.toWeb(nodeStream);
          return new Response(webStream, {
            status: 200,
            headers: {
              "Content-Type": "video/mp4",
              "Content-Length": fileSize.toString(),
              "Accept-Ranges": "bytes",
              "Access-Control-Allow-Origin": "*"
            }
          });
        }
      }

      // 3. Audio Track Route with HTTP 206 Range Seeking
      if (urlObj.hostname === "track") {
        const rawTrackPath = decodeURIComponent(urlObj.searchParams.get("path") || "");
        if (!fs.existsSync(rawTrackPath)) {
          return new Response("Audio file not found", { status: 404 });
        }

        const stat = fs.statSync(rawTrackPath);
        const fileSize = stat.size;
        const contentType = getMimeType(rawTrackPath);
        const rangeHeader = request.headers.get("range");

        if (rangeHeader) {
          const parts = rangeHeader.replace(/bytes=/, "").split("-");
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

          if (start >= fileSize) {
            return new Response("Requested range not satisfiable", {
              status: 416,
              headers: { "Content-Range": `bytes */${fileSize}` }
            });
          }

          const chunkSize = end - start + 1;
          const nodeStream = fs.createReadStream(rawTrackPath, { start, end });
          const webStream = Readable.toWeb(nodeStream);

          return new Response(webStream, {
            status: 206,
            statusText: "Partial Content",
            headers: {
              "Content-Range": `bytes ${start}-${end}/${fileSize}`,
              "Accept-Ranges": "bytes",
              "Content-Length": chunkSize.toString(),
              "Content-Type": contentType,
              "Access-Control-Allow-Origin": "*"
            }
          });
        }

        const nodeStream = fs.createReadStream(rawTrackPath);
        const webStream = Readable.toWeb(nodeStream);

        return new Response(webStream, {
          status: 200,
          headers: {
            "Content-Length": fileSize.toString(),
            "Accept-Ranges": "bytes",
            "Content-Type": contentType,
            "Access-Control-Allow-Origin": "*"
          }
        });
      }

      // 4. Fallback Route
      let rawPath = decodeURIComponent(request.url.slice("atom://".length));
      if (/^[a-zA-Z]\//.test(rawPath)) {
        rawPath = rawPath[0].toUpperCase() + ":/" + rawPath.slice(2);
      } else if (rawPath.startsWith("/") && process.platform === "win32") {
        rawPath = rawPath.slice(1);
      }

      if (fs.existsSync(rawPath)) {
        return net.fetch(pathToFileURL(rawPath).toString());
      }

      return new Response("Not found", { status: 404 });
    } catch (err) {
      console.error("Protocol error:", err);
      return new Response("Internal Server Error", { status: 500 });
    }
  });
}

module.exports = { setupCustomProtocol, getMimeType };