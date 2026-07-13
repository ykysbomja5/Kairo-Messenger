package handlers

import (
	"log"
	"net/http"
	"time"

	"v3/internal/repository"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type AuthRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

func Register(userRepo *repository.UserRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req AuthRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			log.Printf("Bind error: %v", err)
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		existingUser, err := userRepo.GetUserByEmail(c.Request.Context(), req.Email)
		if err == nil && existingUser != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "User with this email already exists"})
			return
		}

		user, err := userRepo.CreateUser(c.Request.Context(), req.Email, req.Password, req.Email)
		if err != nil {
			log.Printf("CreateUser error: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
			return
		}

		c.JSON(http.StatusCreated, gin.H{
			"id":    user.ID,
			"email": user.Email,
			"name":  user.Name,
		})
	}
}

func Login(userRepo *repository.UserRepository, jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req AuthRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		user, err := userRepo.GetUserByEmail(c.Request.Context(), req.Email)
		if err != nil {
			log.Printf("User not found: %s, error: %v", req.Email, err)
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
			return
		}

		
		log.Printf("Comparing password for user: %s", user.Email)
		log.Printf("Stored hash: %s", user.Password)
		log.Printf("Input password: %s", req.Password)

		if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
			log.Printf("Password mismatch: %v", err)
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
			return
		}

		token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
			"user_id": user.ID.String(),
			"exp":     time.Now().Add(24 * time.Hour).Unix(),
		})

		tokenString, err := token.SignedString([]byte(jwtSecret))
		if err != nil {
			log.Printf("Token signing error: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"token": tokenString,
			"user": gin.H{
				"id":    user.ID,
				"email": user.Email,
				"name":  user.Name,
			},
		})
	}
}
