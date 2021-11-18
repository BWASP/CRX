//window.onload =  window.alert("hello")
//window.alert("hello")
//document.body.style.backgroundColor = 'orange';

/*
chrome.runtime.onMessage.addListener(function(request, sender) {
    if (request.action == "getSource") {
        this.pageSource = request.source;
        console.log("페이지소스",pageSource)
        var title = this.pageSource.match(/<title[^>]*>([^<]+)<\/title>/)[1];
        alert(title)
    }
});

chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    chrome.tabs.executeScript(
        tabs[0].id,
        { code: 'var s = document.documentElement.outerHTML; chrome.runtime.sendMessage({action: "getSource", source: s});' }
    );
});
*/