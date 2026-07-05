package http

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/plant-disease-detection/core-service/internal/auth"
)

func AuthMiddleware(jwtService auth.JWTService) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		var tokenString string

		if authHeader == "" {
			// Fallback to query parameter for WebSockets or simple GET links
			tokenString = c.Query("token")
			if tokenString == "" {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header or token query parameter is missing"})
				c.Abort()
				return
			}
		} else {
			parts := strings.Split(authHeader, " ")
			if len(parts) != 2 || parts[0] != "Bearer" {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header format must be Bearer <token>"})
				c.Abort()
				return
			}
			tokenString = parts[1]
		}

		userID, err := jwtService.ValidateToken(tokenString)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired authentication token"})
			c.Abort()
			return
		}

		// Save user ID to Gin context
		c.Set("userID", userID)
		c.Next()
	}
}
