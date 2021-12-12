let init_option = {
    "packet_list": Array(),
    "packet_idx": 0,
    "packet_count": 0,
    "request_area": document.getElementById("requestTextarea"),
    "response_area": document.getElementById("responseTextarea"),
}
let background_port = chrome.runtime.connect({name: "repeater"})

init_option['request_area'].innerText = ""
init_option['response_area'].innerText = ""

background_port.onMessage.addListener(function (msg) {
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
        init_option['request_area'].innerText = JSON.stringify(init_option['packet_list'][init_option['packet_idx']]['request'])
        init_option['response_area'].innerText = JSON.stringify(init_option['packet_list'][init_option['packet_idx']]['response'])
    }
});