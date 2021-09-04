// Saves options to chrome.storage
function save_options() {
    var newsSite = document.getElementById('site').value;
    var mySport = document.getElementById('hobby1').value;
    var myHobby = document.getElementById('hobby2').value;
    var netFlix = document.getElementById('netflix').checked;
    chrome.storage.local.set({
        newsSite: newsSite,
        netFlix: netFlix,
        mySport: mySport,
        myHobby: myHobby
    }, function() {
        // Update status to let user know options were saved.
        var status = document.getElementById('status');
        status.textContent = 'Options saved.';
        setTimeout(function() {
            status.textContent = '';
        }, 750);
    });
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
    // Use default value
    chrome.storage.local.get({
        newsSite: 'gnn',
        mySport: 'football',
        myHobby: 'reading',
        netFlix: true
    }, function(items) {
        document.getElementById('site').value = items.newsSite;
        document.getElementById('hobby1').value = items.mySport;
        document.getElementById('hobby2').value = items.myHobby;
        document.getElementById('netflix').checked = items.netFlix;
    });
}
document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click',
    save_options);