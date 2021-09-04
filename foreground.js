String.prototype.hashCode = function() {
    var hash = 0;
    if (this.length === 0) {
        return hash;
    }
    for (var i = 0; i < this.length; i++) {
        var char = this.charCodeAt(i);
        hash = ((hash<<5)-hash)+char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
}
var isTotalSynced = false
var isDictSynced = false
var totalScore = 0
var tweetScores = {}

chrome.storage.local.get('score', data => {
    console.log("loading score")
    if (chrome.runtime.lastError) {
        return;
    }
    totalScore = data.score
    isTotalSynced = true
    console.log(totalScore)
});
chrome.storage.local.get('tweetScore', data => {
    console.log("loading tweetscore")
    if (chrome.runtime.lastError) {
        return;
    }
    tweetScores = data.tweetScore;
    isDictSynced = true
    console.log(tweetScores)
});
var analyseSentiment = function(tweetText){
    return 0;
}

window.addEventListener('beforeunload', function (e) {
    console.log("saving before unload")
    chrome.storage.local.set({
        score: totalScore,
        tweetScore: tweetScores
    });
});

// Function to call for each element of the homepage
var runScript = (function(){
    return function(allNodes){
        for (i=0; i<allNodes.length; i++){
            var node = allNodes[i]
            if(node === undefined) continue;
            // Get tweet's text content
            var tweetText = getTweet(node);
            console.log(tweetText);
            var hash = tweetText.hashCode();
            var score = 0;
            // Check if tweet is already processed
            if(tweetScores[hash] === undefined){
                // Do something with AI here
                score = analyseSentiment(tweetText);
                tweetScores[hash] = score;
            }else{
                score = tweetScores[hash];
            }
            // Advisory
            addWarning(node,score);
        }
    }
})();

// Function to scan for new tweets
var scanDiv = (function(){
    var MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
    return function(obj, callback){
        if(!obj || obj.nodeType !== 1)
            return;
        if(MutationObserver){
            // New observer
            var mutationObserver = new MutationObserver(callback)
            // Observe changes in children (includes divs)
            mutationObserver.observe(obj, {
                childList:true,
                subtree:false
            });
            return mutationObserver;
        }
        // browser support fallback
        else if(window.addEventListener){
            obj.addEventListener('DOMNodeInserted', callback, false)
            obj.addEventListener('DOMNodeRemoved', callback, false)
        }
    }
})();

// Function to get tweet content
var getTweet = (function(){
    return function(el){
        // Get the tweet wrapper from this element
        var wrap = el.querySelectorAll('article div[data-testid="tweet"]')[0];

        // Only proceed if query success, otherwise return empty string
        if(wrap){
            var inWrap = wrap.children[1].children[1];
            if(inWrap){
                return inWrap.querySelectorAll('div[id^="id"]')[0].innerText;
            } else return "";
        } else return "";
    }
})();

// Function to append advisory
var addWarning = (function(){
    return function(el,tx){
        // Get the tweet from this element
        var twt = el.querySelectorAll('article div[data-testid="tweet"]')[0];
        if(twt === undefined) return;

        // Make new div with class .adv and HTML content from string tx
        var advisory = document.createElement("div");
        advisory.classList = "adv";
        advisory.innerHTML = tx;

        // Add to original element
        twt.prepend(advisory);
    }
})();
function waitFor(varSetter, sleepTime, condition, continuation){
    var variable = varSetter()
    if (!condition(variable)){
        setTimeout(() => waitFor(varSetter, sleepTime, condition, continuation), sleepTime);
    } else {
        continuation(variable);
    }
}


// Wrapper
getWrapper = function(){return document.querySelectorAll('div[aria-label="Timeline: Your Home Timeline"] > div')[0];};

waitFor(getWrapper,
    1000,
    wrapper => wrapper !== undefined && isDictSynced && isTotalSynced,
    function(wrapper){
    // First pass
    var tweets = wrapper.children;
    runScript(tweets);

    // Observe for changes of wrapper's child nodes
    scanDiv(wrapper,function(el){

        var addedNodes = [], removedNodes = [];

        // Record down added divs
        el.forEach(record => record.addedNodes.length & addedNodes.push(...record.addedNodes))

        // Record down deleted divs
        // el.forEach(record => record.removedNodes.length & removedNodes.push(...record.removedNodes))

        // Run the script for added nodes
        runScript(addedNodes);

        // console.log('Added:', addedNodes, 'Removed:', removedNodes);
    });
});

