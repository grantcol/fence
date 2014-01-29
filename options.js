//options.js 
var blackList = new Array();

$('#add-to-bl').click(function() {
	addToBlackList();
});

function addToBlackList() {
	var siteToBlock = $('#site-input').val();
	blackList.push(siteToBlock);
	chrome.storage.sync.set({ 'blackList' : blackList}, function() {
		console.log('black list submitted');
	});
}