//background.js 
var NUM_BREAKS = 3;
var ON_BREAK = false; //ugly boolean but enums are uglier in js...

//listens for messages from task-manager.js 

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if(request.directive == "unlock") {
      ON_BREAK = true;
      sendResponse({affirm: "on break"});
    } else if(request.directive == "lock") {
      ON_BREAK = false;
      notifyEndOfBreak();
      sendResponse({affirm: "off break"});
    }
  });

//listener for outgoing requests. 
//Blocks the black list if not on break

chrome.webRequest.onBeforeRequest.addListener(
  function(details) { 
    console.log(details);
    if(!ON_BREAK) { 
      return {cancel: true}; 
    }
  },
  {urls: ["*://www.youtube.com/", 
          "*://www.twitter.com/", 
          "*://www.tumblr.com/", 
          "*://www.hckrnews.com/",
          "*://www.hackernews.com/", 
          "*://www.illroots.com/",
          "*://www.hypebeast.com/",
          "*://www.techcrunch.com/",
          "*://www.netflix.com/", 
          "*://www.google.com/"]},
  ["blocking"]);

function notifyEndOfBreak() {
  chrome.tabs.query({active: true}, 
    function(tab){
      chrome.tabs.highlight({tabs : tab.id}, function(){ console.log('highlighted'); });
      //injectDetails -> alert the user that the break is over
  });
}