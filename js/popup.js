// Get modules
import {createKey, tableBuilder} from './jHelper.js';

class Popup {
    constructor() {
        this.status = {
            API: {
                port: 20102,
                status: true
            },
            main: {
                port: 20202,
                status: true
            }
        }
        this.APIBase = "http://3.35.168.235";

        this.renderData = {
            elements: {
                vectors: ["URL", "Doubt", "Params", "Misc", "Methods"],
                packets: []
            },
            keyAndStrings: {
                type: "vectors",
                viewString: "Attack Vectors"
            }
        }

        this.sidebarHandler();
        this.checkServer().then(serverStatus => this.communicateBackground("popup", serverStatus))
    }

    buildTable(dataPackage) {
        let builder = new tableBuilder(),
            table = {
                ID: createKey(),
                place: document.getElementById("tablePlace"),
                holder: document.getElementById("tablePlaceHolder"),
                elements: {
                    table: document.createElement("table"),
                    tbody: document.createElement("tbody")
                }
            },
            currentState = this.renderData.keyAndStrings;

        // Update title bar string and
        document.getElementById("pageTitle").innerHTML = currentState.viewString;
        document.title = `${currentState.viewString} - BWASP`;

        // Initialize tablePlace DIV
        table.place.innerHTML = "";

        // Set default table classes
        table.elements.table.classList.add("table", "table-hover");

        dataPackage.forEach((dataSet) => {
            let rowElement = {
                parent: document.createElement("tr"),
                child: {
                    URL: document.createElement("th"),
                    // SQL Injection, XSS, CORS, ....
                    doubt: document.createElement("td"),
                    param: document.createElement("td"),
                    misc: document.createElement("td"),
                    info: document.createElement("td"),
                },
                lineBreak: document.createElement("br")
            }

            // Build URL
            rowElement.child.URL.innerText = dataSet.url;
            rowElement.parent.appendChild(rowElement.child.URL);

            let paramSet = Array();

            // Build vulnerability doubt
            paramSet = Object.keys(dataSet.doubt);
            rowElement.child.doubt.classList.add("text-center");
            paramSet.forEach((param) => {
                let codeElement = document.createElement("code");
                codeElement.innerText = param;
                rowElement.child.doubt.appendChild(codeElement);
                if (paramSet[paramSet.length - 1] !== param) rowElement.child.doubt.appendChild(builder.commaAsElement());
            })
            rowElement.parent.appendChild((paramSet.length !== 0)
                ? rowElement.child.doubt
                : builder.dataNotPresent()
            );
            // Build Parameters
            if (Object.keys(dataSet).includes("param")) {
                paramSet = dataSet.param;
                rowElement.child.param.classList.add("text-center");
                paramSet.forEach((param) => {
                    let codeElement = document.createElement("code");
                    codeElement.innerText = param;
                    rowElement.child.param.appendChild(codeElement);
                    if (paramSet[paramSet.length - 1] !== param) rowElement.child.param.appendChild(builder.commaAsElement());
                })
                rowElement.parent.appendChild((paramSet.length !== 0)
                    ? rowElement.child.param
                    : builder.dataNotPresent()
                );
            } else {
                rowElement.parent.appendChild(builder.dataNotPresent());
            }
            // Build misc
            paramSet = Object.keys(dataSet.misc);
            rowElement.child.misc.classList.add("text-center");
            let element = document.createElement("p");
            element.innerText = "";
            paramSet.forEach((param) => {
                element.innerText += param;
                if (paramSet[paramSet.length - 1] !== param) element.innerText += ",";
                rowElement.child.misc.appendChild(element);
            })
            rowElement.parent.appendChild((paramSet.length !== 0)
                ? rowElement.child.misc
                : builder.dataNotPresent()
            );

            // Build info
            let keySet = Object.keys(dataSet.info);
            // rowElement.child.info.classList.add("badge", "bg-success");
            rowElement.child.info.classList.add("text-center");
            keySet.forEach((key) => {
                paramSet = dataSet.info[key];
                paramSet.forEach((param) => {
                    let codeElement = document.createElement("code");
                    codeElement.innerText = param;
                    rowElement.child.info.appendChild(codeElement);
                    if (paramSet[paramSet.length - 1] !== param) rowElement.child.info.appendChild(builder.commaAsElement());
                })
            })
            rowElement.parent.appendChild((keySet.length !== 0 && paramSet.length !== 0)
                ? rowElement.child.info
                : builder.dataNotPresent()
            );

            // // Build Impact
            // rowElement.child.impact.rate.innerText = impactRate[dataSet.impactRate][1];
            // rowElement.child.impact.rate.classList.add("badge", "rounded-pill", `bg-${impactRate[dataSet.impactRate][0]}`, "small");
            // rowElement.child.impact.parent.classList.add("text-center");
            // rowElement.child.impact.parent.appendChild(rowElement.child.impact.rate);
            // rowElement.parent.appendChild(rowElement.child.impact.parent);

            // Add current row to main tbody
            table.elements.tbody.append(rowElement.parent);
            // console.log(dataSet);
        });
        // Build table element
        table.elements.table.append(
            builder.buildHead(this.renderData.elements[currentState.type]),
            table.elements.tbody
        )

        // Finalize jobs
        table.place.appendChild(table.elements.table);
        document.getElementById("loadingProgress").classList.add("d-none");
        document.getElementById("tablePlace").classList.remove("d-none");
        document.getElementById("tablePlaceHolder").classList.remove("d-none");
    }

    async checkServer() {
        let requestOption = {"method": "HEAD"};

        // Check status
        for (const target of Object.keys(this.status)) {
            await fetch(`${this.APIBase}:${this.status[target].port}`, requestOption).catch(e => this.status[target].status = false);
        }
        let overallResult = this.status.API.status && this.status.main.status;

        // Hide load element
        document.getElementById("loadingProgress").classList.add("d-none");

        // Display result to user view DOM
        if (!overallResult) {
            document.getElementById("err-noServerPresented").classList.remove("d-none");
            for (const target of Object.keys(this.status)) {
                if (!this.status[target].status) {
                    console.log(this.status[target])
                    document.getElementById("err-noServerPresented-targetURL").innerText = `${this.APIBase}:${this.status[target].port}`;
                    document.getElementById("err-noServerPresented-targetServer").innerText = target;
                    break;
                }
            }
        } else {
            for (const target of ["leftSideBar", "topMainBar"]) {
                document.getElementById(target).classList.remove("d-none");
            }
        }

        return overallResult;
    }

    communicateBackground(message, serverStatus) {
        let option = {
            currentWindow: true,
            active: true
        };

        chrome.tabs.query(option, tabs => {
            let port = chrome.runtime.connect({
                name: message
            });
            port.postMessage({
                type: "curpage_url",
                url: tabs[0].url
            });

            // Add event listener to start button
            document.getElementById("job-start").addEventListener("click", () => {
                if (serverStatus) chrome.tabs.query(option, startTabs => {
                    port.postMessage({
                        type: "start",
                        init_option: {
                            url: startTabs[0].url,
                            page_tabid: startTabs[0].id,
                            page_tab: startTabs[0]
                        }
                    })
                })
            })

            // Add event listener to stop button
            document.getElementById("job-stop").addEventListener("click", () => port.postMessage({
                type: "stop"
            }));

            port.onMessage.addListener(res => {
                if (res.type === "attackVector") this.buildTable(res.data);
            })
        })
    }

    sidebarHandler() {
        if(window.location.pathname === "/") return;
        let side = {
            uri: window.location.pathname
                .replaceAll("/html", "")
                .replaceAll(".html", "")
                .split("/"),
            target: "target"
        };
        side.uri.splice(0, 1);
        side.uri.forEach(data => side.target += `-${data}`);

        console.log(side);
        try{
            document.getElementById(side.target).classList.add("active");
        }catch (e){
            console.error(e);
        }
    }
}

new Popup();