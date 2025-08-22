import express from "express";

const app = express();
// PORT env var is set by Cloud Run
const port = process.env.PORT || 3000;

app.use(express.static("dist"));

// Catch-all: send index.html for any non-file route (SPA support)
import path from "path";
import fs from "fs";
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
