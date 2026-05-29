package tests

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sort"
	"strings"
	"testing"
	"time"

	"backend/internal/api"
	"backend/internal/api/handler"
	"backend/internal/api/middleware"
	"backend/internal/model"
	"backend/internal/repository"
	"backend/internal/service"

	"github.com/gin-gonic/gin"
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
	profileTagIDs map[int][]int
	nextUserID    int
	nextProfileID int
	recordsByID   map[int]*model.WorkoutRecord
	postsByID     map[int]*model.TrainingPost
	likes         map[int]map[int]bool
	follows       map[int]map[int]bool
	nextRecordID  int
	nextPostID    int
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
		profileTagIDs: map[int][]int{},
		nextUserID:    len(usersByID) + 1,
		nextProfileID: 1,
		recordsByID:   map[int]*model.WorkoutRecord{},
		postsByID:     map[int]*model.TrainingPost{},
		likes:         map[int]map[int]bool{},
		follows:       map[int]map[int]bool{},
		nextRecordID:  1,
		nextPostID:    1,
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

func (f *fakeRepo) GetProfileByUserID(userID int) (*model.Profile, error) {
	for _, profile := range f.profilesByID {
		if profile.UserID == userID {
			return profile, nil
		}
	}
	return nil, repository.ErrProfileNotFound
}

func (f *fakeRepo) GetProfileTagIDs(profileID int) ([]int, error) {
	tagIDs := f.profileTagIDs[profileID]
	copied := append([]int(nil), tagIDs...)
	return copied, nil
}

func (f *fakeRepo) CreateProfile(profile *model.Profile) error {
	if profile.ID == 0 {
		profile.ID = f.nextProfileID
		f.nextProfileID++
	}
	f.profilesByID[profile.ID] = profile
	return nil
}

func (f *fakeRepo) ReplaceProfileTags(profileID int, tagIDs []int) error {
	f.profileTagIDs[profileID] = append([]int(nil), tagIDs...)
	return nil
}

func (f *fakeRepo) UpdateProfile(profile *model.Profile) error {
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
	if post.ID == 0 {
		post.ID = f.nextPostID
		f.nextPostID++
	}
	f.postsByID[post.ID] = post
	return nil
}

func (f *fakeRepo) ListTimelinePosts(input repository.TimelineQuery) ([]repository.TimelinePostRow, error) {
	posts := make([]*model.TrainingPost, 0, len(f.postsByID))
	for _, post := range f.postsByID {
		if post.UserID == input.UserID || post.DeletedAt != nil {
			continue
		}
		posts = append(posts, post)
	}
	sort.Slice(posts, func(i, j int) bool {
		if posts[i].CreatedAt.Equal(posts[j].CreatedAt) {
			return posts[i].ID > posts[j].ID
		}
		return posts[i].CreatedAt.After(posts[j].CreatedAt)
	})

	rows := make([]repository.TimelinePostRow, 0, len(posts))
	for _, post := range posts {
		if input.CursorTime != nil && input.CursorID != nil {
			if post.CreatedAt.After(*input.CursorTime) || (post.CreatedAt.Equal(*input.CursorTime) && post.ID >= *input.CursorID) {
				continue
			}
		}
		if len(rows) >= input.Limit {
			break
		}
		profile, err := f.GetProfileByUserID(post.UserID)
		if err != nil {
			return nil, err
		}
		likeCount, likedByMe := f.postLikeStatus(post.ID, input.UserID)
		rows = append(rows, repository.TimelinePostRow{
			ID:                    post.ID,
			Source:                input.Source,
			UserID:                post.UserID,
			DidTrain:              post.DidTrain,
			TrainedOn:             post.TrainedOn,
			StartedAt:             post.StartedAt,
			EndedAt:               post.EndedAt,
			ExerciseType:          post.ExerciseType,
			DurationMinutes:       post.DurationMinutes,
			Note:                  post.Note,
			Visibility:            post.Visibility,
			CreatedAt:             post.CreatedAt,
			AuthorProfileID:       profile.ID,
			AuthorUserID:          profile.UserID,
			AuthorUsername:        profile.Username,
			AuthorBio:             profile.Bio,
			TrainingFrequencyDays: profile.TrainingFrequencyDays,
			LikeCount:             likeCount,
			LikedByMe:             likedByMe,
		})
	}
	return rows, nil
}

func (f *fakeRepo) GetTimelinePostByID(postID int, currentUserID int) (*repository.TimelinePostRow, error) {
	post, ok := f.postsByID[postID]
	if !ok || post.DeletedAt != nil {
		return nil, repository.ErrTrainingPostNotFound
	}
	profile, err := f.GetProfileByUserID(post.UserID)
	if err != nil {
		return nil, err
	}
	likeCount, likedByMe := f.postLikeStatus(post.ID, currentUserID)
	return &repository.TimelinePostRow{
		ID:                    post.ID,
		UserID:                post.UserID,
		DidTrain:              post.DidTrain,
		TrainedOn:             post.TrainedOn,
		StartedAt:             post.StartedAt,
		EndedAt:               post.EndedAt,
		ExerciseType:          post.ExerciseType,
		DurationMinutes:       post.DurationMinutes,
		Note:                  post.Note,
		Visibility:            post.Visibility,
		CreatedAt:             post.CreatedAt,
		AuthorProfileID:       profile.ID,
		AuthorUserID:          profile.UserID,
		AuthorUsername:        profile.Username,
		AuthorBio:             profile.Bio,
		TrainingFrequencyDays: profile.TrainingFrequencyDays,
		LikeCount:             likeCount,
		LikedByMe:             likedByMe,
	}, nil
}

func (f *fakeRepo) CreatePostLike(postID int, userID int) error {
	post, ok := f.postsByID[postID]
	if !ok || post.DeletedAt != nil {
		return repository.ErrTrainingPostNotFound
	}
	if f.likes[postID] == nil {
		f.likes[postID] = map[int]bool{}
	}
	f.likes[postID][userID] = true
	return nil
}

func (f *fakeRepo) DeletePostLike(postID int, userID int) error {
	post, ok := f.postsByID[postID]
	if !ok || post.DeletedAt != nil {
		return repository.ErrTrainingPostNotFound
	}
	delete(f.likes[postID], userID)
	return nil
}

func (f *fakeRepo) GetPostLikeStatus(postID int, userID int) (repository.PostLikeStatus, error) {
	post, ok := f.postsByID[postID]
	if !ok || post.DeletedAt != nil {
		return repository.PostLikeStatus{}, repository.ErrTrainingPostNotFound
	}
	likeCount, likedByMe := f.postLikeStatus(postID, userID)
	return repository.PostLikeStatus{
		LikeCount: likeCount,
		LikedByMe: likedByMe,
	}, nil
}

func (f *fakeRepo) postLikeStatus(postID int, userID int) (int, bool) {
	users := f.likes[postID]
	return len(users), users[userID]
}

func (f *fakeRepo) CreateFollow(followerUserID int, followeeUserID int) error {
	if _, ok := f.usersByID[followeeUserID]; !ok {
		return repository.ErrUserNotFound
	}
	if f.follows[followerUserID] == nil {
		f.follows[followerUserID] = map[int]bool{}
	}
	f.follows[followerUserID][followeeUserID] = true
	return nil
}

func (f *fakeRepo) DeleteFollow(followerUserID int, followeeUserID int) error {
	if _, ok := f.usersByID[followeeUserID]; !ok {
		return repository.ErrUserNotFound
	}
	delete(f.follows[followerUserID], followeeUserID)
	return nil
}

func (f *fakeRepo) GetFollowStatus(followerUserID int, followeeUserID int) (repository.FollowStatus, error) {
	if _, ok := f.usersByID[followeeUserID]; !ok {
		return repository.FollowStatus{}, repository.ErrUserNotFound
	}
	return repository.FollowStatus{Following: f.follows[followerUserID][followeeUserID]}, nil
}

func (f *fakeRepo) ListFollowingProfiles(userID int) ([]repository.FollowConnectionRow, error) {
	rows := make([]repository.FollowConnectionRow, 0, len(f.follows[userID]))
	for followeeUserID := range f.follows[userID] {
		profile, err := f.GetProfileByUserID(followeeUserID)
		if err != nil {
			return nil, err
		}
		rows = append(rows, repository.FollowConnectionRow{
			UserID:   profile.UserID,
			Username: profile.Username,
		})
	}
	sort.Slice(rows, func(i, j int) bool {
		return rows[i].UserID < rows[j].UserID
	})
	return rows, nil
}

func (f *fakeRepo) ListFollowerProfiles(userID int) ([]repository.FollowConnectionRow, error) {
	rows := []repository.FollowConnectionRow{}
	for followerUserID, followees := range f.follows {
		if !followees[userID] {
			continue
		}
		profile, err := f.GetProfileByUserID(followerUserID)
		if err != nil {
			return nil, err
		}
		rows = append(rows, repository.FollowConnectionRow{
			UserID:   profile.UserID,
			Username: profile.Username,
		})
	}
	sort.Slice(rows, func(i, j int) bool {
		return rows[i].UserID < rows[j].UserID
	})
	return rows, nil
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
	author := &model.User{ID: 2, Email: "author@example.com"}
	repo.usersByID[author.ID] = author
	repo.usersByEmail[strings.ToLower(author.Email)] = author
	repo.nextUserID = 3
	repo.profilesByID[1] = &model.Profile{
		ID:                    1,
		UserID:                author.ID,
		Username:              "Timeline Author",
		TrainingFrequencyDays: 3,
	}
	repo.profileTagIDs[1] = []int{2, 5}
	note := "timeline post"
	exerciseType := 1
	durationMinutes := 45
	startedAt := time.Date(2026, 5, 28, 10, 0, 0, 0, time.UTC)
	endedAt := startedAt.Add(45 * time.Minute)
	repo.postsByID[1] = &model.TrainingPost{
		ID:              1,
		UserID:          author.ID,
		DidTrain:        true,
		TrainedOn:       time.Date(2026, 5, 28, 0, 0, 0, 0, time.UTC),
		StartedAt:       &startedAt,
		EndedAt:         &endedAt,
		ExerciseType:    &exerciseType,
		DurationMinutes: &durationMinutes,
		Note:            &note,
		Visibility:      "followers_and_recommended",
		CreatedAt:       time.Date(2026, 5, 28, 11, 0, 0, 0, time.UTC),
	}
	repo.nextPostID = 2
	svc := service.NewService(repo, "test-secret")
	h := handler.NewHandler(svc)

	// このハンドラーを使って、テスト用の Gin ルーターを組み立てる
	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.POST("/api/auth/login", h.Login)
	r.POST("/api/auth/signup", h.Signup)

	auth := r.Group("/api")
	auth.Use(middleware.AuthMiddleware("test-secret"))
	auth.GET("/auth/me", h.Me)
	auth.GET("/me/profile", h.GetMyProfile)
	auth.POST("/me/profile", h.SaveMyProfile)
	auth.GET("/me/following", h.GetMyFollowing)
	auth.GET("/me/followers", h.GetMyFollowers)
	auth.GET("/users/:userId", h.GetUserProfile)
	auth.POST("/users/:userId/follow", h.FollowUser)
	auth.DELETE("/users/:userId/follow", h.UnfollowUser)
	auth.GET("/timeline", h.GetTimeline)
	auth.POST("/workout-records", h.CreateWorkoutRecord)
	auth.PUT("/workout-records/:id", h.UpdateWorkoutRecord)
	auth.GET("/workout-records", h.ListWorkoutRecords)
	auth.GET("/workout-records/latest", h.GetLatestWorkoutRecord)
	auth.GET("/workout-records/:id", h.GetWorkoutRecord)
	auth.POST("/posts", h.CreateTrainingPost)
	auth.GET("/posts/:postId", h.GetTrainingPost)
	auth.POST("/posts/:postId/like", h.LikeTrainingPost)
	auth.DELETE("/posts/:postId/like", h.UnlikeTrainingPost)

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

func TestProtectedRoutesRequireBearerToken(t *testing.T) {
	router, _, _ := newTestRouter(t)

	tests := []struct {
		name   string
		method string
		path   string
		body   string
	}{
		{name: "me", method: http.MethodGet, path: "/api/auth/me"},
		{name: "profile", method: http.MethodGet, path: "/api/me/profile"},
		{name: "following", method: http.MethodGet, path: "/api/me/following"},
		{name: "followers", method: http.MethodGet, path: "/api/me/followers"},
		{name: "timeline", method: http.MethodGet, path: "/api/timeline?source=following"},
		{name: "workout records", method: http.MethodGet, path: "/api/workout-records"},
		{name: "create workout record", method: http.MethodPost, path: "/api/workout-records", body: `{}`},
		{name: "create post", method: http.MethodPost, path: "/api/posts", body: `{"didTrain":true,"trainedOn":"2026-05-28"}`},
		{name: "like post", method: http.MethodPost, path: "/api/posts/1/like"},
		{name: "unlike post", method: http.MethodDelete, path: "/api/posts/1/like"},
		{name: "follow user", method: http.MethodPost, path: "/api/users/2/follow"},
		{name: "unfollow user", method: http.MethodDelete, path: "/api/users/2/follow"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var body *bytes.Buffer
			if tt.body != "" {
				body = bytes.NewBufferString(tt.body)
			} else {
				body = bytes.NewBuffer(nil)
			}
			req := httptest.NewRequest(tt.method, tt.path, body)
			if tt.body != "" {
				req.Header.Set("Content-Type", "application/json")
			}
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)
			if w.Code != http.StatusUnauthorized {
				t.Fatalf("expected status 401, got %d", w.Code)
			}
		})
	}
}

func TestGetTimelineFollowing(t *testing.T) {
	router, _, _ := newTestRouter(t)
	token := loginToken(t, router)

	req := httptest.NewRequest(http.MethodGet, "/api/timeline?source=following&limit=20", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp struct {
		Items []struct {
			ID                int    `json:"id"`
			Source            string `json:"source"`
			DidTrain          bool   `json:"didTrain"`
			TrainedOn         string `json:"trainedOn"`
			ExerciseType      *int   `json:"exerciseType"`
			ExerciseTypeLabel string `json:"exerciseTypeLabel"`
			DurationMinutes   *int   `json:"durationMinutes"`
			LikeCount         int    `json:"likeCount"`
			LikedByMe         bool   `json:"likedByMe"`
			Author            struct {
				ID       int    `json:"id"`
				Username string `json:"username"`
				Tags     []struct {
					ID    int    `json:"id"`
					Label string `json:"label"`
				} `json:"tags"`
			} `json:"author"`
		} `json:"items"`
		NextCursor *string `json:"nextCursor"`
	}
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode timeline response: %v", err)
	}
	if len(resp.Items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(resp.Items))
	}
	item := resp.Items[0]
	if item.Source != "following" || item.Author.Username != "Timeline Author" {
		t.Fatalf("unexpected timeline item: %+v", item)
	}
	if item.ExerciseType == nil || *item.ExerciseType != 1 || item.ExerciseTypeLabel != "胸" {
		t.Fatalf("unexpected exercise fields: %+v", item)
	}
	if len(item.Author.Tags) != 2 || item.Author.Tags[0].ID != 2 || item.Author.Tags[1].ID != 5 {
		t.Fatalf("unexpected author tags: %+v", item.Author.Tags)
	}
}

func TestGetTimelineRejectsInvalidSource(t *testing.T) {
	router, _, _ := newTestRouter(t)
	token := loginToken(t, router)

	req := httptest.NewRequest(http.MethodGet, "/api/timeline?source=unknown", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)
	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", w.Code)
	}
}

func TestGetTrainingPost(t *testing.T) {
	router, _, _ := newTestRouter(t)
	token := loginToken(t, router)

	req := httptest.NewRequest(http.MethodGet, "/api/posts/1", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp struct {
		ID     int `json:"id"`
		Author struct {
			ID       int    `json:"id"`
			Username string `json:"username"`
		} `json:"author"`
	}
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode post response: %v", err)
	}
	if resp.ID != 1 || resp.Author.Username != "Timeline Author" {
		t.Fatalf("unexpected post response: %+v", resp)
	}
}

func TestLikeTrainingPostPersistsStatus(t *testing.T) {
	router, _, _ := newTestRouter(t)
	token := loginToken(t, router)

	likeReq := httptest.NewRequest(http.MethodPost, "/api/posts/1/like", nil)
	likeReq.Header.Set("Authorization", "Bearer "+token)
	likeResp := httptest.NewRecorder()

	router.ServeHTTP(likeResp, likeReq)
	if likeResp.Code != http.StatusOK {
		t.Fatalf("expected like status 200, got %d: %s", likeResp.Code, likeResp.Body.String())
	}

	var liked struct {
		LikedByMe bool `json:"likedByMe"`
		LikeCount int  `json:"likeCount"`
	}
	if err := json.NewDecoder(likeResp.Body).Decode(&liked); err != nil {
		t.Fatalf("failed to decode like response: %v", err)
	}
	if !liked.LikedByMe || liked.LikeCount != 1 {
		t.Fatalf("unexpected like response: %+v", liked)
	}

	getReq := httptest.NewRequest(http.MethodGet, "/api/posts/1", nil)
	getReq.Header.Set("Authorization", "Bearer "+token)
	getResp := httptest.NewRecorder()
	router.ServeHTTP(getResp, getReq)
	if getResp.Code != http.StatusOK {
		t.Fatalf("expected post status 200, got %d: %s", getResp.Code, getResp.Body.String())
	}

	var post struct {
		LikedByMe bool `json:"likedByMe"`
		LikeCount int  `json:"likeCount"`
	}
	if err := json.NewDecoder(getResp.Body).Decode(&post); err != nil {
		t.Fatalf("failed to decode post response: %v", err)
	}
	if !post.LikedByMe || post.LikeCount != 1 {
		t.Fatalf("expected liked status in post detail, got %+v", post)
	}
}

func TestUnlikeTrainingPostPersistsStatus(t *testing.T) {
	router, _, _ := newTestRouter(t)
	token := loginToken(t, router)

	likeReq := httptest.NewRequest(http.MethodPost, "/api/posts/1/like", nil)
	likeReq.Header.Set("Authorization", "Bearer "+token)
	router.ServeHTTP(httptest.NewRecorder(), likeReq)

	unlikeReq := httptest.NewRequest(http.MethodDelete, "/api/posts/1/like", nil)
	unlikeReq.Header.Set("Authorization", "Bearer "+token)
	unlikeResp := httptest.NewRecorder()

	router.ServeHTTP(unlikeResp, unlikeReq)
	if unlikeResp.Code != http.StatusOK {
		t.Fatalf("expected unlike status 200, got %d: %s", unlikeResp.Code, unlikeResp.Body.String())
	}

	var unliked struct {
		LikedByMe bool `json:"likedByMe"`
		LikeCount int  `json:"likeCount"`
	}
	if err := json.NewDecoder(unlikeResp.Body).Decode(&unliked); err != nil {
		t.Fatalf("failed to decode unlike response: %v", err)
	}
	if unliked.LikedByMe || unliked.LikeCount != 0 {
		t.Fatalf("unexpected unlike response: %+v", unliked)
	}
}

func TestLikeTrainingPostReturnsNotFound(t *testing.T) {
	router, _, _ := newTestRouter(t)
	token := loginToken(t, router)

	req := httptest.NewRequest(http.MethodPost, "/api/posts/999/like", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)
	if w.Code != http.StatusNotFound {
		t.Fatalf("expected status 404, got %d: %s", w.Code, w.Body.String())
	}
}

func TestFollowUserPersistsStatus(t *testing.T) {
	router, _, _ := newTestRouter(t)
	token := loginToken(t, router)

	req := httptest.NewRequest(http.MethodPost, "/api/users/2/follow", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("expected follow status 200, got %d: %s", w.Code, w.Body.String())
	}

	var followed struct {
		Following bool `json:"following"`
	}
	if err := json.NewDecoder(w.Body).Decode(&followed); err != nil {
		t.Fatalf("failed to decode follow response: %v", err)
	}
	if !followed.Following {
		t.Fatalf("expected following true, got %+v", followed)
	}

	profileReq := httptest.NewRequest(http.MethodGet, "/api/users/2", nil)
	profileReq.Header.Set("Authorization", "Bearer "+token)
	profileResp := httptest.NewRecorder()
	router.ServeHTTP(profileResp, profileReq)
	if profileResp.Code != http.StatusOK {
		t.Fatalf("expected profile status 200, got %d: %s", profileResp.Code, profileResp.Body.String())
	}

	var profilePayload struct {
		Profile struct {
			Following *bool `json:"following"`
		} `json:"profile"`
	}
	if err := json.NewDecoder(profileResp.Body).Decode(&profilePayload); err != nil {
		t.Fatalf("failed to decode profile response: %v", err)
	}
	if profilePayload.Profile.Following == nil || !*profilePayload.Profile.Following {
		t.Fatalf("expected profile following true, got %+v", profilePayload)
	}
}

func TestGetMyFollowing(t *testing.T) {
	router, _, _ := newTestRouter(t)
	token := loginToken(t, router)

	followReq := httptest.NewRequest(http.MethodPost, "/api/users/2/follow", nil)
	followReq.Header.Set("Authorization", "Bearer "+token)
	router.ServeHTTP(httptest.NewRecorder(), followReq)

	req := httptest.NewRequest(http.MethodGet, "/api/me/following", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("expected following status 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp struct {
		Items []struct {
			UserID   int    `json:"userId"`
			Username string `json:"username"`
			Handle   string `json:"handle"`
			Relation string `json:"relation"`
		} `json:"items"`
	}
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode following response: %v", err)
	}
	if len(resp.Items) != 1 || resp.Items[0].UserID != 2 || resp.Items[0].Username != "Timeline Author" {
		t.Fatalf("unexpected following response: %+v", resp)
	}
}

func TestGetMyFollowers(t *testing.T) {
	router, _, _ := newTestRouter(t)
	token := loginToken(t, router)

	req := httptest.NewRequest(http.MethodGet, "/api/me/followers", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("expected followers status 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp struct {
		Items []struct {
			UserID int `json:"userId"`
		} `json:"items"`
	}
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode followers response: %v", err)
	}
	if len(resp.Items) != 0 {
		t.Fatalf("expected empty followers response, got %+v", resp)
	}
}

func TestUnfollowUserPersistsStatus(t *testing.T) {
	router, _, _ := newTestRouter(t)
	token := loginToken(t, router)

	followReq := httptest.NewRequest(http.MethodPost, "/api/users/2/follow", nil)
	followReq.Header.Set("Authorization", "Bearer "+token)
	router.ServeHTTP(httptest.NewRecorder(), followReq)

	req := httptest.NewRequest(http.MethodDelete, "/api/users/2/follow", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("expected unfollow status 200, got %d: %s", w.Code, w.Body.String())
	}

	var followed struct {
		Following bool `json:"following"`
	}
	if err := json.NewDecoder(w.Body).Decode(&followed); err != nil {
		t.Fatalf("failed to decode unfollow response: %v", err)
	}
	if followed.Following {
		t.Fatalf("expected following false, got %+v", followed)
	}
}

func TestFollowUserRejectsSelf(t *testing.T) {
	router, _, _ := newTestRouter(t)
	token := loginToken(t, router)

	req := httptest.NewRequest(http.MethodPost, "/api/users/1/follow", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)
	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d: %s", w.Code, w.Body.String())
	}
}

func TestFollowUserReturnsNotFound(t *testing.T) {
	router, _, _ := newTestRouter(t)
	token := loginToken(t, router)

	req := httptest.NewRequest(http.MethodPost, "/api/users/999/follow", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)
	if w.Code != http.StatusNotFound {
		t.Fatalf("expected status 404, got %d: %s", w.Code, w.Body.String())
	}
}

func TestGetUserProfileByPath(t *testing.T) {
	router, _, _ := newTestRouter(t)
	token := loginToken(t, router)

	req := httptest.NewRequest(http.MethodGet, "/api/users/2", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp struct {
		Profile struct {
			UserID   int    `json:"user_id"`
			Username string `json:"username"`
		} `json:"profile"`
	}
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode profile response: %v", err)
	}
	if resp.Profile.UserID != 2 || resp.Profile.Username != "Timeline Author" {
		t.Fatalf("unexpected profile response: %+v", resp)
	}
}

func TestCreateTrainingPostAcceptsCamelCaseBody(t *testing.T) {
	router, _, _ := newTestRouter(t)
	token := loginToken(t, router)

	body := bytes.NewBufferString(`{"didTrain":true,"trainedOn":"2026-05-28","startedAt":"2026-05-28T10:00:00Z","endedAt":"2026-05-28T10:45:00Z","exerciseType":1,"durationMinutes":45,"note":"bench day"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/posts", body)
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)
	if w.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d: %s", w.Code, w.Body.String())
	}

	var resp struct {
		ID int `json:"id"`
	}
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode post response: %v", err)
	}
	if resp.ID == 0 {
		t.Fatal("expected post id to be returned")
	}
}

func TestCreateTrainingPostAcceptsSnakeCaseBody(t *testing.T) {
	router, _, _ := newTestRouter(t)
	token := loginToken(t, router)

	body := bytes.NewBufferString(`{"did_train":true,"trained_on":"2026-05-28","started_at":"2026-05-28T10:00:00Z","ended_at":"2026-05-28T10:45:00Z","exercise_type":1,"duration_minutes":45,"note":"bench day"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/posts", body)
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)
	if w.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d: %s", w.Code, w.Body.String())
	}

	var resp struct {
		ID int `json:"id"`
	}
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode post response: %v", err)
	}
	if resp.ID == 0 {
		t.Fatal("expected post id to be returned")
	}
}

func TestSignupSuccess(t *testing.T) {
	router, _, _ := newTestRouter(t)

	body := bytes.NewBufferString(`{"email":"new@example.com","password":"secret"}`)
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

func TestSignupDuplicateEmail(t *testing.T) {
	router, seedUser, _ := newTestRouter(t)

	// try to signup with same email as seedUser
	body := bytes.NewBufferString(`{"email":"` + seedUser.Email + `","password":"secret"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/auth/signup", body)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)
	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400 for duplicate email, got %d", w.Code)
	}
}

func TestGetMyProfileReturnsIncompleteWhenMissing(t *testing.T) {
	router, _, _ := newTestRouter(t)
	token := loginToken(t, router)

	req := httptest.NewRequest(http.MethodGet, "/api/me/profile", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	var resp struct {
		ProfileCompleted bool `json:"profileCompleted"`
	}
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode profile response: %v", err)
	}
	if resp.ProfileCompleted {
		t.Fatal("expected profileCompleted false")
	}
}

func TestSaveMyProfileCreatesProfileWithUsername(t *testing.T) {
	router, _, _ := newTestRouter(t)
	token := loginToken(t, router)

	body := bytes.NewBufferString(`{"username":"Profile User","bio":"hello","tagIds":[2,5],"trainingFrequencyDays":3}`)
	req := httptest.NewRequest(http.MethodPost, "/api/me/profile", body)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	var resp struct {
		ProfileCompleted bool `json:"profileCompleted"`
		Profile          struct {
			Username string `json:"username"`
			Tags     []struct {
				ID    int    `json:"id"`
				Label string `json:"label"`
			} `json:"tags"`
		} `json:"profile"`
	}
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode profile response: %v", err)
	}
	if !resp.ProfileCompleted {
		t.Fatalf("expected completed profile, got %+v", resp)
	}
	if resp.Profile.Username != "Profile User" {
		t.Fatalf("expected username Profile User, got %s", resp.Profile.Username)
	}
	if len(resp.Profile.Tags) != 2 || resp.Profile.Tags[0].ID != 2 || resp.Profile.Tags[1].ID != 5 {
		t.Fatalf("expected tag ids [2 5], got %+v", resp.Profile.Tags)
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
