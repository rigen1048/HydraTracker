function getChannelInfo() {
  let channelId = null;
  let title = document.title.replace(/ - YouTube$/, "").trim();

  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) {
    const m = canonical.href.match(/\/channel\/(UC[_\-a-zA-Z0-9]{22})/);
    if (m) channelId = m[1];
  }

  // Fallback: look in header <link itemprop="url"> or meta
  if (!channelId) {
    const urlLink = document.querySelector('link[itemprop="url"]');
    if (urlLink) {
      const m = urlLink.href.match(/\/channel\/(UC[_\-a-zA-Z0-9]{22})/);
      if (m) channelId = m[1];
    }
  }

  // Fallback: window.ytInitialData
  if (!channelId && window.ytInitialData) {
    try {
      const meta = window.ytInitialData?.metadata?.channelMetadataRenderer;
      if (meta?.externalId) {
        channelId = meta.externalId;
      }
      if (meta?.title) {
        title = meta.title;
      }
    } catch (e) {}
  }

  if (!channelId) {
    // Last desperate attempt – search all <a> that point to /channel/UC...
    const a = document.querySelector('a[href*="/channel/UC"]');
    if (a) {
      const m = a.href.match(/\/channel\/(UC[_\-a-zA-Z0-9]{22})/);
      if (m) channelId = m[1];
    }
  }

  const url = channelId
    ? `https://www.youtube.com/channel/${channelId}`
    : window.location.href.split("?")[0]; // fallback to current clean URL

  return {
    id: channelId || "UNKNOWN_ID",
    url: url,
    title: title || document.title || "Unknown Channel",
    timestamp: new Date().toISOString(),
  };
}

// Listen for message from popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "getChannelInfo") {
    const info = getChannelInfo();
    sendResponse(info);
  }
  return true; // keep channel open for async response
});
