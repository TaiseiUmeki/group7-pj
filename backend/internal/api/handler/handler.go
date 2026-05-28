package handler

import (
	"net/http"
	"strconv"
	"strings"

	"backend/internal/service"

	"github.com/gin-gonic/gin"
)

// Handler はHTTPハンドラーを扱う構造体です
type Handler struct {
	service *service.Service
}

// NewHandler はハンドラーを初期化します
func NewHandler(svc *service.Service) *Handler {
	return &Handler{
		service: svc,
	}
}

// HealthCheck はサーバーのヘルスチェックを行います
func (h *Handler) HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, map[string]string{"status": "ok"})
}

// GetAllUsers はすべてのユーザー情報を取得します
func (h *Handler) GetAllUsers(c *gin.Context) {
	users, err := h.service.GetAllUsers()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, users)
}

// GetUser はIDからユーザー情報を取得します
func (h *Handler) GetUser(c *gin.Context) {
	idStr := c.Query("id")
	if idStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id parameter is required"})
		return
	}
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id parameter"})
		return
	}

	user, err := h.service.GetUser(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, user)
}

// Login はメールアドレスとパスワードでJWTを発行します
func (h *Handler) Login(c *gin.Context) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	user, token, err := h.service.Login(req.Email, req.Password)
	if err != nil {
		if strings.Contains(err.Error(), "invalid email or password") {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"token": token, "user": user})
}

// Signup は新規ユーザー登録を行います
func (h *Handler) Signup(c *gin.Context) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	user, err := h.service.Register(req.Email, req.Password)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user.PasswordHash = ""
	c.JSON(http.StatusCreated, user)
}

// Me はJWTの内容から現在のユーザーを返します
func (h *Handler) Me(c *gin.Context) {
	user, err := h.currentUserFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, user)
}
