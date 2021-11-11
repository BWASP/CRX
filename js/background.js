//도메인 필터링 로컬 스토리지 해서 추가
const url_filter = "chrome://|chrome-extension://"
let isdebug = false
let debugid = -2
let packet = []
const packet_form = [
    { "request" : { 
           "method" : "", 
           "url" : "", 
           "headers" : {},
           "body" : "",
           "full_url" : "" 
       },
    "response" : {
           "headers" : {}, 
           "body" : "",
           "status_code" : ""
       }
   }]
   

//https://gist.github.com/tz4678/a8484b84d7c89ea5bdfeae973c0b964d
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {

    if (debugid == -2 && !tab.url.match(url_filter))
    {
        debugid = tab.id
    }
    //detect once per refreshing
    
    if (changeInfo.status == 'loading' && debugid == tab.id && !tab.url.match(url_filter)){
        //페이지 갱신시 패킷 초기화
        console.log("초기화 전 패킷 출력",packet)
        packet = []
        if(isdebug){
            chrome.debugger.detach({ tabId: tab.id }, null)
            //console.log("페이지 갱신",tab.title)
            await new Promise((resolve, reject) => {
            chrome.debugger.attach({ tabId: tab.id }, '1.3', result => {
                if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError)
                } else {
                resolve(result)
                }
            })
        })
        console.log("tab(",tab.id,")",tab.title,"is now debugged")
        }
    }
    if (changeInfo.status == 'complete' && debugid == tab.id && !tab.url.match(url_filter)){
        if(!isdebug){
            console.log("tab(",tab.id,")",tab.title,"디버그 부착")
        await new Promise((resolve, reject) => {
        chrome.debugger.attach({ tabId: tab.id }, '1.3', result => {
            if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError)
            } else {
            resolve(result)
            }
        })
        })
        console.log("tab(",tab.id,")",tab.title,"is now debugged")
        isdebug = true
        debugid = tab.id
    }
        const sendCommand = (method, params) => new Promise((resolve, reject) => {
        chrome.debugger.sendCommand({ tabId: tab.id }, method, params, result => {
            if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError)
            } else {
            resolve(result)
            }
        })
        })
        
        chrome.debugger.onEvent.addListener(async (source, method, params) => {
        try {
        switch (method) {
            case 'Network.requestWillBeSent': {
            const { requestId,request} = params
            if(!packet.hasOwnProperty(requestId))
            packet[requestId] = JSON.parse(JSON.stringify(packet_form));
            packet[requestId][0]["request"]["full_url"] = request.url
            request_url = new URL(request.url)
            packet[requestId][0]["request"]["url"] = request_url.pathname+request_url.search+request_url.hash
            //console.log(params.requestId,requestId,request.url)
            packet[requestId][0]["request"]["method"] = request.method
            //console.log(params.requestId,requestId,request.method)
            lower_header = request.headers
            packet[requestId][0]["request"]["headers"] = Object.keys(request.headers).reduce((c, k) => (c[k.toLowerCase()] = request.headers[k], c), {});
            //console.log(params.requestId,JSON.stringify(request.headers))
            if(request.hasPostData)
            packet[requestId][0]["request"]["body"]=request.postData
                //console.log(params.requestId,requestId,request.postData)
            break
            }
            case 'Network.responseReceived': {
            const { requestId, response } = params
            // if exists request 
            if(packet.hasOwnProperty(requestId)) 
            {
                packet[requestId][0]["response"]["status_code"] = response.status
                //console.log(params.requestId,requestId,response.status)
                packet[requestId][0]["response"]["headers"] = Object.keys(response.headers).reduce((c, k) => (c[k.toLowerCase()] = response.headers[k], c), {});
                //console.log(params.requestId,requestId,JSON.stringify(response.headers))
                const result = await sendCommand('Network.getResponseBody', { requestId })
                packet[requestId][0]["response"]["body"] = result.body
                //console.log(params.requestId,requestId,result.body)
                break

            }
            }
        }} catch (e){ /*console.log("error",e)*/}
        })
        await sendCommand('Network.enable')
        
    }
    else if(changeInfo.status != 'unloaded' && !tab.url.match(url_filter))
        console.log("tab(",tab.id,")",tab.title,"is not debugged")
})

chrome.tabs.onRemoved.addListener((tab_id) => {
     if(isdebug) {
         chrome.debugger.detach({ tabId: tab_id }, null)
         isdebug = false
        console.log("tab close => 디버그 분리 ok",tab_id)}
    else 
        console.log("")
     });
