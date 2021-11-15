//도메인 필터링 로컬 스토리지 해서 추가
const url_filter = "chrome://|chrome-extension://"
let isdebug = false
let current_taburl = ""
//let cur_documentURL = ""
let debugid = -2
let packet = []
let page_list = new Array()
let loaderid_list = new Array()


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
}]

function push_page_list(input_page) {

}

function push_loaderid_list(input_page, input_listid) {
    if (!loaderid_list.includes(input_listid)) {
        page_list.push(input_page)
        loaderid_list.push(input_listid)
        console.log("로드아이디 리스트", loaderid_list, "페이지 리스트", page_list)
    }
}


//https://gist.github.com/tz4678/a8484b84d7c89ea5bdfeae973c0b964d
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {

    if (debugid == -2 && !tab.url.match(url_filter)) {
        debugid = tab.id
    }

    //detect once per refreshing
    //console.log("url 변경 유무", changeInfo,changeInfo.url) 
    if (changeInfo.status == 'loading' && !tab.url.match(url_filter)) {
        console.log("확인")
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
            }).catch((e)=>console.log(e));
            console.log(`tab(${tab.id})${tab.title}is now debugged`)
            isdebug = true
            debugid = tab.id
            current_taburl = tab.url

            const sendCommand = (method, params) => new Promise((resolve, reject) => {
                chrome.debugger.sendCommand({
                    tabId: tab.id
                }, method, params, result => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError)
                    } else {
                        resolve(result)
                    }
                })
            })

            chrome.debugger.sendCommand(
                { tabId: tabId }, "Debugger.enable", {}, async () =>{    
                    chrome.debugger.onEvent.addListener(async (source, method, params) => {
                    //try {
                    switch (method) {
                        case 'Network.requestWillBeSent': {
                            const {
                                requestId,
                                request
                            } = params
                            console.log("출력", requestId, "형태", typeof requestId)
                            if (!packet.hasOwnProperty(requestId)) {
                                packet[requestId] = JSON.parse(JSON.stringify(packet_form))
                            }
                            packet[requestId][0]["request"]["full_url"] = request.url
                            request_url = new URL(request.url)
                            packet[requestId][0]["request"]["url"] = request_url.pathname + request_url.search + request_url.hash
                            //console.log(params.requestId,requestId,request.url)
                            packet[requestId][0]["request"]["method"] = request.method
                            //console.log(params.requestId,requestId,request.method)
                            lower_header = request.headers
                            packet[requestId][0]["request"]["headers"] = Object.keys(request.headers).reduce((c, k) => (c[k.toLowerCase()] = request.headers[k], c), {});
                            //console.log(params.requestId,JSON.stringify(request.headers))
                            if (request.hasPostData)
                                packet[requestId][0]["request"]["body"] = request.postData
                            //console.log(params.requestId,requestId,request.postData)
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
                
                            if (packet.hasOwnProperty(requestId)) {
                                packet[requestId][0]["response"]["status_code"] = response.status
                                //console.log(params.requestId,requestId,response.status)
                                packet[requestId][0]["response"]["headers"] = Object.keys(response.headers).reduce((c, k) => (c[k.toLowerCase()] = response.headers[k], c), {});
                                //console.log(params.requestId,requestId,JSON.stringify(response.headers))

                                try{
                                const result = await sendCommand('Network.getResponseBody', {
                                    requestId
                                })
                                packet[requestId][0]["response"]["body"] = result.body 
                                //console.log(params.requestId,requestId,result.body)
                            }catch{}
                            }
                                break
                
                            }
                        }
                })
                await sendCommand('Network.enable')
            })
        }
    }

    if (changeInfo.status == 'complete' && !tab.url.match(url_filter)) {
        console.log("완료 fetch 보내기", tab.url)
        //push_page_list(tab.url)        
        //  2 면 2번쨰 => 인덱스는 1

        console.log("tab url", current_taburl)
        console.log("완료되면 패킷 출력", packet)
        packet = []
        for (let packet_url in packet) {
            if (packet_url != tab.url) {
                delete packet[packet_url]
            }
        }
    }

    else if (changeInfo.status != 'unloaded' && !tab.url.match(url_filter))
    {
        console.log(`tab(${tab.id}) ${tab.title} is not debugged`)
        //console.log("")

    }
    
})

chrome.tabs.onRemoved.addListener((tab_id) => {
    if (isdebug) {
        chrome.debugger.detach({
            tabId: tab_id
        }, null)
        isdebug = false
        console.log("tab close => 디버그 분리 ok", tab_id)
    } else
        console.log("")
});