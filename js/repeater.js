
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
        }
    }

    header_parse(packet) {
        let headerSet = Object.keys(packet["headers"]);
        let data = "";
        headerSet.forEach((header) => {
            data += header + ": " + JSON.stringify(packet["headers"][header]) + "\r\n";
        });
        return data;
    }
    
    packet_parse(mode, packet) {
        let data = "";
    
        switch (mode) {
            case "req":
                data += packet['method'] + " " + packet['url'] + " " + "HTTP/1.1" + "\r\n";
                data += "Host: " + packet["full_url"] + "\r\n";
                data += this.header_parse(packet);
                data += "\r\n" + packet["body"];
                break
    
                case "res":
                console.log("response status: ", packet);
                data += packet['protocol'] + " " + packet["status"] + " " + packet["statusText"] + "\r\n"
                data += this.header_parse(packet);
                data += "\r\n" + packet["body"];
                break
            }
    
            return data;
        }
}

let repeater = new Repeater();

repeater.init_option['background_port'].onMessage.addListener(function (msg) {
    if (msg.type == "RequestPackets") {
        console.log("Received Request Packets Successfully!")
        
        let packetList = Array();
        let dataSet = msg.data;
        let urlSet = Object.keys(dataSet);

        urlSet.forEach((url) => {
            dataSet[url].forEach((packet) => {
                packetList.push(packet);
            });
        });

        repeater.init_option['packet_list'] = repeater.init_option['packet_list'].concat(packetList);
        repeater.init_option['request_area'].value = repeater.packet_parse("req",repeater.init_option['packet_list'][repeater.init_option['packet_idx']]['request'])
        repeater.init_option['response_area'].value = repeater.packet_parse("res",repeater.init_option['packet_list'][repeater.init_option['packet_idx']]['response'])
    }
});