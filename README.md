# Bloomscrolling

Bloomscroller is a browser extension that uses artificial intelligence and gamification to help you overcome doomscrolling: the all too familiar and tempting process of scrolling through bad news after bad news on your social media feeds, without realising the repercussions on your mental health.

Bloomscroller works in the background as you browse your social media feed, analysing the negativity of each post with artificial intelligence. The more bad news you consume, the more your Bloom suffers. When your Bloom accumulates too much negativity and drops all its petals, Bloomscroller sends you a reminder that it might be time to switch to healthier alternative activities. While you mentally recharge by engaging in other activities, your Bloom recharges too, eventually gaining back all its petals. You can customise the recommended activities and links that Bloomscroller sends to you.  

Currently compatible with Twitter on desktop.

# Getting Started

This project requires npm and Browserify to pack the dependencies into a single package. Navigate to the directory of your local git repository and run the following command to install all needed dependencies to build the project.

```bash
$ npm install
```

Build the bundled foreground script
```bash
browserify foreground.js -o foreground-bundle.js  
```

The folder can then be installed as a browser extension in Google Chrome or Microsoft Edge by navigating to the extensions page (e.g. chrome://extensions). Enable developer mode, and select the "Load Unpacked" option, choosing the folder the git repository is in.

## Using a zip folder of the extension

Because we would prefer not to pay for access to the Chrome Extensions store, we can only distribute our extension as a zipped folder of the files needed to run it. To install the extension from the zip file, unzip it to a folder somewhere on your computer.

The folder can then be installed as a browser extension in Google Chrome or Microsoft Edge by navigating to the extensions page (e.g. chrome://extensions). Enable developer mode, and select the "Load Unpacked" option, choosing the folder the git repository is in.

# Usage
This browser extension monitors your news consumption behavior on Twitter and warns you if you're starting to Doomscroll. It also highlights tweets that are identified to be negative in tone, and flags them out.
