package handler

import (
	"net/http"

	"backend/internal/service"

	"github.com/gin-gonic/gin"
)

// TrainingPostRequest はトレーニング報告投稿の作成入力です。
type TrainingPostRequest struct {
	SessionID       *int    `json:"sessionId"`
	DidTrain        *bool   `json:"didTrain"`
	TrainedOn       string  `json:"trainedOn"`
	StartedAt       *string `json:"startedAt"`
	EndedAt         *string `json:"endedAt"`
	ExerciseType    *int    `json:"exerciseType"`
	DurationMinutes *int    `json:"durationMinutes"`
	Note            *string `json:"note"`
	Visibility      string  `json:"visibility"`
}

// CreateTrainingPost はトレーニング報告投稿を作成します。
func (h *Handler) CreateTrainingPost(c *gin.Context) {
	user, err := h.currentUserFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	var req TrainingPostRequest
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	post, err := h.service.CreateTrainingPost(user.ID, service.TrainingPostInput{
		SessionID:       req.SessionID,
		DidTrain:        req.DidTrain,
		TrainedOn:       req.TrainedOn,
		StartedAt:       req.StartedAt,
		EndedAt:         req.EndedAt,
		ExerciseType:    req.ExerciseType,
		DurationMinutes: req.DurationMinutes,
		Note:            req.Note,
		Visibility:      req.Visibility,
	})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"id": post.ID})
}
