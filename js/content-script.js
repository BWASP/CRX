function toastInit(){
    let toastContainer = {
        parent: document.createElement("div"),
        container: document.createElement("div")
    }
    toastContainer.parent.classList.add("bwasp-position-relative");
    toastContainer.parent.setAttribute("aria-live","polite");
    toastContainer.parent.setAttribute("aria-atomic","true");

    toastContainer.container.classList.add("bwasp-toast-container", "bwasp-position-fixed", "bwasp-bottom-0", "bwasp-end-0", "bwasp-p-3");
    toastContainer.container.setAttribute("z-index","11");
    toastContainer.container.setAttribute("id","toast-container");
    toastContainer.parent.appendChild(toastContainer.container);
    document.body.appendChild(toastContainer.parent);
}

function toastBuilder(msg){  
    let toastElement = {
        parent: document.createElement("div"),
        flex: {
        parent: document.createElement("div"),
        body: document.createElement("div"),
        close: document.createElement("button")
        }
    }

    toastElement.parent.classList.add("bwasp-toast", "bwasp-text-white", "bwasp-bg-danger");
    toastElement.parent.setAttribute("role","alert");
    toastElement.parent.setAttribute("aria-live","assertive");
    toastElement.parent.setAttribute("aria-atomic","true");
    toastElement.parent.setAttribute("data-bs-delay","4000");

    toastElement.flex.parent.classList.add("bwasp-d-flex");
    toastElement.flex.body.classList.add("bwasp-toast-body");
    toastElement.flex.body.innerText = msg;
    toastElement.flex.close.classList.add("bwasp-btn-close","bwasp-me-2","bwasp-m-auto");
    toastElement.flex.close.setAttribute("type","button");
    toastElement.flex.close.setAttribute("data-bs-dismiss","toast");
    toastElement.flex.close.setAttribute("aria-label","Close");

    toastElement.flex.parent.append(toastElement.flex.body,toastElement.flex.close)
    toastElement.parent.appendChild(toastElement.flex.parent)

    return toastElement.parent
}

toastInit();

let background_port=chrome.runtime.connect({name: "domsource"})
background_port.postMessage("start detected")
background_port.onMessage.addListener(function(msg) {
    if (msg.type == "getdomsource") {
        console.log("[content-script] get request of  requiring domsource")
        msg.type= "retdomsource"
        msg.source = document.documentElement.outerHTML;
        background_port.postMessage(msg)
    } else if (msg.type == "attackVector") {
        console.log("This is Attack Vector!!!");
        paramSet = msg.data;
        paramSet.forEach((param) => {
            vectorSet = Object.keys(param.doubt);
            vectorSet.forEach((vector) => {
                toastExample = toastBuilder(vector)
                document.getElementById("toast-container").appendChild(toastExample);
                var toast = new bootstrap.Toast(toastExample);
                toast.show()
            });
        });
    }
});
