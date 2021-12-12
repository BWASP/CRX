let init_option = new Object();
function init_repeater(){
    init_option = {
        "background_port": chrome.runtime.connect({name: "repeater"}),
        "packet_list": Array(),
        "packet_idx": 0,
        "packet_count": 0,
        "request_area": document.getElementById("requestTextarea"),
        "response_area": document.getElementById("responseTextarea"),
    }
    
    // init_option['request_area'].innerText = ""
    // init_option['response_area'].innerText = ""
};

function packet_decode(mode, packet) {
    console.log(packet)
    let keySet = Object.keys(packet);
    let headerSet = Array();
    let target = undefined;
    let data = "";
    console.log(keySet);
    console.log("console log End...1");

    switch (mode) {
        case "req":
            target = "request_area"
            break
        case "res":
            target = "response_area"
            break
    }

    keySet.forEach((key) => {
        console.log(key);
        console.log(packet[key]);
        console.log("console log End...2");
        if (key == "headers"){
            headerSet = Object.keys(packet[key]);
            headerSet.forEach((header) => {
                data += header + ": " + JSON.stringify(packet[key][header]) + "\r\n";
            });
        } else {
            data += key + ": " + JSON.stringify(packet[key]) + "\r\n";
        }
    });
    init_option[target].value = data;
}


init_repeater();

init_option['background_port'].onMessage.addListener(function (msg) {
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

        init_option['packet_list'] = init_option['packet_list'].concat(packetList);
        packet_decode("req",init_option['packet_list'][init_option['packet_idx']]['request'])
        packet_decode("res",init_option['packet_list'][init_option['packet_idx']]['response'])
    }
});