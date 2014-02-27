//background.js 

//the default ban list
var bl =         ['*://www.youtube.com/**', 
                  '*://www.twitter.com/',
                  '*://www.facebook.com/',
                  '*://www.tumblr.com/',
                  '*://www.reddit.com/',
                  '*://www.instagram.com/',
                  '*://www.netflix.com/', 
                  '*://www.blogspot.com/',
                  '*://www.pintrest.com/',
                  '*://www.flickr.com/'];

//special bl is just for me before deployment
var special_bl = ["*://www.youtube.com/", 
                  "*://www.twitter.com/", 
                  "*://www.tumblr.com/", 
                  "*://www.hckrnews.com/",
                  "*://www.hackernews.com/", 
                  "*://www.illroots.com/",
                  "*://www.hypebeast.com/",
                  "*://www.techcrunch.com/",
                  "*://www.netflix.com/", 
                  "*://www.google.com/"];

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
  {urls: special_bl},
  ["blocking"]);

function notifyEndOfBreak() {
  chrome.tabs.query({ active : true }, 
    function(tabs){
      var injectable = "window.location.reload();";
      console.log(tabs[0]);
      for(var i = 0; i < tabs.length; i++) {
        chrome.tabs.executeScript(tabs[i].id, {code : injectable}, 
          function(result){
            console.log('injected');
          });
      }
  });
}

function getBlacklist() {
  chrome.storage.sync.get('blackList', function(items) {
    bl = items;
    console.log(bl);
});
}