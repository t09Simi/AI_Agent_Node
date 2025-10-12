import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// STREAMING CHAT ENDPOINT (SSE)
app.get("/api/stream", async (req, res) => {
  const userMessage = req.query.message;
  if (!userMessage) {
    return res.status(400).send("Message query parameter is required");
  }

  // Tell browser to expect a continuous stream
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    // Call Ollama API with streaming enabled
    const ollamaResponse = await fetch("http://localhost:11434/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama3.2", 
        stream: true,
        messages: [
          { role: "system", content: "You are a helpful AI assistant." },
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!ollamaResponse.ok || !ollamaResponse.body) {
      res.write(`data: Error: Failed to connect to Ollama\n\n`);
      res.end();
      return;
    }

    const reader = ollamaResponse.body.getReader();
    const decoder = new TextDecoder();

    // Read the streaming chunks from Ollama and forward them to the client
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n").filter(Boolean);

      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          if (data.message?.content) {
            // Send each piece of text as an SSE event
            res.write(`data: ${data.message.content}\n\n`);
          }
        } catch {
          // Ignore malformed lines
        }
      }
    }

    // Tell the browser we're done
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error) {
    console.error("Streaming error:", error);
    res.write(`data: Error: ${error.message}\n\n`);
    res.end();
  }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running with streaming on http://localhost:${PORT}`);
});
