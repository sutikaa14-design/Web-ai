import { httpServerHandler } from "cloudflare:node";
import express from "express";

const app = express();

app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    time: new Date().toISOString(),
    platform: "cloudflare-workers",
  });
});

app.get("/api/test", (req, res) => {
  res.json({
    success: true,
    message: "LiveMate AI Worker aktif!",
  });
});

app.listen(3000);

export default httpServerHandler({ port: 3000 });
