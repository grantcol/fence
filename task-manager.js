 /**
 	task-manager.js
 	--------------
 	Simple script to handle
 	1.break timings
 	2.number of breaks
 	3.storing and retrieving tasks from storage (chrome.sync for cross instance support)
 	4.misc gui functions/comms with backgroud.js

 	@author Grant Collins (@g_lecool)
 */
var BREAK_MINUTES = 10; //global 
var id; //keeps track of current id of tasks
var breaks = 0;
var breakTime = BREAK_MINUTES;
var enabled = true;
//b & t are global scope containers for break and task ratio values
var b = null; // this is ugly
var t = null; //so is this i hate it
var currentTask = null;
var currentTasks = new Array();
var completedTasks = 0;
var ld = true;
if(ld == true) { 
	breaks = 3; 
	setBreaks();
}

chrome.storage.sync.get(null,
	function(items){ 
		if(items['tasks'] != null){
			currentTasks = items['tasks'];
			getTasksAndBreaks(); 
		} else {
			currentTasks = [];
		}
	});

/**
	Gui Handlers
*/
$(document).ready(function() {

	$('#date-picker').datepicker({});

	$('#clear-btn').click(function(){
		chrome.storage.sync.clear();
	});

	$('#create-new-task-btn').click(function(){
		addTask();
	});

	$('#take-break-btn').click(function(){
		chrome.runtime.sendMessage({directive: "unlock"}, function(response) {
				console.log(response.affirm);
				if(breaks > 0) { 
					takeBreak(); 
				} else {
					console.log("no more breaks"); //change this to an alert.
				}
		});
	});

	$('#fence-btn').click(function(){
		var fb = document.getElementById('fence-btn');
		if(enabled == true) {
			enabled = false;
			//alert("Bring down that fence!");
			chrome.runtime.sendMessage({directive: "unlock"}, function(response) {});
			fb.innerHTML = "Fence on";
		}
		else if(enabled == false){
			enabled = true;
			//alert("The fence is up. All is quiet");
			chrome.runtime.sendMessage({directive: "lock"}, function(response) {});
			fb.innerHTML = "Fence off";
		}
	});

	$('#stats-toggle-btn').click(function(){
		var stats = crunchStats(breaks, completedTasks);
		b = stats['break_ratio'];
		t = stats['task_ratio'];
		var data = [ {value: stats['break_ratio'], color: "#F7464A"}, 
					 {value: stats['task_ratio'], color: "#3498db"} ];
		var ctx = $("#stats-box").get(0).getContext("2d");
		var stats = new Chart(ctx).Doughnut(data);
		document.getElementById('stat-report').innerHTML = generateReport(b, t);
	});

	$(document).on("click", ".startbtn", function(){
		console.log("clicked");
		startTask(this.id);
	});

	$(document).on("click", ".markbtn", function(){
		var percent = prompt("How much have you finished? (i.e. 20% )");
		markTask(this.id, percent);
	});

	$(document).on("click", ".pausebtn", function(){
		console.log("clicked");
		if (confirm('Would you like to take a break before moving on?')) {
		   	chrome.runtime.sendMessage({directive: "unlock"}, function(response) {
				console.log(response.affirm);
				if(breaks > 0) { 
					takeBreak(); 
				} else {
					alert("Sorry, no more breaks. Get to work"); //change this to an alert.
				}
			});
		} else {
		    // Do nothing!
		}
	});

	$(document).on("click", ".killbtn", function(){
		removeTask(this.id);
	});
});

/**
	Core Methods (all of which are self explanitory)
*/
function startTask(id) {
	var start_id = id.split('_')[1];
	console.log("started task "+start_id);
	currentTask = start_id;
}

function markTask(id, percent) {
	var mark_id = "progress_"+id.split('_')[1];
	var task_id = id.split('_')[1];
	var width = percent+"%";
	var mark_progress = document.getElementById(mark_id);
	mark_progress.style.width = width;
	updateTask(task_id, percent);
}

function takeBreak() {

	breaks-=1;
	//$("#break-ticker").html(breaks);
	document.title = breakTime + "m";

	var bt = setInterval(function() {
		 breakTime -= 1;
		 var minutesLeft = breakTime;
		 document.title = minutesLeft + "m";
		 console.log(breakTime);
		 if(minutesLeft == 0) {
		 	//animate color possibly
		 	chrome.runtime.sendMessage({directive: "lock"}, function(response) {
  				console.log(response.affirm);
  				setBreaks();
  				document.title = "Tasks";
  				breakTime = BREAK_MINUTES;
  				clearInterval(bt);
			});
		 }
	}, 60000);

}

function getTasksAndBreaks() { 
	if( currentTasks == null || currentTasks.length < 1 ) {
		id = 0;
	} else {
		id = currentTasks.length;
		$("#task-ticker").html(currentTasks.length);
	}
	getBreaks();
	showTasks(currentTasks);
}

function showTasks(listOfTasks) {

	console.log("You have "+listOfTasks.length+" in the queue");

	//build each task in the list
	for(var i=0; i < listOfTasks.length; i++) {
		buildTask(
					listOfTasks[i]['category'], 
				  	listOfTasks[i]['concern'], 
				  	listOfTasks[i]['due'], 
				  	listOfTasks[i]['desc'],
				  	listOfTasks[i]['task_id'],
				  	listOfTasks[i]['percentComplete']
				  );
	}
}

function addTask() {

	//form vars
	var cat = $("#input-category").val();
	var concern = $("#input-concerned").val();
	var date = $('#date-picker').datepicker('getDate');
	var due = formatDate(date);
	var desc = $("#input-description").val();

	//build an object w/ all props
	var task = new Object();
	task.category = cat;
	task.concern = concern;
	task.due = due;
	task.desc = desc;
	task.task_id = nextId(currentTasks);
	task.percentComplete = 0;
	id = task.task_id;

	currentTasks.push(task);

	//save the task to sync
	chrome.storage.sync.set({tasks : currentTasks }, function() {
		console.log('task added');
	});

	//add task to DOM
	buildTask(cat, concern, due, desc, id, 0);
}

function buildTask(cat, concern, due, desc, id, pc) {
	var pcInt = parseInt(pc);
	console.log("task is "+pcInt+"completed");
	//building vars
	var listGroup = document.getElementById('task-list');
	var newTask = document.createElement('div');
	var catAndConcern = document.createElement('h4');
	var description = document.createElement('p');
	var progress = document.createElement('div');
	var pbar = document.createElement('div');
	var start = document.createElement('a');
	var done = document.createElement('a');
	var pause = document.createElement('a');
	var mark = document.createElement('a');
	var group = document.createElement('div');

	//setup
	newTask.setAttribute('class', 'list-group-item');
	newTask.id = id;

	catAndConcern.setAttribute('class', 'list-group-item-heading');
	catAndConcern.innerHTML = cat+": "+concern+" <small>Due: "+due+"</small>";

	description.setAttribute('class', 'list-group-item-text');
	description.innerHTML = desc;

	progress.setAttribute('class', 'progress');
	progress.setAttribute('style', 'margin-top:5px;');

	pbar.id = "progress_"+id;
	pbar.setAttribute('class', 'progress-bar progress-bar-success');
	pbar.setAttribute('role', 'progressbar');
	pbar.setAttribute('aria-valuenow', pcInt);
	pbar.setAttribute('aria-valuemin', '0');
	pbar.setAttribute('aria-valuemax', '100');
	pbar.style.width = pc+"%";

	start.setAttribute('class', 'btn btn-default btn-xs startbtn');
	start.id = "start_"+id;
	start.innerHTML = "Start task";
	pause.setAttribute('class', 'btn btn-default btn-xs pausebtn');
	pause.id = "pause_"+id;
	pause.innerHTML = "Pause task";
	done.setAttribute('class', 'btn btn-default btn-xs killbtn');
	done.id = "kill_"+id;
	done.innerHTML = "Kill task";
	mark.setAttribute('class', 'btn btn-default btn-xs markbtn');
	mark.id = "mark_"+id;
	mark.innerHTML = "Mark task";

	group.setAttribute('class', 'btn-group');
	group.setAttribute('style', 'margin-top: 10px; margin-bottom: 10px;');

	//assemble
	//group.appendChild(start);
	group.appendChild(mark);
	group.appendChild(pause);
	group.appendChild(done);
	progress.appendChild(pbar);
	newTask.appendChild(catAndConcern);
	newTask.appendChild(description);
	newTask.appendChild(group);
	newTask.appendChild(progress);
	listGroup.appendChild(newTask);
}

function removeTask(task_id) {
	//a temporary and sloppy solution 
	var indexToRemove;
	var kill_id = task_id.split('_')[1];
	console.log(kill_id);
	for(var i = 0; i < currentTasks.length; i++) {
		if(currentTasks[i]['task_id'] == kill_id) {
			indexToRemove = i;
			break;
		}
	}
	var removed = currentTasks.splice(indexToRemove, 1);
	console.log(removed);
	chrome.storage.sync.set({tasks : currentTasks}, function() {
		alert("task completed!");
		console.log('sucessfully deleted'); //will replace w/ alert soon!
	});
	completedTasks++;
	console.log(completedTasks);
}

function getBreaks() {
	chrome.storage.sync.get("breaks", function(items) {
		console.log("Breaks returned = "+items['breaks']);
		breaks = items['breaks'];
		$("#break-ticker").html(breaks);
	});
}

function setBreaks() {
	chrome.storage.sync.set({ "breaks" : breaks }, function() {
		console.log("break count updated");
	 });
}

function tabAlert() {
	chrome.runtime.sendMessage({directive: "animate"}, function(response) {
  		console.log(response.affirm);
	});
}

function showNewWindow() {
	chrome.windows.create({ 'url' : 'popup.html',
							'width' : 300, 
							"height" : 400, 
							"focused" : true, 
							"type" : "panel" });
}

function crunchStats(breaks, tasksComplete) {
	//the only 'stats' we're interested in right now are 
	//	1. the number of tasks completed/number of breaks taken	
	var stats = new Object();
	var totalBreaks = 3;
	var totalTasks;

	if(currentTasks != null) {
		totalTasks = currentTasks.length;
	} else {
		totalTasks = 0;
	}
	var b_ratio = (breaks/totalBreaks) * 100;
	if(b_ratio == 100){ b_ratio = 0; }
	var t_ratio = 0;
	if(totalTasks != 0) {
		t_ratio = (tasksComplete/totalTasks) * 100;
	} 
	console.log("b: "+b_ratio+" t: "+t_ratio);
	stats['task_ratio'] = t_ratio;
	stats['break_ratio'] = b_ratio; 
	return stats;
}

function formatDate(date) {

	var temp = date.toString().split(' ');
	date = temp[0]+" "+temp[1]+" "+temp[2]+" "+temp[3];
	return date;
}

function generateReport(b_ratio, t_ratio){

	var report = "You've completed "+Math.ceil(t_ratio)+"% of your tasks and used "+Math.ceil(b_ratio)+"% of your breaks. ";
	if(t_ratio > b_ratio) {
		report += "Keep it up!";
	} else if(t_ratio < b_ratio) {
		report += "Get to work!";
	} else {
		report += "Your walking the line between productivity and procrastination...";
	}
	return report;
}
function nextId(listOfTasks) {
	if(listOfTasks.length > 0){
		var big = listOfTasks[0]['task_id'];
		for(var i = 0; i < listOfTasks.length; i++) {
			if(listOfTasks[i]['task_id'] > big ) {
				big = listOfTasks[i]['task_id'];
			}
		}
	} else {
		var big = 0;
	}
	return big+1;
}
function updateTask(id, pc) {
	if(pc != null && pc != 0) {
		for(var i=0; i < currentTasks.length; i++) {
			if(currentTasks[i]['task_id'] == id) {
				currentTasks[i]['percentComplete'] = pc; 
				console.log(currentTasks[i]['task_id']+" "+currentTasks[i]['percentComplete']); 
				chrome.storage.sync.set({tasks : currentTasks}, function() {
					console.log('updated');
				});
			}
		}
	}

}