const input = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const messagesDiv = document.getElementById("messages");

async function sendMessage() {
  const message = input.value.trim();
  if (!message) return;

  messagesDiv.innerHTML += `<div class="message user"><b>You:</b> ${message}</div>`;
  input.value = "";

  // Create bot message container
  const botDiv = document.createElement("div");
  botDiv.classList.add("message", "bot");
  botDiv.innerHTML = `<b>Bot:</b> <span id="botText">...</span>`;
  messagesDiv.appendChild(botDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;

  const botTextEl = botDiv.querySelector("#botText");
  let buffer = "";

  // Use Server-Sent Events for streaming
  const eventSource = new EventSource(`/api/stream?message=${encodeURIComponent(message)}`);

  eventSource.onmessage = (event) => {
    if (event.data === "[DONE]") {
      eventSource.close();
      botTextEl.innerHTML = marked.parse(buffer); // Render Markdown
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
      return;
    }

    buffer += event.data;
    botTextEl.innerHTML = marked.parse(buffer);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  };

  eventSource.onerror = (err) => {
    console.error("SSE error:", err);
    botTextEl.innerHTML = "<i>Error receiving response.</i>";
    eventSource.close();
  };
}

sendBtn.addEventListener("click", sendMessage);
input.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});
