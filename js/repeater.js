
class Repeater {
    constructor() {
        this.init_option = {
            "background_port": chrome.runtime.connect({name: "repeater"}),
            "packet_list": Array(),
            "packet_idx": 0,
            "packet_count": 0,
            "request_area": document.getElementById("requestTextarea"),
            "response_area": document.getElementById("responseTextarea"),
            "send_button": document.getElementById("repeater-send"),
            "xhr": new XMLHttpRequest(),
        }
    }

    header_parse(packet) {
        let headerSet = Object.keys(packet["headers"]);
        let data = "";
        headerSet.forEach((header) => {
            // console.log('headers: ', packet['headers'][header]);
            if(packet["headers"][header])
            {
                data += header + ": " + packet["headers"][header].toString() + "\r\n";
            }
        });
        return data;
    }
    
    packet_stringify(mode, packet) {
        let data = "";
    
        switch (mode) {
            case "req":
                data += packet['method'] + " " + packet['url'] + " " + "HTTP/1.1" + "\r\n";
                data += "Host: " + packet["full_url"] + "\r\n";
                data += this.header_parse(packet);
                data += "\r\n" + packet["body"];
                break
    
            case "res":
                // console.log("response status: ", packet);
                data += packet['protocol'] + " " + packet["status_code"] + " " + packet["status_text"] + "\r\n"
                data += this.header_parse(packet);
                data += "\r\n" + packet["body"];
                break
        }
    
        return data;
    }

    packet_parse(packet) {
        let host_url = "https://webhacking.kr/";

        // preprocessing(전처리과정) => 패킷을 라인별로 배열에 저장
        packet = packet.replace('\r\n','\n');
        let body = packet.split('\n\n')[1];
        packet = packet.split('\n\n')[0];
        let packet_per_line = packet.split('\n');
        // console.log("packet per lines: ", packet_per_line);
        
        // first line: Method Path Protocol/Version
        let first_line = packet_per_line[0].split(' ');
        packet_per_line.shift();
        // console.log("first_line: ", first_line);
        
        // 헤더 정보 파싱 후 JSON 형태로 변환
        let headers = new Object();
        packet_per_line.forEach((header_line) => {
            if (header_line == "") return false;
            headers[header_line.split(": ")[0]] = header_line.split(": ")[1];
            packet_per_line.shift();
        });
        // console.log("headers: ", headers);

        // 바디 정보 가져오기
        try {
            body = JSON.stringify(JSON.parse(body))
        } catch {
            let form_data = new Object(); 
            body.split('&').forEach((param) => {
                if (param == "") return false;
                form_data[param.split('=')[0]] = param.split('=')[1];
            });
            body = JSON.stringify(form_data);
        }
        // console.log("body: ", body);

        this.send_request_packet(first_line[0], new URL(first_line[1], host_url).href, headers, body);
    }

    send_request_packet(method, url, headers, body){
        this.init_option['xhr'].open(method, url);

        // XMLHTTPRequest header 설정
        let headers_key = Object.keys(headers)
        headers_key.forEach((key) => {
            try {
                this.init_option['xhr'].setRequestHeader(key, headers[key]);
            } catch {
                
            }
            // console.log('xhr headers: ', key, headers[key]);
        });

        var _this = this

        this.init_option['xhr'].onreadystatechange = function (event) { 
            let { target } = event; 
            if (target.readyState === XMLHttpRequest.DONE) { 
                let { status, statusText } = target;
                if (status === 0 || (status >= 200 && status < 400)) { 
                    // 요청이 정상적으로 처리 된 경우 
                    // console.log("요청이 정상적으로 처리된 경우");

                    let res_headers = _this.init_option['xhr'].getAllResponseHeaders();
                    res_headers = res_headers.split('\r\n').reduce(function (data, eachline){data[eachline.split(': ')[0]] = eachline.split(': ')[1];return data;}, {});
                    console.log("response: ", target.response)
                    _this.init_option['packet_list'][_this.init_option['packet_idx']]['response']['status_code']=status
                    _this.init_option['packet_list'][_this.init_option['packet_idx']]['response']['status_text'] = statusText
                    _this.init_option['packet_list'][_this.init_option['packet_idx']]['response']['body']=target.response
                    _this.init_option['packet_list'][_this.init_option['packet_idx']]['response']['headers']= res_headers
                    
                    //protocol은 원본 유지(xmlhttp에서 기능 없음)

                
                    
                    _this.init_option['response_area'].value = _this.packet_stringify("res",_this.init_option['packet_list'][_this.init_option['packet_idx']]['response'])

                } else { 
                    // 에러가 발생한 경우 
                    // console.log("에러가 발생한 경우");
                } 
            } 
        };
        this.init_option['xhr'].send(body);
        // console.log("Sent Request Packet Successfully!!!");
    }
}

let repeater = new Repeater();

repeater.init_option['background_port'].onMessage.addListener(function (msg) {
    if (msg.type == "RequestPackets") {
        // console.log("Received Request Packets Successfully!")
        
        let packetList = Array();
        let dataSet = msg.data;
        let urlSet = Object.keys(dataSet);

        urlSet.forEach((url) => {
            dataSet[url].forEach((packet) => {
                packetList.push(packet);
            });
        });

        repeater.init_option['packet_list'] = repeater.init_option['packet_list'].concat(packetList);
        repeater.init_option['request_area'].value = repeater.packet_stringify("req",repeater.init_option['packet_list'][repeater.init_option['packet_idx']]['request'])
        repeater.init_option['response_area'].value = repeater.packet_stringify("res",repeater.init_option['packet_list'][repeater.init_option['packet_idx']]['response'])
    }
});

repeater.init_option['send_button'].addEventListener('click', function() {
    repeater.packet_parse(repeater.init_option['request_area'].value);
});