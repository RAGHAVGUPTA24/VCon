const socket = io("/");

const videoGrids       = document.getElementById("video-grids");
const myVideo          = document.createElement("video");
const drawer           = document.getElementById("drawer");
const chat             = document.getElementById("chat");
const participants     = document.getElementById("participants");
const participant_list = participants.querySelector("ul.participant-list");

let peer, myVideoStream, otherUsername = "";
const peers = {};

var getUserMedia =
    navigator.getUserMedia ||
    navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia;

function connectToPeerJS() {
    peer = new Peer(undefined, {
        path: "/peerjs",
        host: "/",
        port: "3030",
    });

    peer.on("open", (id) => {
        socket.emit("join-room", roomId, id, myname);
    });
    peer.on("call", (call) => {
        const peerId = call.peer;
        console.log("< Incoming call from ", peerId);
        peers[peerId] = call;

        // Answer the call with the local stream to be shared
        call.answer(myVideoStream);

        const video = document.createElement("video");
        call.on("stream", function(remoteStream) {
            console.log("< Accept stream for incoming call from", peerId);
            addVideoStream(video, remoteStream, otherUsername);
        });
        call.on("close", () => {
            video.remove();
            removeUnusedDivs();
            if(peers[peerId])
                delete peers[peerId];
        })
    });
}

document.addEventListener('DOMContentLoaded', () => {
    $("#getCodeModal").modal("show");

    // Request for the local media stream.
    getUserMedia(
        {
            video: { facingMode: "user" },
            audio: { noiseSuppression: true },
        },
        stream => {
            myVideoStream = stream;
            addVideoStream(myVideo, myVideoStream, myname);
            connectToPeerJS();
        },
        err => {
            console.error("Unable to access local media stream:", err);
        }
    );
});

// ===== Socket.io event handlers

socket.on("createMessage", (message) => {
    var ul = document.getElementById("messageadd");
    var li = document.createElement("li");
    li.className = "message";
    li.appendChild(document.createTextNode(message));
    ul.appendChild(li);
});
socket.on("AddName", (username) => {
    otherUsername = username;
    console.log(username);
});
socket.on("user-connected", (id, username) => {
    console.log("New Peer, w/ ID: " + id);
    connectToNewUser(id, username);
    socket.emit("tellName", myname);
});
socket.on("user-disconnected", (id) => {
    if (peers[id]) {
        peers[id].close();
    }
});
socket.on("participants", participants => {
    while(participant_list.lastElementChild)
        participant_list.lastElementChild.remove();
    for(const participant of participants) {
        const item = document.createElement("li");
        item.innerText = participant;
        participant_list.append(item);
    }
});

// ==== PeerJS event handlers

const connectToNewUser = (userId, myname) => {
    console.log("> Calling peer", userId);
    const call = peer.call(userId, myVideoStream);
    const video = document.createElement("video");
    call.on("stream", (userVideoStream) => {
        console.log("> Adding stream for outgoing call to", call.peer);
        addVideoStream(video, userVideoStream, myname);
    });
    call.on("close", () => {
        video.remove();
        removeUnusedDivs();
        if(peers[userId]) {
            delete peers[userId];
        }
    });
    peers[userId] = call;
};
const addVideoStream = (videoEl, stream, name) => {
    videoEl.srcObject = stream;
    videoEl.addEventListener("loadedmetadata", () => { videoEl.play(); });

    const h1 = document.createElement("h1");
    const h1name = document.createTextNode(name);
    h1.appendChild(h1name);

    const videoGrid = document.createElement("div");
    videoGrid.classList.add("video-grid");

    videoGrid.appendChild(h1);
    videoGrids.appendChild(videoGrid);
    videoGrid.append(videoEl);
    removeUnusedDivs();

    let totalUsers = document.getElementsByTagName("video").length;
    if (totalUsers > 1) {
        for (let index = 0; index < totalUsers; index++) {
            document.getElementsByTagName("video")[index].style.width =
                100 / totalUsers + "%";
        }
    }
};
const removeUnusedDivs = () => {
    alldivs = videoGrids.getElementsByTagName("div");
    for (var i = 0; i < alldivs.length; i++) {
        e = alldivs[i].getElementsByTagName("video").length;
        if (e == 0) { alldivs[i].remove(); }
    }
};

// ===== Listeners for HTML elements

const sendmessage = (text) => {
    if (event.key === "Enter" && text.value != "") {
        socket.emit("messagesend", myname + ' : ' + text.value);
        text.value = "";
        main__chat_window.scrollTop = main__chat_window.scrollHeight;
    }
};
const invitebox = () => {
    $("#getCodeModal").modal("show");
};
const cancel = () => {
    $("#getCodeModal").modal("hide");
};
const copy = async () => {
    await navigator.clipboard.writeText(window.location.href);
};

const BUTTON_TEXTS = {
    'microphone': [ 'Unmute'    , 'Mute'       ],
    'video'     : [ 'Show Video', 'Hide Video' ]
}
const toggleButton = (button) => {
    const stream = myVideoStream[(button.id == "video" ? 'getVideoTracks' : 'getAudioTracks')]?.()?.[0];
    stream.enabled = !stream.enabled;
    const icon = button.querySelector(".icon");
    const text = button.querySelector(".text");
    if(stream.enabled) {
        icon.classList.remove(`fa-${button.id}`);
        icon.classList.add(`fa-${button.id}-slash`);
    }
    else {
        icon.classList.remove(`fa-${button.id}-slash`);
        icon.classList.add(`fa-${button.id}`);
    }
    text.innerText = BUTTON_TEXTS[button.id][stream.enabled ? 1 : 0];
};

const showChat = () => {
    if(!chat.hidden && !drawer.hidden) {
        drawer.hidden = true;
    }
    else {
        if(chat.hidden) {
            participants.hidden = true;
            chat.hidden = false;
        }
        if(drawer.hidden)
            drawer.hidden = false;
    }
};
const showParticipants = () => {
    if(!participants.hidden && !drawer.hidden) {
        drawer.hidden = true;
    }
    else {
        if(participants.hidden) {
            chat.hidden = true;
            participants.hidden = false;
        }
        if(drawer.hidden)
            drawer.hidden = false;
    }
}