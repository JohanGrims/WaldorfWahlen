import express from "express";
import path from "path";
import fs from "fs";

// Advanced logging utility
function log(message, meta = {}) {
  const time = new Date().toISOString();
  const metaStr = Object.keys(meta).length ? ` | ${JSON.stringify(meta)}` : "";
  console.log(`[${time}] ${message}${metaStr}`);
}

const app = express();
// PORT env var is set by Cloud Run
const port = process.env.PORT || 3000;

// Function to replace placeholders in content without modifying original files
function replacePlaceholdersInContent(content, schoolId) {
  return content.replace(/SCHOOLID/g, schoolId);
}

// Improved school ID extraction logic for local and production
function getSchoolIdFromHost(req) {
  const forwardedHost = req.headers["x-forwarded-host"];
  const host = req.headers["host"];
  const hostname = forwardedHost || host || "unknown";
  let schoolId;
  // Try to extract subdomain (schoolId) if present
  if (hostname.includes(".")) {
    schoolId = hostname.split(".")[0];
    // If subdomain is 'localhost', fallback to 'dev' or 'unknown'
    if (schoolId === "localhost") {
      schoolId = "dev";
    }
  } else if (hostname === "localhost" || hostname.startsWith("localhost:")) {
    schoolId = "dev";
  } else {
    schoolId = hostname;
  }
  log("Extracted schoolId from host", {
    schoolId,
    hostname,
    forwardedHost,
    host,
    url: req.url,
    headers: req.headers,
  });
  return schoolId;
}

// Custom static middleware that replaces placeholders on-the-fly
app.use((req, res, next) => {
  const ext = path.extname(req.path).toLowerCase();
  const textExtensions = [
    ".html",
    ".js",
    ".css",
    ".json",
    ".txt",
    ".xml",
    ".svg",
  ];
  if (!textExtensions.includes(ext) && req.path !== "/") {
    return next();
  }
  const schoolId = getSchoolIdFromHost(req);
  const filePath = path.join(process.cwd(), "dist", req.path);
  log("Static middleware handling request", {
    schoolId,
    path: req.path,
    filePath,
  });
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    try {
      let content = fs.readFileSync(filePath, "utf8");
      if (content.includes("SCHOOLID")) {
        log("Preparing to replace SCHOOLID in file", {
          schoolId,
          filePath,
          contentPreview: content.slice(0, 100),
        });
        const replacedContent = replacePlaceholdersInContent(content, schoolId);
        log("After replacement", {
          schoolId,
          filePath,
          replacedPreview: replacedContent.slice(0, 100),
        });
        content = replacedContent;
      }
      if (ext === ".html") {
        res.setHeader("Content-Type", "text/html");
      } else if (ext === ".js") {
        res.setHeader("Content-Type", "application/javascript");
      } else if (ext === ".css") {
        res.setHeader("Content-Type", "text/css");
      } else if (ext === ".json") {
        res.setHeader("Content-Type", "application/json");
      } else if (ext === ".svg") {
        res.setHeader("Content-Type", "image/svg+xml");
      }
      log("Sending file content", { schoolId, filePath });
      res.send(content);
      return;
    } catch (err) {
      log("Error reading file as text", { filePath, error: err.message });
    }
  }
  next();
});

// Fallback to express.static for binary files and files without SCHOOLID
app.use((req, res, next) => {
  log("express.static fallback", {
    schoolId: getSchoolIdFromHost(req),
    path: req.path,
  });
  next();
});
app.use(express.static("dist"));

// Catch-all: send index.html for any non-file route (SPA support)
app.use((req, res, next) => {
  if (req.path.includes(".") && !req.path.endsWith("/")) {
    return next();
  }
  const schoolId = getSchoolIdFromHost(req);
  log("Catch-all route for SPA", { schoolId, path: req.path });
  const indexPath = path.join(process.cwd(), "dist", "index.html");
  fs.readFile(indexPath, "utf8", (err, data) => {
    if (err) {
      log("Error loading index.html", { error: err.message, indexPath });
      res.status(500).send("Error loading index.html");
      return;
    }
    const content = replacePlaceholdersInContent(data, schoolId);
    log("Sending index.html with SCHOOLID replaced", { schoolId, indexPath });
    res.setHeader("Content-Type", "text/html");
    res.send(content);
  });
});

app.listen(port, () => {
  log(`Example app listening on port ${port}`);
});
