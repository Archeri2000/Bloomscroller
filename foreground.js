const { Tokenizer, tokenizerFromJson } = require("tf_node_tokenizer");

// Preprocessor initialisation
let stopwordlist = ["", "i", "me", "my", "myself", "we", "our", "ours", "ourselves", "you", "you\'re", "you\'ve", "you\'ll", "you\'d", "your", "yours", "yourself", "yourselves", "he", "him", "his", "himself", "she", "she\'s", "her", "hers", "herself", "it", "it\'s", "its", "itself", "they", "them", "their", "theirs", "themselves", "what", "which", "who", "whom", "this", "that", "that\'ll", "these", "those", "am", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "having", "do", "does", "did", "doing", "a", "an", "the", "and", "but", "if", "or", "because", "as", "until", "while", "of", "at", "by", "for", "with", "about", "against", "between", "into", "through", "during", "before", "after", "above", "below", "to", "from", "up", "down", "in", "out", "on", "off", "over", "under", "again", "further", "then", "once", "here", "there", "when", "where", "why", "how", "all", "any", "both", "each", "few", "more", "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so", "than", "too", "very", "s", "t", "can", "will", "just", "don", "don\'t", "should", "should\'ve", "now", "d", "ll", "m", "o", "re", "ve", "y", "ain", "aren", "aren\'t", "couldn", "couldn\'t", "didn", "didn\'t", "doesn", "doesn\'t", "hadn", "hadn\'t", "hasn", "hasn\'t", "haven", "haven\'t", "isn", "isn\'t", "ma", "mightn", "mightn\'t", "mustn", "mustn\'t", "needn", "needn\'t", "shan", "shan\'t", "shouldn", "shouldn\'t", "wasn", "wasn\'t", "weren", "weren\'t", "won", "won\'t", "wouldn", "wouldn\'t", "u", "im", "c"];
//let stemmer = require('snowball-stemmer.jsx/dest/english-stemmer.common.js').EnglishStemmer;
let Snowball = require('snowball');
let stemmer = new Snowball('English');

// Tokenizer initializer
let isTokenizerLoaded = false;
var tokenizer;
fetch('https://mindfulhacksmodel.s3.ap-southeast-1.amazonaws.com/Final_tokenizer_1.json')
    .then(x => x.json())
    .then(y => {
        return JSON.parse(y)}).then(z => {
        z.word_counts = JSON.parse(z.word_counts);
        z.word_index = JSON.parse(z.word_index);
        z.index_word = JSON.parse(z.index_word);
        tokenizer = tokenizerFromJson(JSON.stringify(z));
        isTokenizerLoaded = true;
    });
let isModelLoaded = false;

// Model initialiser
let tf = require('@tensorflow/tfjs')
var model;
tf.loadLayersModel('https://mindfulhacksmodel.s3.ap-southeast-1.amazonaws.com/P_model3/model.json').then(function(m) {
    model = m;
    isModelLoaded = true;
});

// Preprocessing function
function preprocess(tweet){

    tweet = tweet.toLowerCase();

    //Replace all URls with 'URL'
    tweet = tweet.replace(/(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])|(\b(www.)[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/i,' URL');
    //Replace @USERNAME to 'USER'.
    tweet = tweet.replace(/@[^\s]+/,' USER');
    //Replace all non alphabets.
    tweet = tweet.replace(/[^a-zA-Z0-9À-ž\s]/g, " ");
    //Replace 3 or more consecutive letters by 2 letter.
    tweet = tweet.replace(/(.)\1\1+/, "$1$1");

    stemmer.setCurrent(tweet);
    stemmer.stem();
    tweet = stemmer.getCurrent();
    console.log(tweet);
    var tweetwords = ""
    for (var word of tweet.split(" ")){
        //Checking if word is a stopword.
        if (! stopwordlist.includes(word)){
            tweetwords += word + " ";
        }
    }
    return [tweetwords, ""];
}

function padArrayStart(arr, len, padding){
    return Array(len - arr.length).fill(padding).concat(arr);
}


// sentiment analysis function
let analyseSentiment = function(tweetText){
    let text = preprocess(tweetText);
    console.log(text);
    tokenizer.fitOnTexts(text);
    let sequence = tokenizer.textsToSequences(text)[0].slice(0,-1);
    sequence = padArrayStart(sequence, 30, 0);
    blank = padArrayStart([], 30, 0);
    console.log(sequence);
    return model.predict([tf.tensor([sequence, blank])])[0] - 0.5;
}

// Quick hash function to convert tweets to hashes
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

// Values to check syncing
var isTotalSynced = false
var isDictSynced = false
var totalScore = 0
var tweetScores = {}

// Retrieve total score and tweet scores from storage
chrome.storage.local.get('score', data => {
    console.log("loading score")
    if (chrome.runtime.lastError || data.score === undefined) {
        isTotalSynced = true
        return;
    }
    totalScore = data.score
    isTotalSynced = true
    console.log(totalScore)
});
chrome.storage.local.get('tweetScore', data => {
    console.log("loading tweetscore")
    if (chrome.runtime.lastError || data.tweetScore === undefined) {
        isDictSynced = true
        return;
    }
    tweetScores = data.tweetScore;
    isDictSynced = true
    console.log(tweetScores)
});

// On refresh or window close, store the total score and dictionary of tweet scores
window.addEventListener('beforeunload', function (e) {
    console.log("saving before unload")
    chrome.storage.local.set({
        score: totalScore,
        tweetScore: tweetScores
    });
});

// Switch for the popup
var activePopup = false;
var counter = 0;


// Function to call for each element of the homepage
var runScript = (function(){
    return function(allNodes){
        for (i=0; i<allNodes.length; i++){
            var node = allNodes[i]
            // Get tweet's text content
            var tweetText = getTweet(node);
            // Hash the tweet
            var hash = tweetText.hashCode();
            var score = 0;
            // Check if tweet is already processed
            if(tweetScores[hash] === undefined){
                // Do something with AI here
                score = analyseSentiment(tweetText);
                tweetScores[hash] = score;

                // Only add the score if it has not already been added
                totalScore += score;

                if(!activePopup)
                    counter++;

                if(counter >= 10){
                    activePopup = true;
                    counter = 0;
                }
            }else{
                score = tweetScores[hash];
            }
            // Advisory
            addWarning(node,score);
        }
        // Count how many tweets there are in total
        var currentCount = Object.keys(tweetScores).length;

        // Popup
        if (totalScore/currentCount <= 0 && currentCount > 10 && activePopup)
            makePopup(totalScore/currentCount);
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
    return function(el,score){
        // Get the tweet from this element
        var twt = el.querySelectorAll('article div[data-testid="tweet"]')[0];
        if(twt) twt.style.setProperty("flex-wrap","wrap");

        // What message to pass
        if(score < 0){
            var ps = 1+score; // score from -0.5 to 0, so ps from 0.5 to 1
            var tx = "This tweet has been flagged as "+(100*ps)+"% negative!";

            // Make new div with class .adv and HTML content from string tx
            var advisory = document.createElement("div");
            advisory.classList = "adv";
            advisory.innerHTML = tx;

            // Add to original element
            if(twt)
                twt.prepend(advisory);
        }
    }
})();

// Make popup
var makePopup = (function(){
    return function(score){
        // Check if element exists, otherwise make one
        var poop = document.getElementById("alertPopup");
        if (poop)
            document.getElementById("alertPopup").remove();

        poop = document.createElement("div");
        poop.setAttribute("id","alertPopup");

        document.body.prepend(poop);
        document.documentElement.classList.add("alertedPopup");

        // This would be so much easier with jQuery but lets not load a whole library to do one thing
        // $(poop).load("theHtmlFile.html"); though
        var request = new XMLHttpRequest();

        request.open('GET', chrome.runtime.getURL('popup.html'), true);
        request.onload = function() {
            if (request.status >= 200 && request.status < 400) {
                var resp = request.responseText;
                poop.innerHTML = resp;
                genPopup(poop,score);
            }
        };

        request.send();

        var genPopup = function(elem,score){
            // score should range from -0.5 to 0.5 (normalized)
            var displayValue = 100*(score+0.5); // % to display
            elem.querySelectorAll(".popupContent .pSc")[0].innerHTML = displayValue+"%";

            var close1 = elem.querySelectorAll(".popupContent .cls")[0];
            var close2 = elem.querySelectorAll(".popupContent .fx")[0];

            close1.style.visibility = "hidden";
            setTimeout(function(){
                close1.style.visibility = "visible";
                close2.style.visibility = "hidden";
            },10000); //10s timer

            // Bind events
            close1.addEventListener("click", removePopup);
            close2.addEventListener("click", forceClosePopup);

            // Change color if darkmode
            var bgColor = window.getComputedStyle(document.body).getPropertyValue('background-color');
            document.documentElement.style.setProperty("--background",bgColor);
            document.documentElement.style.setProperty("--transparency","rgba("+bgColor.split("(")[1].split(")")[0]+",0.5)");
            if (!(bgColor == "#ffffff" || bgColor == "rgb(255, 255, 255)")){
                document.documentElement.style.setProperty("--text",'#ffffff');
                document.documentElement.style.setProperty("--petalb",'rgba(255,255,255,0.3)');
            }

            if(document.getElementsByClassName("petalbloom")[0] === undefined) return;
            // Kill some plants yo
            if(score <= 0.4)
                document.getElementsByClassName("pb1")[0].classList.add("dead");
            else
                document.getElementsByClassName("pb1")[0].classList.remove("dead");

            if(score <= 0.3)
                document.getElementsByClassName("pb2")[0].classList.add("dead");
            else
                document.getElementsByClassName("pb2")[0].classList.remove("dead");

            if(score <= 0.2)
                document.getElementsByClassName("pb3")[0].classList.add("dead");
            else
                document.getElementsByClassName("pb3")[0].classList.remove("dead");

            if(score <= 0.1)
                document.getElementsByClassName("pb4")[0].classList.add("dead");
            else
                document.getElementsByClassName("pb4")[0].classList.remove("dead");

            if(score <= 0)
                document.getElementsByClassName("pb5")[0].classList.add("dead");
            else
                document.getElementsByClassName("pb5")[0].classList.remove("dead");
        }
    }
})();

// Function to remove the popup gently and reset the score
var removePopup = function(){
    var thePopup = document.getElementById("alertPopup");
    if(thePopup) thePopup.remove();

    document.documentElement.classList.remove("alertedPopup");

    // Reset score
    totalScore = 0;
}

// Function to force the popup to close
var forceClosePopup = function(){
    var thePopup = document.getElementById("alertPopup");
    if(thePopup) thePopup.remove();

    document.documentElement.classList.remove("alertedPopup");

    // Turn off the popup trigger
    activePopup = false;

    // Set timer to turn it on again
    activePopup = setTimeout(function(){
        return true;
    }, 10000)
}

var loadCss = function(){
    var $ = document;
    var head  = $.getElementsByTagName('head')[0];
    var link  = $.createElement('link');
    link.rel  = 'stylesheet';
    link.type = 'text/css';
    link.href = chrome.runtime.getURL('popup.css');
    link.media = 'all';
    head.appendChild(link);
};

function waitFor(varSetter, sleepTime, condition, continuation){
    var variable = varSetter()
    if (!condition(variable)){
        setTimeout(() => waitFor(varSetter, sleepTime, condition, continuation), sleepTime);
    } else {
        continuation(variable);
    }
}


// Wrapper
getWrapper = function(){return document.querySelectorAll('div[aria-label^="Timeline:"] > div')[0];};

waitFor(getWrapper,
    1000,
    wrapper => wrapper !== undefined && isDictSynced && isTotalSynced && isTokenizerLoaded && isModelLoaded,
    function(wrapper){
    console.log("everything loaded.")
    // First pass
    var tweets = wrapper.children;
    runScript(tweets);
    loadCss()
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

var fa = document.createElement('style');
fa.type = 'text/css';
fa.textContent = `@font-face { font-family: 'Pacifico'; font-style: normal; font-weight: 400; src: url("`
+ chrome.runtime.getURL('fonts/Pacifico-Regular.woff2')
+ '"); }';
document.head.appendChild(fa);

var fa2 = document.createElement('style');
fa2.type = 'text/css';
fa2.textContent = `@font-face { font-family: 'Comfortaa'; font-style: normal; font-weight: 400; src: url("`
    + chrome.runtime.getURL('fonts/Comfortaa-Regular.woff2')
    + '"); }';
document.head.appendChild(fa2);

var fa3 = document.createElement('style');
fa3.type = 'text/css';
fa3.textContent = `@font-face { font-family: 'Comfortaa'; font-style: normal; font-weight: 300; src: url("`
    + chrome.runtime.getURL('fonts/Comfortaa-Light.woff2')
    + '"); }';
document.head.appendChild(fa3);

var fa4 = document.createElement('style');
fa4.type = 'text/css';
fa4.textContent = `@font-face { font-family: 'Comfortaa'; font-style: normal; font-weight: 700; src: url("`
    + chrome.runtime.getURL('fonts/Comfortaa-Bold.woff2')
    + '"); }';
document.head.appendChild(fa4);