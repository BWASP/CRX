let background_port=chrome.runtime.connect({name: "domsource"})
background_port.postMessage("start detected")
background_port.onMessage.addListener(function(msg) {
    if (msg.type == "getdomsource") {
        console.log("[content-script] get request of  requiring domsource")
        msg.type= "retdomsource"
        msg.source = document.documentElement.outerHTML;
        background_port.postMessage(msg)
    }
});
