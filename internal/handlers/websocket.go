package handlers

import (
	"net/http"
	ws "v3/internal/websocket"
	"v3/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func WebSocketHandler(hub *ws.Hub, c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to upgrade connection"})
		return
	}

	client := &ws.Client{
		UserID: nil,
		Conn:   conn,
		Hub:    hub, 
		Send:   make(chan *models.Message, 256),
		Signal: make(chan []byte, 256),
	}

	hub.Register <- client
	go client.ReadPump()
	go client.WritePump()
}
