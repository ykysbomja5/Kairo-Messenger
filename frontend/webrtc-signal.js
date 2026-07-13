
(function () {
  "use strict";

  
  function __getWS() {
    try {
      return (
        window.ws ||
        window.socket ||
        window.chatSocket ||
        window.appSocket ||
        window.__ws ||
        null
      );
    } catch (e) {
      return null;
    }
  }

  
  var __webrtcSendQueue = [];

  function __rawSend(ws, payload) {
    
    if (ws && typeof ws.send === "function") {
      ws.send(payload);
      return;
    }
    
    if (ws && typeof ws.emit === "function") {
      
      ws.emit("message", payload);
      return;
    }
    console.error("[webrtc-signal] No supported send method on socket instance");
  }

  function sendMessageViaSocket(message) {
    var ws = __getWS();
    if (!ws) {
      console.error("[webrtc-signal] WebSocket instance not found. Expose it globally as window.ws");
      return;
    }

    var payload = (typeof message === "string") ? message : JSON.stringify(message);

    
    if (typeof ws.readyState === "undefined" && typeof ws.emit === "function") {
      if (ws.connected === false) {
        
        __webrtcSendQueue.push(payload);
        var onceConnected = function () {
          ws.off && ws.off("connect", onceConnected);
          try {
            var q = __webrtcSendQueue.splice(0);
            for (var i = 0; i < q.length; i++) __rawSend(ws, q[i]);
          } catch (e) {}
        };
        ws.on && ws.on("connect", onceConnected);
        return;
      }
      __rawSend(ws, payload);
      return;
    }

    
    switch (ws.readyState) {
      case WebSocket.OPEN:
        __rawSend(ws, payload);
        break;
      case WebSocket.CONNECTING:
        __webrtcSendQueue.push(payload);
        var flushOnce = function () {
          try {
            ws.removeEventListener && ws.removeEventListener("open", flushOnce);
          } catch (e) {}
          var q = __webrtcSendQueue.splice(0);
          for (var i = 0; i < q.length; i++) __rawSend(ws, q[i]);
        };
        ws.addEventListener && ws.addEventListener("open", flushOnce, { once: true });
        break;
      default:
        console.warn("[webrtc-signal] Socket not OPEN (state:", ws.readyState, "). Dropping message:", payload);
    }
  }

  
  if (!window.sendMessageViaSocket) {
    window.sendMessageViaSocket = sendMessageViaSocket;
  }
  
  
  

  console.log("[webrtc-signal] Ready. Using", __getWS() ? "existing socket instance" : "no socket (yet)");
})();
