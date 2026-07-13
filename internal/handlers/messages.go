package handlers

import (
	"encoding/base64"
	"net/http"
	"strings"
	"strconv"
	"v3/internal/models"

	"v3/internal/repository"
	"v3/internal/storage"
	websocket "v3/internal/websocket"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type SendMessageRequest struct {
	ConversationID uuid.UUID          `json:"conversation_id" binding:"required"`
	Type           models.MessageType `json:"type" binding:"required"`
	Content        string             `json:"content" binding:"required"`
}

func SendMessage(
	msgRepo *repository.MessageRepository,
	convRepo *repository.ConversationRepository,
	storage storage.FileStorage,
	hub *websocket.Hub,
) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.MustGet("userID").(uuid.UUID)

		var req SendMessageRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		
		isParticipant, err := convRepo.IsParticipant(c.Request.Context(), req.ConversationID, userID)
		if err != nil || !isParticipant {
			c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
			return
		}

		
		
		if req.Type != models.TextMessage {
			// Extract base64 payload
			var rawData []byte = []byte(req.Content)
			if strings.HasPrefix(req.Content, "data:") {
				idx := strings.Index(req.Content, "base64,")
				if idx != -1 {
					decoded, err := base64.StdEncoding.DecodeString(req.Content[idx+7:])
					if err == nil {
						rawData = decoded
					}
				}
			}

			uploadPath, err := storage.Upload(c, rawData, string(req.Type))
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to upload file"})
				return
			}
			req.Content = uploadPath
		}


		msg, err := msgRepo.CreateMessage(
			c.Request.Context(),
			req.ConversationID,
			userID,
			req.Type,
			req.Content,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send message"})
			return
		}

		
		hub.Broadcast <- websocket.MessageEvent{
			ConversationID: req.ConversationID,
			Message:        msg,
		}

		c.JSON(http.StatusCreated, msg)
	}
}

func GetMessages(
	msgRepo *repository.MessageRepository,
	convRepo *repository.ConversationRepository,
) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.MustGet("userID").(uuid.UUID)
		convID := uuid.MustParse(c.Query("conversation_id"))
		limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
		offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

		
		isParticipant, err := convRepo.IsParticipant(c.Request.Context(), convID, userID)
		if err != nil || !isParticipant {
			c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
			return
		}

		messages, err := msgRepo.GetMessages(c.Request.Context(), convID, limit, offset)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get messages"})
			return
		}

		c.JSON(http.StatusOK, messages)
	}
}
