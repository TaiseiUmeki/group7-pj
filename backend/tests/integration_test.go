package tests

import (
	"backend/internal/api"
	"backend/internal/api/handler"
	"backend/internal/model"
	"backend/internal/repository"
	"backend/internal/service"
	"bytes"
	"encoding/json"
	"github.com/gin-gonic/gin"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"golang.org/x/crypto/bcrypt"
)

// TestHealthCheck はヘルスチェックエンドポイントをテストします
func TestHealthCheck(t *testing.T) {
	router := api.NewRouter(nil, "test-secret")

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}
}

type fakeRepo struct {
	usersByID     map[int]*model.User
	usersByEmail  map[string]*model.User
	profilesByID  map[int]*model.Profile
	nextUserID    int
	nextProfileID int
	recordsByID   map[int]*model.WorkoutRecord
	nextRecordID  int
}

func newFakeRepo(seedUser *model.User) *fakeRepo {
	usersByID := map[int]*model.User{}
	usersByEmail := map[string]*model.User{}
	if seedUser != nil {
		usersByID[seedUser.ID] = seedUser
		usersByEmail[strings.ToLower(seedUser.Email)] = seedUser
	}

	return &fakeRepo{
		usersByID:     usersByID,
		usersByEmail:  usersByEmail,
		profilesByID:  map[int]*model.Profile{},
		nextUserID:    len(usersByID) + 1,
		nextProfileID: 1,
		recordsByID:   map[int]*model.WorkoutRecord{},
		nextRecordID:  1,
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
	if user.ID == 0 {
		user.ID = f.nextUserID
		f.nextUserID++
	}
	f.usersByID[user.ID] = user
	f.usersByEmail[strings.ToLower(user.Email)] = user
	return nil
}

func (f *fakeRepo) CreateProfile(profile *model.Profile) error {
	if profile.ID == 0 {
		profile.ID = f.nextProfileID
		f.nextProfileID++
	}
	f.profilesByID[profile.ID] = profile
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

func (f *fakeRepo) GetWorkoutRecordByIDAndUserID(id, userID int) (*model.WorkoutRecord, error) {
	record, ok := f.recordsByID[id]
	if !ok || record.UserID != userID {
		return nil, repository.ErrWorkoutRecordNotFound
	}
	return record, nil
}

func (f *fakeRepo) GetWorkoutRecordsByUserID(userID int) ([]*model.WorkoutRecord, error) {
	records := make([]*model.WorkoutRecord, 0, len(f.recordsByID))
	for _, record := range f.recordsByID {
		if record.UserID == userID {
			records = append(records, record)
		}
	}
	return records, nil
}

func (f *fakeRepo) GetLatestWorkoutRecordByUserID(userID int) (*model.WorkoutRecord, error) {
	var latest *model.WorkoutRecord
	for _, record := range f.recordsByID {
		if record.UserID != userID {
			continue
		}
		if latest == nil || record.StartTime.After(latest.StartTime) {
			latest = record
		}
	}
	if latest == nil {
		return nil, repository.ErrWorkoutRecordNotFound
	}
	return latest, nil
}

func (f *fakeRepo) CreateWorkoutRecord(record *model.WorkoutRecord) error {
	if record.ID == 0 {
		record.ID = f.nextRecordID
		f.nextRecordID++
	}
	f.recordsByID[record.ID] = record
	return nil
}

func (f *fakeRepo) UpdateWorkoutRecord(record *model.WorkoutRecord) error {
	f.recordsByID[record.ID] = record
	return nil
}

func (f *fakeRepo) DeleteWorkoutRecord(id int) error {
	delete(f.recordsByID, id)
	return nil
}

func (f *fakeRepo) CreateTrainingPost(post *model.TrainingPost) error {
	return nil
}

func newTestRouter(t *testing.T) (http.Handler, *model.User, string) {
	t.Helper()

	hash, err := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
	if err != nil {
		t.Fatalf("failed to hash password: %v", err)
	}

	seedUser := &model.User{
		ID:           1,
		Email:        "seed@example.com",
		PasswordHash: string(hash),
	}

	repo := newFakeRepo(seedUser)
	svc := service.NewService(repo, "test-secret")
	h := handler.NewHandler(svc)

	// このハンドラーを使って、テスト用の Gin ルーターを組み立てる
	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.POST("/api/auth/login", h.Login)
	r.POST("/api/auth/signup", h.Signup)
	r.GET("/api/auth/me", h.Me)
	r.POST("/api/workout-records", h.CreateWorkoutRecord)
	r.PUT("/api/workout-records/:id", h.UpdateWorkoutRecord)
	r.GET("/api/workout-records", h.ListWorkoutRecords)
	r.GET("/api/workout-records/:id", h.GetWorkoutRecord)
	r.POST("/api/posts", h.CreateTrainingPost)

	return r, seedUser, "test-secret"
}

func loginToken(t *testing.T, router http.Handler) string {
	t.Helper()
	body := bytes.NewBufferString(`{"email":"seed@example.com","password":"password123"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/auth/login", body)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("expected login status 200, got %d", w.Code)
	}

	var resp struct {
		Token string `json:"token"`
	}
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode login response: %v", err)
	}
	if resp.Token == "" {
		t.Fatal("expected token to be returned")
	}

	return resp.Token
}

func TestLoginSuccess(t *testing.T) {
	router, _, _ := newTestRouter(t)

	body := bytes.NewBufferString(`{"email":"seed@example.com","password":"password123"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/auth/login", body)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	var resp struct {
		Token string      `json:"token"`
		User  *model.User `json:"user"`
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
	router, _, _ := newTestRouter(t)

	body := bytes.NewBufferString(`{"email":"seed@example.com","password":"wrong-password"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/auth/login", body)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected status 401, got %d", w.Code)
	}
}

func TestSignupSuccess(t *testing.T) {
	router, _, _ := newTestRouter(t)

	body := bytes.NewBufferString(`{"username":"New User","email":"new@example.com","password":"secret"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/auth/signup", body)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)
	if w.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d", w.Code)
	}

	var u model.User
	if err := json.NewDecoder(w.Body).Decode(&u); err != nil {
		t.Fatalf("failed to decode signup response: %v", err)
	}
	if u.Email != "new@example.com" {
		t.Fatalf("expected email new@example.com, got %s", u.Email)
	}
}

func TestSignupCreatesProfileWithUsername(t *testing.T) {
	repo := newFakeRepo(nil)
	svc := service.NewService(repo, "test-secret")
	h := handler.NewHandler(svc)
	router := gin.New()
	router.POST("/api/auth/signup", h.Signup)

	body := bytes.NewBufferString(`{"username":"Profile User","email":"profile@example.com","password":"secret"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/auth/signup", body)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)
	if w.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d", w.Code)
	}

	if len(repo.profilesByID) != 1 {
		t.Fatalf("expected 1 profile, got %d", len(repo.profilesByID))
	}
	for _, profile := range repo.profilesByID {
		if profile.Username != "Profile User" {
			t.Fatalf("expected username Profile User, got %s", profile.Username)
		}
	}
}

func TestSignupDuplicateEmail(t *testing.T) {
	router, seedUser, _ := newTestRouter(t)

	// try to signup with same email as seedUser
	body := bytes.NewBufferString(`{"username":"Dup","email":"` + seedUser.Email + `","password":"secret"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/auth/signup", body)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)
	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400 for duplicate email, got %d", w.Code)
	}
}

func TestMeEndpoint(t *testing.T) {
	router, _, _ := newTestRouter(t)

	token := loginToken(t, router)

	meReq := httptest.NewRequest(http.MethodGet, "/api/auth/me", nil)
	meReq.Header.Set("Authorization", "Bearer "+token)
	meRes := httptest.NewRecorder()
	router.ServeHTTP(meRes, meReq)

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

func TestCreateQuickWorkoutRecord(t *testing.T) {
	router, _, _ := newTestRouter(t)
	token := loginToken(t, router)

	body := bytes.NewBufferString(`{"record_type":"quick","start_time":"2026-05-26T18:00:00Z","duration_minutes":45}`)
	req := httptest.NewRequest(http.MethodPost, "/api/workout-records", body)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d", w.Code)
	}

	var record model.WorkoutRecord
	if err := json.NewDecoder(w.Body).Decode(&record); err != nil {
		t.Fatalf("failed to decode record: %v", err)
	}

	if record.RecordType != service.WorkoutRecordTypeQuick {
		t.Fatalf("expected quick record, got %s", record.RecordType)
	}
	if record.UserID != 1 {
		t.Fatalf("expected user_id 1, got %d", record.UserID)
	}
	if record.DurationMinutes != 45 {
		t.Fatalf("expected duration 45, got %d", record.DurationMinutes)
	}
}

func TestUpdateNormalWorkoutRecord(t *testing.T) {
	router, _, _ := newTestRouter(t)
	token := loginToken(t, router)

	createBody := bytes.NewBufferString(`{"record_type":"quick","start_time":"2026-05-26T18:00:00Z","duration_minutes":30}`)
	createReq := httptest.NewRequest(http.MethodPost, "/api/workout-records", createBody)
	createReq.Header.Set("Authorization", "Bearer "+token)
	createRes := httptest.NewRecorder()
	router.ServeHTTP(createRes, createReq)

	var created model.WorkoutRecord
	if err := json.NewDecoder(createRes.Body).Decode(&created); err != nil {
		t.Fatalf("failed to decode create response: %v", err)
	}

	updateBody := bytes.NewBufferString(`{"record_type":"normal","exercise_type":"bench press","start_time":"2026-05-26T19:00:00Z","duration_minutes":60}`)
	updateReq := httptest.NewRequest(http.MethodPut, "/api/workout-records/1", updateBody)
	updateReq.Header.Set("Authorization", "Bearer "+token)
	updateRes := httptest.NewRecorder()
	router.ServeHTTP(updateRes, updateReq)

	if updateRes.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", updateRes.Code)
	}

	var updated model.WorkoutRecord
	if err := json.NewDecoder(updateRes.Body).Decode(&updated); err != nil {
		t.Fatalf("failed to decode update response: %v", err)
	}

	if updated.RecordType != service.WorkoutRecordTypeNormal {
		t.Fatalf("expected normal record, got %s", updated.RecordType)
	}
	if updated.ExerciseType != "bench press" {
		t.Fatalf("expected bench press, got %s", updated.ExerciseType)
	}
	if updated.DurationMinutes != 60 {
		t.Fatalf("expected duration 60, got %d", updated.DurationMinutes)
	}
	if updated.StartTime.Format(time.RFC3339) != "2026-05-26T19:00:00Z" {
		t.Fatalf("unexpected start time: %s", updated.StartTime.Format(time.RFC3339))
	}
}
