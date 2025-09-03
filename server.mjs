import express from "express";
import path from "path";
import fs from "fs";

const app = express();
// PORT env var is set by Cloud Run
const port = process.env.PORT || 3000;

// Function to replace placeholders in content without modifying original files
function replacePlaceholdersInContent(content, schoolId) {
  return content.replace(/SCHOOLID/g, schoolId);
}

// Function to extract school ID from hostname
function getSchoolIdFromHost(req) {
  const forwardedHost = req.headers["x-forwarded-host"];
  const host = req.headers["host"];
  
  const hostname = forwardedHost || host || "unknown";
  
  // Extract the first part of the hostname (before the first dot)
  const schoolId = hostname.split('.')[0];
  return schoolId || "unknown";
}

// Custom static middleware that replaces placeholders on-the-fly
app.use((req, res, next) => {
  // Skip if this doesn't look like a text file that might contain SCHOOLID
  const ext = path.extname(req.path).toLowerCase();
  const textExtensions = ['.html', '.js', '.css', '.json', '.txt', '.xml', '.svg'];
  
  if (!textExtensions.includes(ext) && req.path !== "/") {
    return next(); // Let express.static handle binary files
  }

  const schoolId = getSchoolIdFromHost(req);

  // Try to serve file from dist directory
  const filePath = path.join(process.cwd(), "dist", req.path);

  // Check if file exists and is not a directory
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    try {
      let content = fs.readFileSync(filePath, "utf8");

      // Replace SCHOOLID placeholders if any exist
      if (content.includes("SCHOOLID")) {
        content = replacePlaceholdersInContent(content, schoolId);
      }

      // Set appropriate content type
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

      res.send(content);
      return;
    } catch (err) {
      // If we can't read as text, fall through to static middleware
    }
  }
  
  next();
});

// Fallback to express.static for binary files and files without SCHOOLID
app.use(express.static("dist"));

// Catch-all: send index.html for any non-file route (SPA support)
app.use((req, res, next) => {
  // Skip if this is a static file request
  if (req.path.includes(".") && !req.path.endsWith("/")) {
    return next();
  }

  const schoolId = getSchoolIdFromHost(req);

  const indexPath = path.join(process.cwd(), "dist", "index.html");
  fs.readFile(indexPath, "utf8", (err, data) => {
    if (err) {
      res.status(500).send("Error loading index.html");
      return;
    }

    // Replace SCHOOLID placeholders in index.html
    const content = replacePlaceholdersInContent(data, schoolId);

    res.setHeader("Content-Type", "text/html");
    res.send(content);
  });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
