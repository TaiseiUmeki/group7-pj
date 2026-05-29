package handler

import (
	"net/http"
	"strconv"

	"backend/internal/repository"
	"backend/internal/service"

	"github.com/gin-gonic/gin"
)

// TrainingPostRequest はトレーニング報告投稿の作成入力です。
type TrainingPostRequest struct {
	SessionID            *int    `json:"sessionId"`
	SessionIDSnake       *int    `json:"session_id"`
	DidTrain             *bool   `json:"didTrain"`
	DidTrainSnake        *bool   `json:"did_train"`
	TrainedOn            string  `json:"trainedOn"`
	TrainedOnSnake       string  `json:"trained_on"`
	StartedAt            *string `json:"startedAt"`
	StartedAtSnake       *string `json:"started_at"`
	EndedAt              *string `json:"endedAt"`
	EndedAtSnake         *string `json:"ended_at"`
	ExerciseType         *int    `json:"exerciseType"`
	ExerciseTypeSnake    *int    `json:"exercise_type"`
	DurationMinutes      *int    `json:"durationMinutes"`
	DurationMinutesSnake *int    `json:"duration_minutes"`
	Note                 *string `json:"note"`
	Visibility           string  `json:"visibility"`
}

// GetTrainingPost は投稿詳細を取得します。
func (h *Handler) GetTrainingPost(c *gin.Context) {
	user, err := h.currentUserFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	postID, err := strconv.Atoi(c.Param("postId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid post id"})
		return
	}

	post, err := h.service.GetTimelinePost(postID, user.ID)
	if err != nil {
		if err == repository.ErrTrainingPostNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, post)
}

// LikeTrainingPost は投稿にいいねを作成します。
func (h *Handler) LikeTrainingPost(c *gin.Context) {
	user, err := h.currentUserFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	postID, err := strconv.Atoi(c.Param("postId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid post id"})
		return
	}

	status, err := h.service.LikeTrainingPost(postID, user.ID)
	if err != nil {
		if err == repository.ErrTrainingPostNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, status)
}

// UnlikeTrainingPost は投稿へのいいねを解除します。
func (h *Handler) UnlikeTrainingPost(c *gin.Context) {
	user, err := h.currentUserFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	postID, err := strconv.Atoi(c.Param("postId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid post id"})
		return
	}

	status, err := h.service.UnlikeTrainingPost(postID, user.ID)
	if err != nil {
		if err == repository.ErrTrainingPostNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, status)
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
		SessionID:       pickInt(req.SessionID, req.SessionIDSnake),
		DidTrain:        pickBool(req.DidTrain, req.DidTrainSnake),
		TrainedOn:       pickString(req.TrainedOn, req.TrainedOnSnake),
		StartedAt:       pickStringPtr(req.StartedAt, req.StartedAtSnake),
		EndedAt:         pickStringPtr(req.EndedAt, req.EndedAtSnake),
		ExerciseType:    pickInt(req.ExerciseType, req.ExerciseTypeSnake),
		DurationMinutes: pickInt(req.DurationMinutes, req.DurationMinutesSnake),
		Note:            req.Note,
		Visibility:      req.Visibility,
	})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"id": post.ID})
}

func pickInt(primary, fallback *int) *int {
	if primary != nil {
		return primary
	}
	return fallback
}

func pickBool(primary, fallback *bool) *bool {
	if primary != nil {
		return primary
	}
	return fallback
}

func pickString(primary, fallback string) string {
	if primary != "" {
		return primary
	}
	return fallback
}

func pickStringPtr(primary, fallback *string) *string {
	if primary != nil {
		return primary
	}
	return fallback
}
