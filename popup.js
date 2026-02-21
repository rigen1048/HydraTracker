let channels = [];

// DOM elements
const statusEl = document.getElementById("status");
const tbody = document.querySelector("#list tbody");

// ==================== STORAGE HELPERS ====================
async function loadFromStorage() {
  const data = await chrome.storage.session.get("youtubeChannels");
  channels = data.youtubeChannels || [];
  updateTable();
}

async function saveToStorage() {
  await chrome.storage.session.set({ youtubeChannels: channels });
}

// ==================== UI UPDATE ====================
function updateTable() {
  tbody.innerHTML = "";
  channels.forEach((ch, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td title="${ch.title}">${ch.title.slice(0, 40)}${ch.title.length > 40 ? "…" : ""}</td>
      <td>${ch.id}</td>
    `;
    tbody.appendChild(tr);
  });
  statusEl.textContent = `${channels.length} channel${channels.length === 1 ? "" : "s"} collected`;
}

// ==================== CAPTURE BUTTON ====================
document.getElementById("capture").onclick = () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab?.url?.includes("youtube.com")) {
      statusEl.textContent = "Please go to a YouTube page first";
      return;
    }

    chrome.tabs.sendMessage(
      tab.id,
      { action: "getChannelInfo" },
      async (response) => {
        if (chrome.runtime.lastError) {
          statusEl.textContent =
            "Error: " + (chrome.runtime.lastError.message || "Not on YouTube?");
          return;
        }

        if (response && response.id !== "UNKNOWN_ID") {
          const exists = channels.some((c) => c.id === response.id);
          if (!exists) {
            channels.push(response);
            await saveToStorage(); // ← SAVE TO SESSION STORAGE
            updateTable();
            statusEl.textContent = `Added: ${response.title}`;
          } else {
            statusEl.textContent = `Already captured: ${response.title}`;
          }
        } else {
          statusEl.textContent =
            "Could not detect channel (try reloading the page)";
        }
      },
    );
  });
};

// ==================== SAVE CSV BUTTON ====================
document.getElementById("save").onclick = async () => {
  if (channels.length === 0) {
    statusEl.textContent = "Nothing to save";
    return;
  }

  const rows = [
    ["Channel ID", "Channel URL", "Channel Title"],
    ...channels.map((c) => [c.id, c.url, `"${c.title.replace(/"/g, '""')}"`]),
  ];

  const csv = rows.map((row) => row.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  chrome.downloads.download(
    {
      url: url,
      filename: `youtube_channels_${new Date().toISOString().slice(0, 10)}.csv`,
      saveAs: false,
    },
    () => {
      URL.revokeObjectURL(url);
      statusEl.textContent = "✅ CSV saved to Downloads folder";
    },
  );
};

// ==================== CLEAR BUTTON ====================
document.getElementById("clear").onclick = async () => {
  channels = [];
  await saveToStorage(); // ← CLEAR STORAGE TOO
  updateTable();
  statusEl.textContent = "List cleared";
};

// ==================== LOAD ON POPUP OPEN ====================
loadFromStorage();
