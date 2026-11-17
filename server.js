require("dotenv").config();
const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const uploadDir = path.join(__dirname, "uploads");
const videoDir = path.join(__dirname, "videos");
const dataDir = path.join(__dirname, "data");
const libraryFile = path.join(dataDir, "videos.json");
for (const dir of [uploadDir, videoDir, dataDir]) fs.mkdirSync(dir, { recursive: true });
if (!fs.existsSync(libraryFile)) fs.writeFileSync(libraryFile, "[]", "utf8");

app.use(express.json({ limit: "2mb" }));
app.use("/uploads", express.static(uploadDir));
app.use("/videos", express.static(videoDir));
app.use(express.static(path.join(__dirname, "public")));

const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const videoTypes = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const makeStorage = (folder, prefix) => multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, folder),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || (file.mimetype === "video/webm" ? ".webm" : file.mimetype === "video/quicktime" ? ".mov" : file.mimetype.startsWith("video/") ? ".mp4" : ".jpg");
    cb(null, `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`);
  }
});
const imageUpload = multer({
  storage: makeStorage(uploadDir, "image"),
  limits: { fileSize: 15 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => imageTypes.has(file.mimetype) ? cb(null, true) : cb(new Error("Only JPG, PNG, and WebP images are allowed."))
});
const videoUpload = multer({
  storage: makeStorage(videoDir, "video"),
  limits: { fileSize: 500 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => videoTypes.has(file.mimetype) ? cb(null, true) : cb(new Error("Please upload an MP4, WebM, or MOV video."))
});
const readLibrary = () => { try { return JSON.parse(fs.readFileSync(libraryFile, "utf8")); } catch { return []; } };
const writeLibrary = (items) => fs.writeFileSync(libraryFile, JSON.stringify(items, null, 2), "utf8");

app.get("/api/health", (_req, res) => res.json({ ok: true, app: "Aryan Video Studio", apiConnected: false }));
app.post("/api/upload-image", imageUpload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Please choose an image." });
  res.json({ ok: true, filename: req.file.filename, previewUrl: `/uploads/${req.file.filename}`, message: "Image uploaded to this computer's local Aryan Video Studio server." });
});

// Local video library: add existing renders now; future Kling jobs can save results here automatically.
app.get("/api/videos", (_req, res) => res.json({ ok: true, videos: readLibrary().sort((a, b) => b.createdAt - a.createdAt) }));
app.post("/api/videos", videoUpload.single("video"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Choose a video first." });
  const item = {
    id: req.file.filename,
    name: path.basename(req.file.originalname, path.extname(req.file.originalname)).slice(0, 100) || "My video",
    filename: req.file.filename,
    url: `/videos/${req.file.filename}`,
    size: req.file.size,
    mimeType: req.file.mimetype,
    createdAt: Date.now()
  };
  const items = readLibrary(); items.push(item); writeLibrary(items);
  res.status(201).json({ ok: true, video: item });
});
app.delete("/api/videos/:id", (req, res) => {
  const items = readLibrary();
  const item = items.find(video => video.id === req.params.id);
  if (!item) return res.status(404).json({ error: "Video not found." });
  const safeName = path.basename(item.filename);
  const filePath = path.join(videoDir, safeName);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  writeLibrary(items.filter(video => video.id !== item.id));
  res.json({ ok: true });
});

app.post("/api/generate", (_req, res) => res.status(501).json({
  ok: false,
  error: "Video generation is not connected yet.",
  message: "Your mode, image, prompt, and settings are ready. Kling API will be connected in the final integration phase."
}));

app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.use((err, _req, res, _next) => res.status(400).json({ error: err.message || "Request failed." }));
app.listen(PORT, () => console.log(`Aryan Video Studio is running at http://localhost:${PORT}`));
