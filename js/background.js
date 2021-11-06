chrome.devtools.panels.create("asdfasd", "", "popup.html", function(panel){
    console.log("test");
})
chrome.devtools.network.onRequestFinished.addListener(
    function(request) {
        request.getContent(function(content, encoding){
            console.log(content);
        })
        console.log(request.request.url);
    }
);

alert("hi");