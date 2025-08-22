import express from "express";

const app = express();
// PORT env var is set by Cloud Run
const port = process.env.PORT || 3000;

app.use("/", express.static("dist"));

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
