import express from "express";
import path from "path";
import fs from "fs";

const app = express();
// PORT env var is set by Cloud Run
const port = process.env.PORT || 3000;

// Function to recursively get all files in a directory
function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

// Function to replace placeholders in files
function replacePlaceholdersInFiles(schoolId, requestDetails) {
  const distPath = path.join(process.cwd(), "dist");

  if (!fs.existsSync(distPath)) {
    console.log("Dist directory does not exist");
    return;
  }

  try {
    const allFiles = getAllFiles(distPath);
    let processedFiles = 0;
    let totalReplacements = 0;

    allFiles.forEach((filePath) => {
      try {
        let content = fs.readFileSync(filePath, "utf8");
        let fileReplacements = 0;

        // Replace SCHOOLID
        const schoolIdMatches = (content.match(/SCHOOLID/g) || []).length;
        if (schoolIdMatches > 0) {
          content = content.replace(/SCHOOLID/g, schoolId);
          fileReplacements += schoolIdMatches;
        }

        // Replace REQUEST_DETAILS
        const requestDetailsMatches = (content.match(/REQUEST_DETAILS/g) || [])
          .length;
        if (requestDetailsMatches > 0) {
          content = content.replace(/REQUEST_DETAILS/g, requestDetails);
          fileReplacements += requestDetailsMatches;
        }

        if (fileReplacements > 0) {
          fs.writeFileSync(filePath, content, "utf8");
          processedFiles++;
          totalReplacements += fileReplacements;
          console.log(
            `Replaced ${fileReplacements} occurrences in ${path.relative(
              process.cwd(),
              filePath
            )} (SCHOOLID: ${schoolIdMatches}, REQUEST_DETAILS: ${requestDetailsMatches})`
          );
        }
      } catch (err) {
        // Skip binary files or files that can't be read as text
        if (err.code !== "EISDIR") {
          console.log(
            `Skipping file ${path.relative(process.cwd(), filePath)}: ${
              err.message
            }`
          );
        }
      }
    });

    console.log(
      `Total: ${totalReplacements} replacements in ${processedFiles} files`
    );
  } catch (err) {
    console.error("Error processing files:", err);
  }
}

// Middleware to handle headers and replace placeholders
app.use((req, res, next) => {
  const xForwardedFor = req.headers["x-forwarded-for"];
  const realIp = req.headers["x-real-ip"];
  const remoteAddress =
    req.connection?.remoteAddress || req.socket?.remoteAddress;

  console.log("=== Request Details ===");
  console.log("Timestamp:", new Date().toISOString());
  console.log("Method:", req.method);
  console.log("URL:", req.url);
  console.log("X-Forwarded-For:", xForwardedFor);
  console.log("X-Real-IP:", realIp);
  console.log("Remote Address:", remoteAddress);
  console.log("User-Agent:", req.headers["user-agent"]);

  // Use X-Forwarded-For header value, fallback to X-Real-IP, then remote address
  const schoolId = xForwardedFor || realIp || remoteAddress || "unknown";
  console.log("Using School ID:", schoolId);

  // Create detailed request information (properly escaped for JavaScript)
  const requestDetails = JSON.stringify({
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    headers: req.headers,
    remoteAddress: remoteAddress,
    schoolId: schoolId,
    query: req.query,
    params: req.params,
  })
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'");

  console.log("Request Details JSON:", requestDetails);

  // Replace placeholders in all dist files
  replacePlaceholdersInFiles(schoolId, requestDetails);
  console.log("========================");

  next();
});

app.use(express.static("dist"));

// Catch-all: send index.html for any non-file route (SPA support)
app.use((req, res, next) => {
  // Skip if this is a static file request
  if (req.path.includes(".") && !req.path.endsWith("/")) {
    return next();
  }

  const indexPath = path.join(process.cwd(), "dist", "index.html");
  fs.readFile(indexPath, "utf8", (err, data) => {
    if (err) {
      res.status(500).send("Error loading index.html");
      return;
    }
    res.setHeader("Content-Type", "text/html");
    res.send(data);
  });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
