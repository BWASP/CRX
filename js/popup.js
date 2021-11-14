// Get modules
import {API as api, createKey, tableBuilder} from './jHelper.js';

let stateHandler = {
    isVector: true
},
keyAndStrings = [
    {
        type: "packets",
        viewString: "Packets"
    },
    {
        type: "vectors",
        viewString: "Attack Vectors"
    }
],
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
    currentState = keyAndStrings[Number(stateHandler.isVector)];

    // Update title bar string and
    document.getElementById("pageTitle").innerHTML = currentState.viewString;
    document.title = `${currentState.viewString} - BWASP`;

    // Initialize tablePlace DIV
    table.place.innerHTML = "";

    // Toggle loading screen
    document.getElementById("loadingProgress").classList.remove("d-none");
    document.getElementById("resultNoData").classList.add("d-none");

    // Set default table classes
    table.elements.table.classList.add("table", "table-hover");

    dataPackage.forEach((dataSet) => {
        let rowElement = {
                parent: document.createElement("tr"),
                child: {
                    category: document.createElement("th"),
                    URL: document.createElement("td"),
                    action: {
                        parent: document.createElement("td"),
                        target: document.createElement("p"),
                        method: document.createElement("p")
                    },
                    params: document.createElement("td"),
                    doubt: document.createElement("td"),
                    method: {
                        parent: document.createElement("td"),
                        method: document.createElement("span")
                    },
                    impact: {
                        parent: document.createElement("td"),
                        rate: document.createElement("span")
                    }
                },
                lineBreak: document.createElement("br")
            },
            impactRate = [["success", "Low"], ["warning", "Normal"], ["danger", "High"]];

        // Build category
        rowElement.child.category.innerText = (dataSet.category === 0)
            ? "Auto"
            : "Manual";
        rowElement.child.category.classList.add("text-muted", "text-center", "small");
        rowElement.parent.appendChild(rowElement.child.category);

        // Build URL
        rowElement.child.URL.innerText = dataSet.url.url + dataSet.url.uri;
        // rowElement.child.URL.classList.add("text-break");
        rowElement.parent.appendChild(rowElement.child.URL);

        // Build action if present
        if (dataSet.action.target.length !== 0) {
            let target = document.createElement("p"),
                method = document.createElement("p")
            method.innerText = dataSet.action.type[0];
            target.innerText = dataSet.action.target[0];

            method.classList.add("badge", "bg-success", "text-uppercase", "me-2", "mb-1");
            target.classList.add("mb-0");

            rowElement.child.action.parent.append(
                method,
                target
            );
            rowElement.parent.appendChild(rowElement.child.action.parent);
        } else {
            rowElement.parent.appendChild(builder.dataNotPresent());
        }

        // Build params if present
        let paramSet = Array();
        rowElement.child.params.classList.add("text-center");
        dataSet.params.forEach((param) => {
            if (param !== "") {
                if (param.includes("=")) param = param.split("=")[0];
                paramSet.push(param);
            }
        });

        if (paramSet.length !== 0) {
            paramSet.forEach((param) => {
                let codeElement = document.createElement("code");
                codeElement.innerText = param;
                rowElement.child.params.appendChild(codeElement);
                if (paramSet[paramSet.length - 1] !== param) rowElement.child.params.appendChild(builder.commaAsElement());
            })
            rowElement.parent.appendChild(rowElement.child.params);
        } else {
            rowElement.parent.appendChild(builder.dataNotPresent());
        }

        // Build vulnerability doubt
        paramSet = Object.keys(dataSet.vulnerability.type.doubt);
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

        // Build Method
        rowElement.child.method.method.innerText = dataSet.method;
        rowElement.child.method.method.classList.add("badge", "bg-success");
        rowElement.child.method.parent.classList.add("text-center");
        rowElement.child.method.parent.appendChild(rowElement.child.method.method);
        rowElement.parent.appendChild(rowElement.child.method.parent);

        // Build Impact
        rowElement.child.impact.rate.innerText = impactRate[dataSet.impactRate][1];
        rowElement.child.impact.rate.classList.add("badge", "rounded-pill", `bg-${impactRate[dataSet.impactRate][0]}`, "small");
        rowElement.child.impact.parent.classList.add("text-center");
        rowElement.child.impact.parent.appendChild(rowElement.child.impact.rate);
        rowElement.parent.appendChild(rowElement.child.impact.parent);

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

// 페이지가 완전히 로딩된 후 함수 실행
let dataPackage = [
	{
	"url": "http://testphp.vulnweb.com/admin.php",
  "info": {
    "allowMethod": [] // 없으면 제거
  },
  "doubt": {
    "SQL injection": {
      "type": [
        "None"
      ]
    },
    "XSS": {
      "type": [
        "None"
      ],
      "required": [] // 탐지되면 추가 "HttpOnly", "X-Frame-Options" 리스트로 추가 
    },
    "CORS": false, // 없으면 제거 false면 제거
    "Open Redirect": "url", // 없으면 제거 false면 제거
    "s3": [],  // 없으면 제거
    "File Upload": false // 없으면 제거 false면 제거
  },
  "misc": {
    "robots.txt": false // 없으면 제거 false면 제거
  }
},
  {
	"url": "http://testphp.vulnweb.com/login.php",
  "info": {
    "allowMethod": []
  },
  "doubt": {
    "SQL injection": {
      "type": [
        "None"
      ]
    },
    "XSS": {
      "type": [
        "None"
      ],
      "required": []
    },
    "CORS": false,
    "Open Redirect": "url",
    "s3": [],
    "File Upload": false
  },
  "misc": {
    "robots.txt": false
		 }
	}
]
window.onload = buildTable(dataPackage);