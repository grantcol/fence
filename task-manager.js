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

var id; //keeps track of current id of tasks
var breaks = 0;
var breakTime = 10;
var currentTasks; 
var ld = true;
if(ld == true) { 
	breaks = 3; 
	setBreaks();
}
chrome.storage.sync.get('tasks',
	function(items){ 
		currentTasks = items['tasks'];
		getTasksAndBreaks(); 
	});

/**
	Gui Handlers
*/

 $('#create-new-task-btn').click(function(){
 	addTask();
 });

 $("#remove-task-btn").click(function() {
 	removeTask();
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

/**
	Core Methods (all of which are self explanitory)
*/
function takeBreak() {

	breaks-=1;
	$("#break-ticker").html(breaks);
	document.title = breakTime + "m";

	setInterval(function() {
		 breakTime -= 1;
		 var minutesLeft = breakTime;
		 document.title = minutesLeft + "m";
		 console.log(breakTime);
		 if(minutesLeft == 0) {
		 	//animate color possibly
		 	chrome.runtime.sendMessage({directive: "lock"}, function(response) {
  				console.log(response.affirm);
  				setBreaks();
  				document.title = "ToDo";
  				clearInverval();
			});
		 }
	}, 60000);

}

function getTasksAndBreaks() { 
	if(currentTasks.length < 1 || currentTasks == null) {
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
				  	listOfTasks[i]['desc']
				  );
	}
}

function addTask() {

	//form vars
	var cat = $("#input-category").val();
	var concern = $("#input-concerned").val();
	var due = $("#input-due").val();
	var desc = $("#input-description").val();

	//build an object w/ all props
	var task = new Object();
	task.category = cat;
	task.concern = concern;
	task.due = due;
	task.desc = desc;
	task.task_id = id;
	id++;

	currentTasks.push(task);

	//save the task to sync
	chrome.storage.sync.set({tasks : currentTasks }, function() {
		console.log('task added');
	});

	//add task to DOM
	buildTask(cat, concern, due, desc);
}

function buildTask(cat, concern, due, desc) {

	//building vars
	var listGroup = document.getElementById('task-list');
	var newTask = document.createElement('a');
	var catAndConcern = document.createElement('h4');
	var description = document.createElement('p');

	//setup
	newTask.setAttribute('class', 'list-group-item');
	newTask.href = "#";

	catAndConcern.setAttribute('class', 'list-group-item-heading');
	catAndConcern.innerHTML = cat+": "+concern+" <small>Due "+due+"</small>";

	description.setAttribute('class', 'list-group-item-text');
	description.innerHTML = desc;

	//assemble
	newTask.appendChild(catAndConcern);
	newTask.appendChild(description);
	listGroup.appendChild(newTask);
}

function removeTask(task_id) {
	//a temporary and sloppy solution 
	var indexToRemove;
	for(var i = 0; i < currentTasks.length; i++) {
		if(currentTasks[i]['task_id'] == task_id) {
			indexToRemove = i;
			break;
		}
	}
	var removed = currentTasks.splice(indexToRemove, 1);
	console.log(removed);
	chrome.storage.sync.set({tasks : currentTasks}, function() {
		console.log('sucessfully deleted'); //will replace w/ alert soon!
	});
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

function crunchStats() {
	//the only 'stats' we're interested in right now are 
	//	1. the number of breaks taken vs time worked 
	//  2. the number of breaks awarded for the above ratio
	//  3. when calendar/csv's are implemented how much you worked 
	//     in relation to how much time you had between obligations 	
}
