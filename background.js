chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({
        newsSite: "gnn",
        netFlix: true,
        mySport: "football",
        myHobby: "reading"
    });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && /^https:\/\/twitter.com/.test(tab.url)) {
        console.log("twitter loading completed.")
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ["./foreground-bundle.js"]
        })
            .then(() => {
                console.log("Injected Foreground JS.");
            })
            .catch(err => console.log(err));
    }
});