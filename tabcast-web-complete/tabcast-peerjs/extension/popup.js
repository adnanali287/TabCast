const tabTitle = document.getElementById("tabTitle");
const openStreamer = document.getElementById("openStreamer");
let activeTab;

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  activeTab = tabs[0];
  if (!activeTab || !activeTab.id) {
    tabTitle.textContent = "No capturable tab found.";
    openStreamer.disabled = true;
    return;
  }
  tabTitle.textContent = activeTab.title || activeTab.url || "Current tab";
});

openStreamer.addEventListener("click", () => {
  if (!activeTab || !activeTab.id) return;
  const url = chrome.runtime.getURL(`sender.html?tabId=${activeTab.id}&title=${encodeURIComponent(activeTab.title || "Selected tab")}`);
  chrome.tabs.create({ url });
});

