import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Sample route
app.get("/", (req, res) => {
  res.send("Node.js AI Agent backend is running! 🚀");
});

// Chat endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Call Ollama API with stream disabled
    const ollamaResponse = await fetch("http://localhost:11434/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama3.2", // or "llama3", "mistral", etc.
        messages: [
          { role: "system", content: "You are a helpful AI assistant." },
          { role: "user", content: message },
        ],
        stream: false, // ⚠️ Critical: Disable streaming
      }),
    });

    if (!ollamaResponse.ok) {
      const errText = await ollamaResponse.text();
      console.error("Ollama API error:", errText);
      return res.status(500).json({ error: "Failed to get response from Ollama" });
    }

    // Now safe to parse as single JSON
    const data = await ollamaResponse.json();

    if (!data.message || !data.message.content) {
      return res.status(500).json({ error: "Invalid response from Ollama" });
    }

    const reply = data.message.content;
    res.json({ reply });
  } catch (error) {
    console.error("Chat Error:", error);

    // Handle JSON parse errors explicitly
    if (error instanceof SyntaxError && error.message.includes("JSON")) {
      return res.status(500).json({
        error: "Ollama returned invalid JSON. Likely streaming — ensure 'stream: false'.",
      });
    }

    res.status(500).json({ error: "Something went wrong while calling Ollama." });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});