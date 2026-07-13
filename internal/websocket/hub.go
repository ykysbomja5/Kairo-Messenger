package websocket

import (
	"context"
	"encoding/json"
	"log"
	"strings"
	"time"
	"v3/internal/models"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

type ConversationRepository interface {
	IsParticipant(userID, conversationID uuid.UUID) bool
}

type MessageEvent struct {
	ConversationID uuid.UUID
	Message        *models.Message
}

type Client struct {
	UserID *uuid.UUID 
	Conn   *websocket.Conn
	Hub    *Hub
	Send   chan *models.Message
	Signal chan []byte 
}

type Hub struct {
	Clients          map[uuid.UUID]*Client
	Register         chan *Client
	Unregister       chan *Client
	Broadcast        chan MessageEvent
	conversationRepo ConversationRepository
	messageRepo interface{
		MarkMessagesAsRead(ctx context.Context, conversationID, readerID uuid.UUID) error
		EditMessage(ctx context.Context, messageID, senderID uuid.UUID, newContent string) error
	}
	jwtSecret        string
}

func NewHub(jwtSecret string, conversationRepo ConversationRepository,
	messageRepo interface{
		MarkMessagesAsRead(ctx context.Context, conversationID, readerID uuid.UUID) error
		EditMessage(ctx context.Context, messageID, senderID uuid.UUID, newContent string) error
	}) *Hub {
	return &Hub{
		Clients:          make(map[uuid.UUID]*Client),
		Register:         make(chan *Client),
		Unregister:       make(chan *Client),
		Broadcast:        make(chan MessageEvent),
		conversationRepo: conversationRepo,
		messageRepo: messageRepo,
		jwtSecret:        jwtSecret,
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Register:
			if client.UserID != nil {
				h.Clients[*client.UserID] = client
				log.Printf("Client registered: %s", *client.UserID)
			}
		case client := <-h.Unregister:
			if client.UserID != nil {
				if c, ok := h.Clients[*client.UserID]; ok {
					delete(h.Clients, *client.UserID)
					log.Printf("Client unregistered: %s", *client.UserID)
					
					if c.Send != nil {
						close(c.Send)
					}
					if err := c.Conn.Close(); err != nil {
						log.Printf("Error closing connection: %v", err)
					}
				}
			}
		case event := <-h.Broadcast:
			for _, client := range h.Clients {
				if client.IsParticipant(event.ConversationID) {
					select {
					case client.Send <- event.Message:
					default:
						h.Unregister <- client
					}
				}
			}
		}
	}
}

func (c *Client) ReadPump() {
	defer func() {
		c.Hub.Unregister <- c
		c.Conn.Close()
	}()

	c.Conn.SetReadLimit(1 << 20) 
	c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, message, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}

		var msg struct {
			Type           string             `json:"type"`
			Token          string             `json:"token,omitempty"`
			ConversationID uuid.UUID          `json:"conversation_id,omitempty"`
			Content        string             `json:"content,omitempty"`
			MessageType    models.MessageType `json:"message_type,omitempty"`
		}
		if err := json.Unmarshal(message, &msg); err != nil {
			log.Printf("Error parsing message: %v", err)
			continue
		}

		switch msg.Type {
		case "auth":
			tokenString := strings.TrimPrefix(msg.Token, "Bearer ")
			token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
				return []byte(c.Hub.jwtSecret), nil 
			})
			if err != nil || !token.Valid {
				c.Conn.WriteJSON(map[string]string{"type": "error", "message": "Invalid token"})
				continue
			}
			claims, ok := token.Claims.(jwt.MapClaims)
			if !ok {
				c.Conn.WriteJSON(map[string]string{"type": "error", "message": "Invalid token claims"})
				continue
			}
			userIDStr, ok := claims["user_id"].(string)
			if !ok {
				c.Conn.WriteJSON(map[string]string{"type": "error", "message": "User ID not found"})
				continue
			}
			userID, err := uuid.Parse(userIDStr)
			if err != nil {
				c.Conn.WriteJSON(map[string]string{"type": "error", "message": "Invalid user ID"})
				continue
			}
			c.UserID = &userID
			c.Hub.Register <- c
			c.Conn.WriteJSON(map[string]interface{}{"type": "connection", "userId": userID.String()})
		
case "edit_message":
    if c.UserID == nil { continue }
    var raw map[string]interface{}
    if err := json.Unmarshal(message, &raw); err != nil { continue }
    msgIDStr, _ := raw["messageId"].(string)
    chatIDStr, _ := raw["chatId"].(string)
    newContent, _ := raw["newContent"].(string)
    
    msgID, err1 := uuid.Parse(msgIDStr)
    convID, err2 := uuid.Parse(chatIDStr)
    if err1 != nil || err2 != nil { continue }

    if c.Hub.messageRepo != nil {
        err := c.Hub.messageRepo.EditMessage(context.Background(), msgID, *c.UserID, newContent)
        if err != nil { log.Printf("Error editing message: %v", err); continue }
    }

    out := map[string]interface{}{
        "type": "edit_message",
        "chatId": convID,
        "messageId": msgID,
        "newContent": newContent,
    }
    
    for _, cl := range c.Hub.Clients {
        if cl.IsParticipant(convID) {
            b, _ := json.Marshal(out)
            select {
            case cl.Signal <- b:
            default:
            }
        }
    }

		case "call", "call_response", "webrtc", "typing", "read":
    if c.UserID == nil {
        c.Conn.WriteJSON(map[string]string{"type": "error", "message": "Not authenticated"})
        continue
    }
    var raw map[string]interface{}
    if err := json.Unmarshal(message, &raw); err != nil {
        log.Printf("Error parsing signaling: %v", err)
        continue
    }
    chatIDStr, _ := raw["chatId"].(string)
    convID, err := uuid.Parse(chatIDStr)
    if err != nil {
        c.Conn.WriteJSON(map[string]string{"type": "error", "message": "Invalid chatId"})
        continue
    }
    
    if msg.Type == "read" && c.Hub.messageRepo != nil {
        err = c.Hub.messageRepo.MarkMessagesAsRead(context.Background(), convID, *c.UserID)
        if err != nil {
            log.Printf("Error marking messages as read: %v", err)
        }
    }

    out := map[string]interface{}{
        "type":   raw["type"],
        "action": raw["action"],
        "media":  raw["media"],
        "chatId": convID,
        "senderId": c.UserID.String(),
    }
if v, ok := raw["fromName"]; ok { out["fromName"] = v }
    if v, ok := raw["fromAvatar"]; ok { out["fromAvatar"] = v }
    if v, ok := raw["sdp"]; ok { out["sdp"] = v }
    if v, ok := raw["candidate"]; ok { out["candidate"] = v }
    if v, ok := raw["label"]; ok { out["label"] = v }
    if v, ok := raw["id"]; ok { out["id"] = v }
    
    log.Printf("WS signaling: %v action=%v chat=%s from=%s", out["type"], out["action"], convID, c.UserID.String())
    for _, cl := range c.Hub.Clients {
        if *cl.UserID == *c.UserID { continue }
        if cl.IsParticipant(convID) {
            b, err := json.Marshal(out)
            if err != nil { continue }
            select {
            case cl.Signal <- b:
            default:
                
            }
        }
    }
case "message":
			if c.UserID == nil {
				c.Conn.WriteJSON(map[string]string{"type": "error", "message": "Not authenticated"})
				continue
			}
			
			
			
			
		}
	}
}

func (c *Client) WritePump() {
	ticker := time.NewTicker(30 * time.Second)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case raw, ok := <-c.Signal:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.Conn.WriteMessage(websocket.TextMessage, raw); err != nil {
				return
			}
		case message, ok := <-c.Send:
			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			out := map[string]interface{}{
				"type": "message",
				"id": message.ID,
				"chatId": message.ConversationID,
				"senderId": message.SenderID,
				"text": message.Content,
				"time": message.CreatedAt,
				"is_edited": message.IsEdited,
				"msgType": message.Type,
			}
			if err := c.Conn.WriteJSON(out); err != nil {
				return
			}
		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (c *Client) IsParticipant(conversationID uuid.UUID) bool {
	if c == nil || c.Hub == nil || c.Hub.conversationRepo == nil || c.UserID == nil {
		return false
	}
	return c.Hub.conversationRepo.IsParticipant(*c.UserID, conversationID)
}
