package handler

import (
	"errors"
	"net/http"
	"strconv"

	"backend/internal/repository"
	"backend/internal/service"

	"github.com/gin-gonic/gin"
)

func (h *Handler) GetSupportTargets(c *gin.Context) {
	user, err := h.currentUserFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	targets, err := h.service.GetSupportTargets(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, targets)
}

func (h *Handler) CreateSupport(c *gin.Context) {
	user, err := h.currentUserFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	var req struct {
		ReceiverUserID int `json:"receiverUserId"`
	}
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	support, err := h.service.CreateSupport(user.ID, service.CreateSupportInput{ReceiverUserID: req.ReceiverUserID})
	if err != nil {
		switch {
		case errors.Is(err, service.ErrSupportTargetNotEligible):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		case errors.Is(err, repository.ErrUserNotFound), errors.Is(err, repository.ErrProfileNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}
	c.JSON(http.StatusCreated, support)
}

func (h *Handler) GetNotifications(c *gin.Context) {
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
	unreadOnly, err := parseOptionalBool(c.Query("unreadOnly"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "unreadOnly is invalid"})
		return
	}

	notifications, err := h.service.GetNotifications(user.ID, service.NotificationsInput{
		Limit:      limit,
		Cursor:     c.Query("cursor"),
		UnreadOnly: unreadOnly,
	})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, notifications)
}

func (h *Handler) MarkNotificationRead(c *gin.Context) {
	user, err := h.currentUserFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	notificationID, err := strconv.Atoi(c.Param("notificationId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid notification id"})
		return
	}

	notification, err := h.service.MarkNotificationRead(user.ID, notificationID)
	if err != nil {
		if errors.Is(err, repository.ErrNotificationNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, notification)
}

func parseOptionalBool(value string) (bool, error) {
	if value == "" {
		return false, nil
	}
	return strconv.ParseBool(value)
}
