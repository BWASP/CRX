//도메인 필터링 로컬 스토리지 해서 추가
const url_filter = "chrome://|chrome-extension://"
let isdebug = false
//let cur_documentURL = ""
let debugid = -2
let packet = []
let page_list = new Array()
let request_list = new Array()

let page_index = -1 // integer
let loader_dict = {}
let link_list = new Array()
let attackvector_list = new Array()
let sendpage_index = -1
let reset_index = 0

let init_option = {
    "start": false,
    "url": "",
    "url_domain": "",
    "page_tab": new Object(),
    "page_tabid": -1,
    "debug_tabid": -1,
    "popup_port": null,
    "content_port": null,
    "document_url": undefined,
    "document_packet_index" : -1,
    "document_requestId" : -1
}

let listener_function = {
    "tabs_onUpdated": undefined,
    "tabs_onRemoved": undefined
}

const packet_form = [{
    "request": {
        "method": "",
        "url": "",
        "headers": {},
        "body": "",
        "full_url": ""
    },
    "response": {
        "headers": {},
        "body": "",
        "status_code": ""
    }
}];



let dataPackage = [{
    "url": "http://testphp.vulnweb.com/admin.php",
    "info": {
        "allowMethod": ['GET', 'POST', 'OPTIONS'] // 없으면 제거
    },
    "doubt": {
        "SQL injection": {
            "type": ["login", "search"]
        },
        "XSS": {
            "type": ["board", "search"],
            "required": ["HttpOnly", "X-Frame-Options"] // 탐지되면 추가 "HttpOnly", "X-Frame-Options" 리스트로 추가 
        },
        "Open Redirect": "https://naver.com/", // 없으면 제거 false면 제거
        "File Upload": true // 없으면 제거 false면 제거
    },
    "misc": {
        "robots.txt": true // 없으면 제거 false면 제거
    }
},
{
    "url": "http://testphp.vulnweb.com/login.php",
    "info": {
        "allowMethod": ['GET', 'POST', 'OPTIONS', 'PUT'] // 없으면 제거
    },
    "doubt": {
        "SQL injection": {
            "type": ["login", "search"]
        },
        "XSS": {
            "type": ["board", "search"],
            "required": ["HttpOnly", "X-Frame-Options"] // 탐지되면 추가 "HttpOnly", "X-Frame-Options" 리스트로 추가 
        },
        "CORS": true, // 없으면 제거 false면 제거
        "s3": ["????", "??????????"], // 없으면 제거
    },
    "param":["uid","upw","level"],
    "misc": {}
}
]

function init_variable()
{
    isdebug = false
    debugid = -2
    packet = []
    page_list = new Array()
    request_list = new Array()
    page_index = -1 // integer
    loader_dict = {}
    link_list = new Array()
    attackvector_list = new Array()
    sendpage_index = -1
    reset_index = 0
    init_option["start"] = false,
    init_option["url"] = "",
    init_option["url_domain"] = "",
    init_option["page_tab"] = new Object(),
    init_option["page_tabid"] = -1,
    init_option["debug_tabid"] = -1,
    //init_option["popup_port"] = null,
    init_option["content_port"] = null
    init_option["document_url"]= undefined,
    init_option["document_packet_index"]= -1,
    init_option["document_requestId"] =  -1
    listener_function["tabs_onUpdated"] = undefined
    listener_function["tabs_onRemoved"] = undefined
}


function store_url(url, tab_id) {
    chrome.storage.local.set({
        'option': {
            'url': url,
            'page_tabid': tab_id
        }
    }, function () { })

}

function issame_domain(url) // 다시 return true 지워야 함
{
    if (init_option["url_domain"] == (new URL(url)).origin) {
        return true

    } else
        return false
}

chrome.runtime.onConnect.addListener(function (port) {
    switch (port.name) {
        case "popup":
            init_option["popup_port"] = port //between popup.js background.js
            init_option["popup_port"].onMessage.addListener(function (msg) {
                if(init_option["start"] && msg.type == "curpage_url")
                {
                    const attackvector_index = link_list.lastIndexOf(msg.url)
                    if(attackvector_index != -1)
                    {
                        if (attackvector_list[attackvector_index].length !== 0) {
                            init_option["popup_port"].postMessage({
                                "type": "attackVector",
                                "data": attackvector_list[attackvector_index]
                            });
                        }
                    }
                    
    
                }

                if (msg.type == "start") {
                    init_option["url"] = msg.init_option.url
                    init_option["page_tab"] = msg.init_option.page_tab
                    init_option["page_tabid"] = msg.init_option.page_tabid
                    init_option["url_domain"] = new URL(init_option["url"]).origin
                    //store_url(init_option["page_tabid"],init_option["url"])
                    init(init_option["start"])
                    init_option["start"] = true

                }
               
                if (msg.type == "stop") {
                    if (init_option["start"]) {
                        if (isdebug)
                        {
                            chrome.debugger.detach({
                                tabId: init_option["debug_tabid"]
                            }, null)
                            init_option["debug_tabid"] = -1
                            isdebug = false
                        }
                        console.log("stop started")
                        //if (chrome.tabs.onUpdated.hasListener(listener_function["tabs_onUpdatded"]))
                            chrome.tabs.onUpdated.removeListener(listener_function["tabs_onUpdatded"]);
                        //if (chrome.tabs.onRemoved.hasLiistner(listener_function["tabs_onRemoved"]))
                            chrome.tabs.onRemoved.removeListener(listener_function["tabs_onRemoved"]);
                        init_variable()

                        console.log("stop completed")
                        
                    }
                }

            });
            break
        case "domsource":
            init_option["content_port"] = port
            init_option["content_port"].onMessage.addListener(function (msg) {
                if (msg.type == "retdomsource") {
                    packet[msg.packet_index][msg.requestId][0]["response"]["body"] = msg.source
                }
            })

    }

});

class API {
    constructor() {
        this.API_url = "http://localhost:20202/"
    }

    /**
     * Send data to API
     * @param {string} endpoint
     * @param {string} type POST
     * @param {object} data null
     */
    async requestCommunication(endpoint = this.API_url, type = "POST", data = null) {
        let response = await fetch(endpoint, {
            method: type,
            cache: "no-cache",
            headers: {
                "Content-Type": "application/json",
                "accept": "application/json"
            },
            body: JSON.stringify(data)
        })
        return await response
        // .then(blob => blob.json())
        // .then(res => {
        //     console.log(res)
        // })
        // .catch(error => {
        //     console.log(error)
        // })
    }

    /**
     * Communicate with API
     * @param {string} endpoint
     */
    responseCommunicate(endpoint = this.API_url) {
        fetch(endpoint, {
            method: "GET",
            cache: "no-cache",
            headers: {
                "Content-Type": "application/json",
                "accept": "application/json"
            }
        })
            .then(blob => blob.json())
            .then(res => {
                console.log(res)
            })
            .catch(error => {
                console.log(error)
            })
    }
}

const debugAttach = async function (tabId, changeInfo, tab) {

    //console.log("tab(", tab.id, ")", tab.title, "디버그 부착")
    console.log("!!디버거 부착")
    await new Promise((resolve, reject) => {
        chrome.debugger.attach({
            tabId: tab.id
        }, '1.3', result => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError)
            } else {
                resolve(result)
            }

        })
    }).catch((e) => console.log(e));
    console.log(`tab(${tab.id})${tab.title}is now debugged`)
    isdebug = true
    debugid = tab.id

    const sendCommand = (method, params) => new Promise((resolve, reject) => {
        chrome.debugger.sendCommand({
            tabId: tab.id
        }, method, params, result => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError)
            } else {
                init_option["debug_tabid"] = tab.id
                resolve(result)
            }
        })
    })

    chrome.debugger.sendCommand({
        tabId: tabId
    }, "Debugger.enable", {}, async () => {
        chrome.debugger.onEvent.addListener(async (source, method, params) => {
            try {
            switch (method) {
                case 'Network.requestWillBeSent': {
                    const {
                        requestId,
                        request
                    } = params
                    if (params.type == "Document") {
                        if (params.initiator.type == "other" || (params.initiator.type == "script" && params.initiator.stack.callFrames[0].functionName == 'onclick') ) {
                            ++page_index
                            //chrome.tabs.executeScript({tabId :source.tabId }, {code: 'document.documentElement.outerHTML'},function(result) {console.log("자바스크립트",result);})
                            //console.log("page 번호",++page_index)
                            link_list.push(params.documentURL)
                            attackvector_list.push([])
                            console.log("Nope", params)
                        }

                        if (page_index != -1) {
                            //console.log("Nope",params,params.initiator.type)//,params.type,"현재 url",params.initiator.url)
                            loader_dict[params.loaderId] = page_index
                            packet.push([])


                        }
                    }
                    //else
                    //  console.log("Yes",params,params.type,"현재 url",params.initiator.url)

                    //request_list.push(requestId)
                    //console.log("출력", requestId, "형태", typeof requestId)
                    //console.log("loader id",params,params.loaderId,loader_dict,loader_dict[params.loaderId])
                    //console.log("패킷 상태",packet)

                    if (loader_dict.hasOwnProperty(params.loaderId)) { // Document 가 오지 않았을 떄는 무시

                        if (!packet[loader_dict[params.loaderId]].hasOwnProperty(requestId)) {

                            packet[loader_dict[params.loaderId]][requestId] = JSON.parse(JSON.stringify(packet_form))
                            if (params.type == "Document" && (params.initiator.type == "other" ||  ( params.initiator.type == "script" && params.initiator.stack.callFrames[0].functionName == 'onclick')))
                            {

                                init_option["document_url"]  = params.documentURL
                                init_option["document_packet_index"] = loader_dict[params.loaderId]
                                init_option["document_requestId"] = requestId
                                /*init_option["content_port"].postMessage({
                                    "type": "getdomsource",
                                    "packet_index": loader_dict[params.loaderId],
                                    "requestId": requestId,
                                    "source": ""
                                })*/
                                

                            }
                        }


                        packet[loader_dict[params.loaderId]][requestId][0]["request"]["full_url"] = request.url
                        request_url = new URL(request.url)
                        packet[loader_dict[params.loaderId]][requestId][0]["request"]["url"] = request_url.pathname + request_url.search + request_url.hash
                        //console.log(params.requestId,requestId,request.url)
                        packet[loader_dict[params.loaderId]][requestId][0]["request"]["method"] = request.method
                        //console.log(params.requestId,requestId,request.method)
                        lower_header = request.headers
                        packet[loader_dict[params.loaderId]][requestId][0]["request"]["headers"] = Object.keys(request.headers).reduce((c, k) => (c[k.toLowerCase()] = request.headers[k], c), {});
                        //console.log(params.requestId,JSON.stringify(request.headers))
                        if (request.hasPostData)
                            packet[loader_dict[params.loaderId]][requestId][0]["request"]["body"] = request.postData
                        //console.log(params.requestId,requestId,request.postData)

                    }

                    break
                }
                case 'Network.responseReceived': {
                    const {
                        requestId,
                        response
                    } = params
                    try {
                        let response_requestId = requestId
                    } catch (e) {
                        console.log("리퀘스트 아이디 에러 ", e)
                    }
                    // if exists request

                    if (loader_dict.hasOwnProperty(params.loaderId)) {
                        if (packet[loader_dict[params.loaderId]].hasOwnProperty(requestId)) {
                            packet[loader_dict[params.loaderId]][requestId][0]["response"]["status_code"] = response.status
                            //console.log(params.requestId,requestId,response.status)
                            packet[loader_dict[params.loaderId]][requestId][0]["response"]["headers"] = Object.keys(response.headers).reduce((c, k) => (c[k.toLowerCase()] = response.headers[k], c), {});
                            //console.log(params.requestId,requestId,JSON.stringify(response.headers))

                            //try{
                            const result = await sendCommand('Network.getResponseBody', {
                                requestId: requestId
                            })
                            //To do response document promise 에러 제거 필요
                            if (params.type != "Image") {
                                packet[loader_dict[params.loaderId]][requestId][0]["response"]["body"] = result.body
                            }
                            //console.log(params.requestId,requestId,result.body)
                            }
                        }
                    }
                    break

                }
            }catch{}
        })
        await sendCommand('Network.enable')

    })


}

listener_function["tabs_onUpdatded"] = async (tabId, changeInfo, tab) => {

    //console.log("changeInfo","Url 변경유무",changeInfo.status,changeInfo.url)
    if (debugid == -2 && !tab.url.match(url_filter) && issame_domain(tab.url)) {
        debugid = tab.id
    }

    //detect once per refreshing
    //console.log("url 변경 유무", changeInfo,changeInfo.url) 
    if (changeInfo.status == 'loading' && !tab.url.match(url_filter) && issame_domain(tab.url)) {
        //페이지 갱신시 패킷 초기화
        console.log("tab.url", tab.url);
        /*if (isdebug) {
            chrome.debugger.detach({
                tabId: tab.id
            }, null)
            //console.log("페이지 갱신",tab.title)
            await new Promise((resolve, reject) => {
                chrome.debugger.attach({
                    tabId: tab.id
                }, '1.3', result => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError)
                    } else {
                        resolve(result)
                    }
                })
            })
            console.log("tab(", tab.id, ")", tab.title, "is now debugged")
        } 
        */
        if (!isdebug) // && debugid == tab.id
        {
            debugAttach(tabId, changeInfo, tab)
        }
    }

    if (changeInfo.status == 'complete' && !tab.url.match(url_filter) && issame_domain(tab.url)) {
        
        if (init_option["document_url"] == tab.url) {
            init_option["content_port"].postMessage({
                "type": "getdomsource",
                "packet_index": init_option["document_packet_index"],
                "requestId": init_option["document_requestId"],
                "source": ""
            })

        }
    

        await setTimeout(() => {
            //console.log("완료 fetch 보내기", tab.url)
            const print_index = link_list.lastIndexOf(tab.url)
            //const print_index = link_list.IndexOf(tab.url,print_index)
            console.log("print_index", print_index)
            current_link = tab.url
            if (print_index != -1) {
                //console.log("완료되면 패킷 출력", packet[print_index]) // 현재 페이지 url 로 전송  
                const data = {}
                data[current_link] = Object.values(packet[print_index]).reduce((c, value) => {
                    c.push(value[0]);
                    return c
                }, new Array())
                console.log("완료되면 패킷 출력", data)
                console.log("api로 전송 시작")
                //await
                send_toapi.requestCommunication("http://localhost:20202/", "POST", data).then(blob => blob.json())
                    .then(res => {
                        dataPackage = res
                        attackvector_list[page_index] = res
                        if (dataPackage.length !== 0) {
                            console.log(dataPackage)
                            try{init_option["popup_port"].postMessage({
                                "type": "attackVector",
                                "data": dataPackage
                            });}catch{} // if popup is not open 
                            console.log("content_port data send");
                                    init_option["content_port"].postMessage({
                                        "type":"attackVector",
                                        "data": dataPackage
                                    });
                        }
                        console.log(res)
                        console.log("api 전송 완료")
                    })
                    .catch(error => {
                        console.log(error)
                    })

                for (var i = reset_index; i < print_index - 1; i++) {
                    packet[i] = []
                    reset_index = i
                }


            }
        }, 3000);
    } else if (changeInfo.status != 'unloaded' && !tab.url.match(url_filter) && issame_domain(tab.url)) {
        console.log(`tab(${tab.id}) ${tab.title} is not debugged`)

    }
}


listener_function["tabs_onRemoved"] = (tab_id) => {
    if (isdebug) {
        chrome.debugger.detach({
            tabId: tab_id
        }, null)
        init_option["debug_tabid"] = -1
        isdebug = false
        console.log("tab close => 디버그 분리 ok", tab_id)
    }
}



// init_option["popup_port"].postMessage("어택벡터")

//start if popup.js send start message
function init(start) {

    if (!start) {
        send_toapi = new API // api class instance generate

        debugAttach(init_option["page_tabid"], undefined, init_option["page_tab"])

        chrome.tabs.onUpdated.addListener(listener_function["tabs_onUpdatded"])

        chrome.tabs.onRemoved.addListener(listener_function["tabs_onRemoved"])

    }
}

//init()
//stop 하면 모든 정보 초기화 구현