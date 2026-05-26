package handler

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"backend/internal/model"
	"errors"
	"backend/internal/repository"
	"backend/internal/service"

	"github.com/gin-gonic/gin"
)

// WorkoutRecordRequest は運動記録の作成・更新入力です。
type WorkoutRecordRequest struct {
	RecordType      string    `json:"record_type"`
	ExerciseType    string    `json:"exercise_type"`
	StartTime       time.Time `json:"start_time"`
	DurationMinutes int       `json:"duration_minutes"`
}

// ListWorkoutRecords はログイン中ユーザーの運動記録一覧を返します。
func (h *Handler) ListWorkoutRecords(c *gin.Context) {
	user, err := h.currentUserFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	records, err := h.service.GetWorkoutRecords(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, records)
}

// GetWorkoutRecord はログイン中ユーザーの運動記録を1件返します。
func (h *Handler) GetWorkoutRecord(c *gin.Context) {
	user, err := h.currentUserFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	idStr := c.Param("id")
	if idStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id parameter is required"})
		return
	}
	recordID, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id parameter"})
		return
	}

	record, err := h.service.GetWorkoutRecord(user.ID, recordID)
	if err != nil {
		if err == repository.ErrWorkoutRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, record)
}

// CreateWorkoutRecord は運動記録を作成します。
func (h *Handler) CreateWorkoutRecord(c *gin.Context) {
	user, err := h.currentUserFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	var req WorkoutRecordRequest
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	record, err := h.service.CreateWorkoutRecord(user.ID, service.WorkoutRecordInput{
		RecordType:      req.RecordType,
		ExerciseType:    req.ExerciseType,
		StartTime:       req.StartTime,
		DurationMinutes: req.DurationMinutes,
	})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, record)
}

// UpdateWorkoutRecord は運動記録を更新します。
func (h *Handler) UpdateWorkoutRecord(c *gin.Context) {
	user, err := h.currentUserFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	idStr := c.Param("id")
	if idStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id parameter is required"})
		return
	}
	recordID, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id parameter"})
		return
	}

	var req WorkoutRecordRequest
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	record, err := h.service.UpdateWorkoutRecord(user.ID, recordID, service.WorkoutRecordInput{
		RecordType:      req.RecordType,
		ExerciseType:    req.ExerciseType,
		StartTime:       req.StartTime,
		DurationMinutes: req.DurationMinutes,
	})
	if err != nil {
		if err == repository.ErrWorkoutRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, record)
}

// GetLatestWorkoutRecord returns the latest workout record for the user (by start_time)
func (h *Handler) GetLatestWorkoutRecord(c *gin.Context) {
	user, err := h.currentUserFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	records, err := h.service.GetWorkoutRecords(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if len(records) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "no workout records found"})
		return
	}
	c.JSON(http.StatusOK, records[0])
}

func (h *Handler) currentUserFromContext(c *gin.Context) (*model.User, error) {
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		return nil, errors.New("authorization header is required")
	}

	tokenString := strings.TrimPrefix(authHeader, "Bearer ")
	if tokenString == authHeader {
		return nil, errors.New("bearer token is required")
	}

	return h.service.GetCurrentUser(tokenString)
}