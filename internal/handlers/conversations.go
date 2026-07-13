package handlers

import (
	"net/http"

	"v3/internal/repository"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type CreateDirectRequest struct {
	PartnerID string `json:"partner_id" binding:"required"` 
}

func CreateDirectConversation(
	convRepo *repository.ConversationRepository,
	userRepo *repository.UserRepository,
) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.MustGet("userID").(uuid.UUID)

		var req CreateDirectRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		
		partnerUser, err := userRepo.GetUserByEmail(c.Request.Context(), req.PartnerID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
			return
		}

		
		conv, err := convRepo.CreateConversation(
			c.Request.Context(),
			false,
			"",
			[]uuid.UUID{userID, partnerUser.ID},
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create conversation"})
			return
		}

		c.JSON(http.StatusCreated, conv)
	}
}

type CreateGroupRequest struct {
	Name    string   `json:"name" binding:"required"`
	Members []string `json:"members" binding:"required,min=1"` 
}

func CreateGroupConversation(
	convRepo *repository.ConversationRepository,
	userRepo *repository.UserRepository,
) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.MustGet("userID").(uuid.UUID)

		var req CreateGroupRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		
		var participantIDs []uuid.UUID
		participantIDs = append(participantIDs, userID) 

		for _, email := range req.Members {
			user, err := userRepo.GetUserByEmail(c.Request.Context(), email)
			if err != nil {
				c.JSON(http.StatusNotFound, gin.H{"error": "User not found: " + email})
				return
			}
			participantIDs = append(participantIDs, user.ID)
		}

		
		uniqueParticipants := removeDuplicates(participantIDs)

		conv, err := convRepo.CreateConversation(
			c.Request.Context(),
			true,
			req.Name,
			uniqueParticipants,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create group"})
			return
		}

		c.JSON(http.StatusCreated, conv)
	}
}

func GetConversations(convRepo *repository.ConversationRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.MustGet("userID").(uuid.UUID)

		convs, err := convRepo.GetUserConversations(c.Request.Context(), userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get conversations"})
			return
		}

		c.JSON(http.StatusOK, convs)
	}
}

func removeDuplicates(ids []uuid.UUID) []uuid.UUID {
	seen := make(map[uuid.UUID]bool)
	result := []uuid.UUID{}

	for _, id := range ids {
		if !seen[id] {
			seen[id] = true
			result = append(result, id)
		}
	}

	return result
}
