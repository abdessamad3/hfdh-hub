import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cors());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Calculate scores (Formula: (progress * 0.5) + (attendance * 0.3) + (accuracy * 0.2))
  app.post("/api/calculate-score", (req, res) => {
    const { progress, attendance, accuracy } = req.body;
    
    // progress: 0-100 (percentage of Quran memorized)
    // attendance: 0-100 (percentage of sessions present)
    // accuracy: 0-100 (average evaluation score)
    
    const score = (progress * 0.5) + (attendance * 0.3) + (accuracy * 0.2);
    res.json({ score: parseFloat(score.toFixed(2)) });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
