package handler

import (
	"net/http"
	"strconv"

	"backend/internal/service"

	"github.com/gin-gonic/gin"
)

func (h *Handler) GetTimeline(c *gin.Context) {
	user, err := h.currentUserFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	limit, err := parseOptionalInt(c.Query("limit"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "limit is invalid"})
		return
	}

	timeline, err := h.service.GetTimeline(user.ID, service.TimelineInput{
		Source: c.Query("source"),
		Limit:  limit,
		Cursor: c.Query("cursor"),
	})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, timeline)
}

func parseOptionalInt(value string) (int, error) {
	if value == "" {
		return 0, nil
	}
	return strconv.Atoi(value)
}
