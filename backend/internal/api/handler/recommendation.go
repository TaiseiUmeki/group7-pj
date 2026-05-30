package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func (h *Handler) GetRecommendations(c *gin.Context) {
	user, err := h.currentUserFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	recommendations, err := h.service.GetRecommendations(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, recommendations)
}
