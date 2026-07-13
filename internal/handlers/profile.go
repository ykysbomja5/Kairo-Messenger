package handlers

import (
	"encoding/base64"
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"v3/internal/repository"
	"v3/internal/storage"
)

type updateProfileRequest struct {
	Name   string `json:"name"`
	Avatar string `json:"avatar"` 
}

func normalizeUploadPath(p string) string {
	
	if p == "" {
		return ""
	}
	
	if strings.HasPrefix(p, "http://") || strings.HasPrefix(p, "https://") {
		
		if idx := strings.Index(p, "/uploads/"); idx >= 0 {
			p = p[idx:]
		}
	}
	if strings.HasPrefix(p, "/uploads/") {
		return p
	}
	if strings.HasPrefix(p, "uploads/") {
		return "/" + p
	}
	
	if !strings.Contains(p, "/") {
		return "/uploads/" + p
	}
	return p
}

func GetProfile(userRepo *repository.UserRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		val, ok := c.Get("userID")
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}
		userID, ok := val.(uuid.UUID)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user"})
			return
		}

		user, err := userRepo.GetUserByID(c.Request.Context(), userID)
		if err != nil || user == nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load profile"})
			return
		}

		avatar := normalizeUploadPath(user.AvatarURL)
		c.JSON(http.StatusOK, gin.H{
			"id":         user.ID,
			"email":      user.Email,
			"name":       user.Name,
			"created_at": user.CreatedAt,
			"last_seen":  user.LastSeen,
			
			"avatar_url": avatar,
			"avatar":     avatar,
		})
	}
}

func parseDataURL(dataURL string) (contentType string, raw []byte, err error) {
	if !strings.HasPrefix(dataURL, "data:") {
		return "", nil, errors.New("not a data URL")
	}
	comma := strings.IndexByte(dataURL, ',')
	if comma < 0 {
		return "", nil, errors.New("malformed data URL")
	}
	header := dataURL[5:comma] 
	
	if !strings.Contains(header, ";base64") {
		return "", nil, errors.New("data URL must be base64-encoded")
	}
	semi := strings.Index(header, ";")
	if semi > 0 {
		contentType = header[:semi]
	} else {
		contentType = header
	}
	enc := dataURL[comma+1:]
	dec, derr := base64.StdEncoding.DecodeString(enc)
	if derr != nil {
		return "", nil, derr
	}
	return contentType, dec, nil
}

func UpdateProfile(userRepo *repository.UserRepository, fs storage.FileStorage) gin.HandlerFunc {
	return func(c *gin.Context) {
		val, ok := c.Get("userID")
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}
		userID, ok := val.(uuid.UUID)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user"})
			return
		}

		var req updateProfileRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON"})
			return
		}

		
		user, err := userRepo.GetUserByID(c.Request.Context(), userID)
		if err != nil || user == nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load user"})
			return
		}

		newName := user.Name
		if strings.TrimSpace(req.Name) != "" {
			newName = strings.TrimSpace(req.Name)
		}

		newAvatar := user.AvatarURL
		if strings.TrimSpace(req.Avatar) != "" {
			if strings.HasPrefix(req.Avatar, "data:") {
				ct, bytes, derr := parseDataURL(req.Avatar)
				if derr != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid avatar data"})
					return
				}
				publicURL, uerr := fs.Upload(c.Request.Context(), bytes, ct)
				if uerr != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to store avatar"})
					return
				}
				newAvatar = strings.TrimPrefix(publicURL, "//") 
				
				newAvatar = normalizeUploadPath(newAvatar)
			} else {
				
				newAvatar = normalizeUploadPath(req.Avatar)
			}
		}

		if err := userRepo.UpdateUser(c.Request.Context(), userID, newName, newAvatar); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update profile"})
			return
		}

		
		c.JSON(http.StatusOK, gin.H{
			"status":     "ok",
			"avatar_url": newAvatar,
			"avatar":     normalizeUploadPath(newAvatar),
			"name":       newName,
		})
	}
}
