//도메인 필터링 로컬 스토리지 해서 추가
const url_filter = "chrome://|chrome-extension://"
let isdebug = false
let current_taburl = ""
//let cur_documentURL = ""
let debugid = -2
let packet = []
let page_list = new Array()
let request_list = new Array()

let page_index = -1  // integer
let loader_dict = {}
let link_list = new Array()
let sendpage_index = -1
let reset_index = 0

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

    console.log("changeInfo","Url 변경유무",changeInfo.status,changeInfo.url)
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
                            if(params.type == "Document"){

                                if(params.initiator.type == "other")
                                {
                                    ++page_index
                                    //console.log("page 번호",++page_index)
                                    link_list.push(params.documentURL)
                                }
                                if(page_index != -1)
                                {
                                    //console.log("Nope",params,params.initiator.type)//,params.type,"현재 url",params.initiator.url)
                                    loader_dict[params.loaderId] = page_index
                                    packet.push([])
                                    //packet.push([{}])
                                    //console.log("로더 딕트 입력",loader_dict)

                                }
                            }
                            //else
                              //  console.log("Yes",params,params.type,"현재 url",params.initiator.url)

                            //request_list.push(requestId)
                            //console.log("출력", requestId, "형태", typeof requestId)
                            //console.log("loader id",params,params.loaderId,loader_dict,loader_dict[params.loaderId])
                            //console.log("패킷 상태",packet)

                            if (loader_dict.hasOwnProperty(params.loaderId)){  // Document 가 오지 않았을 떄는 무시

                                if (!packet[loader_dict[params.loaderId]].hasOwnProperty(requestId)) {

                                    packet[loader_dict[params.loaderId]][requestId] = JSON.parse(JSON.stringify(packet_form))
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
                            
                            if (loader_dict.hasOwnProperty(params.loaderId)){
                                if (!packet[loader_dict[params.loaderId]].hasOwnProperty(requestId)) {
                                    packet[loader_dict[params.loaderId]][requestId][0]["response"]["status_code"] = response.status
                                    //console.log(params.requestId,requestId,response.status)
                                    packet[loader_dict[params.loaderId]][requestId][0]["response"]["headers"] = Object.keys(response.headers).reduce((c, k) => (c[k.toLowerCase()] = response.headers[k], c), {});
                                    //console.log(params.requestId,requestId,JSON.stringify(response.headers))

                                    //try{
                                    const result = await sendCommand('Network.getResponseBody', {
                                        requestId
                                    })
                                    packet[loader_dict[params.loaderId]][requestId][0]["response"]["body"] = result.body 
                                    //console.log(params.requestId,requestId,result.body)
                                //}catch{}
                                }
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
        await setTimeout(() => {
            //console.log("완료 fetch 보내기", tab.url)
            console.log("tab url", current_taburl)
            const print_index = link_list.lastIndexOf(tab.url)
            if(print_index != -1)
               {
                    //console.log("완료되면 패킷 출력", packet[print_index]) // 현재 페이지 url 로 전송
                    packet[print_index]=Object.values(packet[print_index]).reduce((c,value) => {c.push(value[0]); return c},new Array()) 
                    console.log("완료되면 패킷 출력",packet[print_index])  
                    for (var i=reset_index ;i<print_index-1;i++)
                    {
                        packet[i] = []
                        reset_index = i
                    }
                    
               } 
        }, 3000);
    }

    else if (changeInfo.status != 'unloaded' && !tab.url.match(url_filter))
    {
        console.log(`tab(${tab.id}) ${tab.title} is not debugged`)

    }

    else if (changeInfo.status != 'unloaded' && !tab.url.match(url_filter))
    {
        console.log(`tab(${tab.id}) ${tab.title} is not debugged`)

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