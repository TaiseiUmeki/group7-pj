package tests

import (
	"backend/internal/api/handler"
	"backend/internal/model"
	"backend/internal/repository"
	"backend/internal/service"
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"golang.org/x/crypto/bcrypt"
)

type fakeRepo struct {
	usersByID    map[int]*model.User
	usersByEmail map[string]*model.User
}

func newFakeRepo(seedUser *model.User) *fakeRepo {
	usersByID := map[int]*model.User{}
	usersByEmail := map[string]*model.User{}
	if seedUser != nil {
		usersByID[seedUser.ID] = seedUser
		usersByEmail[strings.ToLower(seedUser.Email)] = seedUser
	}

	return &fakeRepo{
		usersByID:    usersByID,
		usersByEmail: usersByEmail,
	}
}

func (f *fakeRepo) GetUserByID(id int) (*model.User, error) {
	user, ok := f.usersByID[id]
	if !ok {
		return nil, repository.ErrUserNotFound
	}
	return user, nil
}

func (f *fakeRepo) GetUserByEmail(email string) (*model.User, error) {
	user, ok := f.usersByEmail[strings.ToLower(email)]
	if !ok {
		return nil, repository.ErrUserNotFound
	}
	return user, nil
}

func (f *fakeRepo) GetAllUsers() ([]*model.User, error) {
	users := make([]*model.User, 0, len(f.usersByID))
	for _, user := range f.usersByID {
		users = append(users, user)
	}
	return users, nil
}

func (f *fakeRepo) CreateUser(user *model.User) error {
	f.usersByID[user.ID] = user
	f.usersByEmail[strings.ToLower(user.Email)] = user
	return nil
}

func (f *fakeRepo) UpdateUser(user *model.User) error {
	f.usersByID[user.ID] = user
	f.usersByEmail[strings.ToLower(user.Email)] = user
	return nil
}

func (f *fakeRepo) DeleteUser(id int) error {
	if user, ok := f.usersByID[id]; ok {
		delete(f.usersByEmail, strings.ToLower(user.Email))
	}
	delete(f.usersByID, id)
	return nil
}

func newTestHandler(t *testing.T) (*handler.Handler, *model.User, string) {
	t.Helper()

	hash, err := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
	if err != nil {
		t.Fatalf("failed to hash password: %v", err)
	}

	seedUser := &model.User{
		ID:           1,
		Name:         "Demo User",
		Email:        "seed@example.com",
		PasswordHash: string(hash),
	}

	repo := newFakeRepo(seedUser)
	svc := service.NewService(repo, "test-secret")
	return handler.NewHandler(svc), seedUser, "test-secret"
}

func TestLoginSuccess(t *testing.T) {
	h, _, _ := newTestHandler(t)

	body := bytes.NewBufferString(`{"email":"seed@example.com","password":"password123"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/auth/login", body)
	w := httptest.NewRecorder()

	h.Login(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	var resp struct {
		Token string       `json:"token"`
		User  *model.User  `json:"user"`
	}
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if resp.Token == "" {
		t.Fatal("expected token to be returned")
	}
	if resp.User == nil || resp.User.Email != "seed@example.com" {
		t.Fatalf("expected seeded user in response, got %+v", resp.User)
	}
}

func TestLoginFailure(t *testing.T) {
	h, _, _ := newTestHandler(t)

	body := bytes.NewBufferString(`{"email":"seed@example.com","password":"wrong-password"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/auth/login", body)
	w := httptest.NewRecorder()

	h.Login(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected status 401, got %d", w.Code)
	}
}

func TestMeEndpoint(t *testing.T) {
	h, _, _ := newTestHandler(t)

	loginBody := bytes.NewBufferString(`{"email":"seed@example.com","password":"password123"}`)
	loginReq := httptest.NewRequest(http.MethodPost, "/api/auth/login", loginBody)
	loginRes := httptest.NewRecorder()
	h.Login(loginRes, loginReq)

	var loginResp struct {
		Token string `json:"token"`
	}
	if err := json.NewDecoder(loginRes.Body).Decode(&loginResp); err != nil {
		t.Fatalf("failed to decode login response: %v", err)
	}

	meReq := httptest.NewRequest(http.MethodGet, "/api/auth/me", nil)
	meReq.Header.Set("Authorization", "Bearer "+loginResp.Token)
	meRes := httptest.NewRecorder()
	h.Me(meRes, meReq)

	if meRes.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", meRes.Code)
	}

	var user model.User
	if err := json.NewDecoder(meRes.Body).Decode(&user); err != nil {
		t.Fatalf("failed to decode me response: %v", err)
	}
	if user.Email != "seed@example.com" {
		t.Fatalf("expected seeded email, got %s", user.Email)
	}
}
