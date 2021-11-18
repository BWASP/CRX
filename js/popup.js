// Get modules
import {API as api, createKey, tableBuilder} from './jHelper.js';


const elements = {
  vectors: ["URL", "Doubt", "Misc", "Methods"],
  packets: []
}
let stateHandler = {
    isVector: true
},
keyAndStrings = 
  {
      type: "vectors",
      viewString: "Attack Vectors"
  },
returnError = (errorMessage = ["No data", ""]) => {
    let condition = (typeof (errorMessage) !== "string");
    console.log(errorMessage, typeof (errorMessage), condition);
    document.getElementById("errMsgTitle").innerText = (condition)
        ? errorMessage[0]
        : errorMessage;
    document.getElementById("errMsgDesc").innerText = (condition)
        ? errorMessage[1]
        : "";
    document.getElementById("loadingProgress").classList.add("d-none");
    document.getElementById("resultNoData").classList.remove("d-none");
    console.error(`:: ERROR :: `, errorMessage);
};

function buildTable(dataPackage) {
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
    currentState = keyAndStrings;

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
                    // type: document.createElement("p")
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
        builder.buildHead(elements[currentState.type]),
        table.elements.tbody
    )

    // Finalize jobs
    table.place.appendChild(table.elements.table);
    document.getElementById("loadingProgress").classList.add("d-none");
    document.getElementById("tablePlace").classList.remove("d-none");
    document.getElementById("tablePlaceHolder").classList.remove("d-none");
}


function communicate_background(message)
{
  chrome.tabs.query({currentWindow: true, active: true}, function(tabs){
    let port = chrome.runtime.connect({name :message});
    document.getElementById("start").addEventListener("click", port.postMessage({"type":"start","init_option": {"url" : tabs[0].url ,"page_tabid" : tabs[0].id}}));
    port.onMessage.addListener(function(msg) {
      if (msg.type == "attackVector") {
        buildTable(msg.data);
      }
    });
  });
}

communicate_background("popup");
 //document.getElementById("stop").addEventListener("click",communicate_background("stop"));



