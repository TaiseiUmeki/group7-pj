package handler

import (
	"errors"
	"net/http"

	"backend/internal/repository"

	"github.com/gin-gonic/gin"
)

type profileRequest struct {
	Username              string  `json:"username"`
	Bio                   *string `json:"bio"`
	FocusType             *int    `json:"focusType"`
	TrainingFrequencyDays int     `json:"trainingFrequencyDays"`
}

// GetMyProfile はログイン中ユーザーのプロフィール登録状況を返します。
func (h *Handler) GetMyProfile(c *gin.Context) {
	user, err := h.currentUserFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	profile, err := h.service.GetProfile(user.ID)
	if err != nil {
		if errors.Is(err, repository.ErrProfileNotFound) {
			c.JSON(http.StatusOK, gin.H{"profileCompleted": false, "profile": nil})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"profileCompleted": true, "profile": profile})
}

// SaveMyProfile はログイン中ユーザーのプロフィールを作成または更新します。
func (h *Handler) SaveMyProfile(c *gin.Context) {
	user, err := h.currentUserFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	var req profileRequest
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	profile, err := h.service.SaveProfile(user.ID, req.Username, req.Bio, req.FocusType, req.TrainingFrequencyDays)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"profileCompleted": true, "profile": profile})
}
