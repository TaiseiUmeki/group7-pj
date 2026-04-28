package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	applicationuser "backend/internal/application/user"
)

// Handler はHTTPハンドラーを扱う構造体です。
type Handler struct {
	userUsecase *applicationuser.Usecase
}

// NewHandler はハンドラーを初期化します。
func NewHandler(userUsecase *applicationuser.Usecase) *Handler {
	return &Handler{
		userUsecase: userUsecase,
	}
}

// HealthCheck はサーバーのヘルスチェックを行います。
func (h *Handler) HealthCheck(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// GetAllUsers はすべてのユーザー情報を取得します。
func (h *Handler) GetAllUsers(w http.ResponseWriter, r *http.Request) {
	users, err := h.userUsecase.GetAllUsers()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, newUserResponses(users))
}

// GetUser はIDからユーザー情報を取得します。
func (h *Handler) GetUser(w http.ResponseWriter, r *http.Request) {
	idStr := r.URL.Query().Get("id")
	if idStr == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "id parameter is required"})
		return
	}

	id, err := strconv.Atoi(idStr)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid id parameter"})
		return
	}

	user, err := h.userUsecase.GetUser(id)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, newUserResponse(user))
}

type userResponse struct {
	ID    int    `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
}

func newUserResponse(user *applicationuser.UserDTO) userResponse {
	return userResponse{
		ID:    user.ID,
		Name:  user.Name,
		Email: user.Email,
	}
}

func newUserResponses(users []*applicationuser.UserDTO) []userResponse {
	responses := make([]userResponse, 0, len(users))
	for _, user := range users {
		responses = append(responses, newUserResponse(user))
	}
	return responses
}

func writeJSON(w http.ResponseWriter, statusCode int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	_ = json.NewEncoder(w).Encode(body)
}
