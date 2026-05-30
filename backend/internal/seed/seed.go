package seed

import (
	"errors"
	"time"

	"backend/internal/model"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

const (
	devPassword   = "password123"
	ownerEmail    = "seed@example.com"
	ownerUsername = "Demo User"
)

type userSeed struct {
	Username              string
	Email                 string
	Bio                   string
	TagIDs                []int
	TrainingFrequencyDays int
	Followed              bool
	Recommended           bool
	Posts                 []postSeed
}

type postSeed struct {
	DaysAgo         int
	Hour            int
	ExerciseType    int
	DurationMinutes int
	Note            string
	Visibility      string
}

var users = []userSeed{
	{
		Username:              "Alice Tanaka",
		Email:                 "alice@example.com",
		Bio:                   "朝トレ中心に、胸と肩を継続しています。",
		TagIDs:                []int{1, 5, 8},
		TrainingFrequencyDays: 2,
		Followed:              true,
		Recommended:           false,
		Posts: []postSeed{
			{DaysAgo: 0, Hour: 7, ExerciseType: 1, DurationMinutes: 45, Note: "ベンチプレスとダンベルフライ。胸にしっかり入りました。"},
			{DaysAgo: 2, Hour: 8, ExerciseType: 4, DurationMinutes: 35, Note: "肩の日。サイドレイズを丁寧に実施。"},
		},
	},
	{
		Username:              "Bob Suzuki",
		Email:                 "bob@example.com",
		Bio:                   "大会に向けてBIG3を伸ばしています。",
		TagIDs:                []int{2, 6},
		TrainingFrequencyDays: 1,
		Followed:              true,
		Recommended:           false,
		Posts: []postSeed{
			{DaysAgo: 0, Hour: 18, ExerciseType: 3, DurationMinutes: 70, Note: "スクワット中心。トップセットの感触が良かったです。"},
			{DaysAgo: 1, Hour: 19, ExerciseType: 2, DurationMinutes: 60, Note: "デッドリフトとローイングを実施。"},
		},
	},
	{
		Username:              "Carol Sato",
		Email:                 "carol@example.com",
		Bio:                   "健康維持とボディメイク目的で続けています。",
		TagIDs:                []int{3, 7},
		TrainingFrequencyDays: 3,
		Followed:              true,
		Recommended:           false,
		Posts: []postSeed{
			{DaysAgo: 1, Hour: 6, ExerciseType: 6, DurationMinutes: 30, Note: "体幹トレーニングとストレッチ。"},
			{DaysAgo: 4, Hour: 6, ExerciseType: 5, DurationMinutes: 40, Note: "腕の日。軽めに高回数で実施。"},
		},
	},
	{
		Username:              "Daichi Ito",
		Email:                 "daichi@example.com",
		Bio:                   "脚トレ多め。週3で淡々と記録しています。",
		TagIDs:                []int{1, 3},
		TrainingFrequencyDays: 2,
		Followed:              true,
		Recommended:           false,
		Posts: []postSeed{
			{DaysAgo: 0, Hour: 21, ExerciseType: 3, DurationMinutes: 55, Note: "レッグプレスとブルガリアンスクワット。"},
			{DaysAgo: 3, Hour: 20, ExerciseType: 3, DurationMinutes: 50, Note: "スクワットのフォーム確認。"},
		},
	},
	{
		Username:              "Emi Kato",
		Email:                 "emi@example.com",
		Bio:                   "初心者。まずは習慣化を目標にしています。",
		TagIDs:                []int{1, 8},
		TrainingFrequencyDays: 2,
		Followed:              false,
		Recommended:           false,
		Posts: []postSeed{
			{DaysAgo: 0, Hour: 9, ExerciseType: 6, DurationMinutes: 25, Note: "プランクと軽い自重トレ。"},
			{DaysAgo: 2, Hour: 9, ExerciseType: 1, DurationMinutes: 30, Note: "マシンチェストプレスを練習。"},
		},
	},
	{
		Username:              "Fumi Mori",
		Email:                 "fumi@example.com",
		Bio:                   "背中トレが好きです。懸垂を増やしたい。",
		TagIDs:                []int{5, 7},
		TrainingFrequencyDays: 3,
		Followed:              false,
		Recommended:           false,
		Posts: []postSeed{
			{DaysAgo: 1, Hour: 20, ExerciseType: 2, DurationMinutes: 50, Note: "ラットプルダウンとシーテッドロー。"},
			{DaysAgo: 5, Hour: 20, ExerciseType: 2, DurationMinutes: 45, Note: "懸垂補助マシンでフォーム確認。"},
		},
	},
	{
		Username:              "Gami Yamada",
		Email:                 "gami@example.com",
		Bio:                   "パワーリフティング寄り。記録更新を狙っています。",
		TagIDs:                []int{2, 6},
		TrainingFrequencyDays: 1,
		Followed:              false,
		Recommended:           false,
		Posts: []postSeed{
			{DaysAgo: 2, Hour: 18, ExerciseType: 1, DurationMinutes: 65, Note: "ベンチプレス重め。補助種目も実施。"},
		},
	},
	{
		Username:              "Hinami Watanabe",
		Email:                 "hinami@example.com",
		Bio:                   "Morning run and core training.",
		TagIDs:                []int{3, 8},
		TrainingFrequencyDays: 2,
		Followed:              false,
		Recommended:           false,
		Posts: []postSeed{
			{DaysAgo: 0, Hour: 6, ExerciseType: 6, DurationMinutes: 28, Note: "Core work after an easy morning run."},
		},
	},
	{
		Username:              "Isseimi Nakano",
		Email:                 "isseimi@example.com",
		Bio:                   "Bench press volume tracker.",
		TagIDs:                []int{2, 5},
		TrainingFrequencyDays: 1,
		Followed:              false,
		Recommended:           false,
		Posts: []postSeed{
			{DaysAgo: 1, Hour: 17, ExerciseType: 1, DurationMinutes: 58, Note: "Bench press and free weight accessory work."},
		},
	},
	{
		Username:              "Jurimi Kobayashi",
		Email:                 "jurimi@example.com",
		Bio:                   "Body make and morning workout logs.",
		TagIDs:                []int{4, 7},
		TrainingFrequencyDays: 3,
		Followed:              false,
		Recommended:           false,
		Posts: []postSeed{
			{DaysAgo: 2, Hour: 8, ExerciseType: 5, DurationMinutes: 42, Note: "Leg day with controlled tempo."},
		},
	},
	{
		Username:              "Kemi Okada",
		Email:                 "kemi@example.com",
		Bio:                   "Back and chest split training.",
		TagIDs:                []int{5, 6},
		TrainingFrequencyDays: 2,
		Followed:              false,
		Recommended:           false,
		Posts: []postSeed{
			{DaysAgo: 0, Hour: 19, ExerciseType: 2, DurationMinutes: 52, Note: "Rows and lat pulldowns with strict form."},
		},
	},
	{
		Username:              "Mika Fujii",
		Email:                 "mika@example.com",
		Bio:                   "Already-followed rest day logs.",
		TagIDs:                []int{1, 3},
		TrainingFrequencyDays: 4,
		Followed:              true,
		Recommended:           false,
		Posts: []postSeed{
			{DaysAgo: 3, Hour: 7, ExerciseType: 6, DurationMinutes: 24, Note: "Light stretching on a rest day."},
		},
	},
	{
		Username:              "Nana Shimizu",
		Email:                 "nana@example.com",
		Bio:                   "Beginner training and consistency.",
		TagIDs:                []int{1, 8},
		TrainingFrequencyDays: 2,
		Followed:              true,
		Recommended:           false,
		Posts: []postSeed{
			{DaysAgo: 1, Hour: 21, ExerciseType: 3, DurationMinutes: 36, Note: "Squat form practice and light accessory work."},
		},
	},
	{
		Username:              "Daichi Sato",
		Email:                 "daichi.sato@example.com",
		Bio:                   "筋トレ初心者です！",
		TagIDs:                []int{1, 3},
		TrainingFrequencyDays: 3,
		Followed:              true,
		Recommended:           false,
	},
	{
		Username:              "Mizuki Tanaka",
		Email:                 "mizuki.tanaka@example.com",
		Bio:                   "ダイエット頑張ってます。",
		TagIDs:                []int{2, 5},
		TrainingFrequencyDays: 2,
		Followed:              true,
		Recommended:           false,
	},
	{
		Username:              "Li Wei",
		Email:                 "li.wei@example.com",
		Bio:                   "坚持跑步，希望提升心肺能力。",
		TagIDs:                []int{1, 4},
		TrainingFrequencyDays: 4,
		Followed:              true,
		Recommended:           false,
		Posts: []postSeed{
			{DaysAgo: 2, Hour: 7, ExerciseType: 1, DurationMinutes: 45, Note: "晨跑5公里，状态不错。"},
			{DaysAgo: 5, Hour: 18, ExerciseType: 2, DurationMinutes: 30, Note: "下肢力量训练。"},
		},
	},
	{
		Username:              "Wang Fang",
		Email:                 "wang.fang@example.com",
		Bio:                   "通过运动缓解久坐带来的疲劳。",
		TagIDs:                []int{2, 7},
		TrainingFrequencyDays: 3,
		Followed:              true,
		Recommended:           false,
		Posts: []postSeed{
			{DaysAgo: 1, Hour: 19, ExerciseType: 6, DurationMinutes: 35, Note: "拉伸与核心训练结合。"},
			{DaysAgo: 4, Hour: 7, ExerciseType: 3, DurationMinutes: 40, Note: "骑行训练。"},
		},
	},
	{
		Username:              "Zhang Ming",
		Email:                 "zhang.ming@example.com",
		Bio:                   "增肌阶段，记录每一次进步。",
		TagIDs:                []int{5, 8},
		TrainingFrequencyDays: 5,
		Followed:              true,
		Recommended:           false,
		Posts: []postSeed{
			{DaysAgo: 1, Hour: 18, ExerciseType: 5, DurationMinutes: 60, Note: "胸肩训练日。"},
			{DaysAgo: 3, Hour: 18, ExerciseType: 5, DurationMinutes: 55, Note: "背部训练。"},
		},
	},
	{
		Username:              "Liu Yang",
		Email:                 "liu.yang@example.com",
		Bio:                   "享受运动后的轻松感。",
		TagIDs:                []int{3, 6},
		TrainingFrequencyDays: 2,
		Followed:              true,
		Recommended:           false,
		Posts: []postSeed{
			{DaysAgo: 2, Hour: 20, ExerciseType: 6, DurationMinutes: 50, Note: "瑜伽练习。"},
			{DaysAgo: 6, Hour: 20, ExerciseType: 1, DurationMinutes: 30, Note: "轻松慢跑。"},
		},
	},
	{
		Username:              "Chen Jie",
		Email:                 "chen.jie@example.com",
		Bio:                   "保持规律锻炼，提高身体素质。",
		TagIDs:                []int{1, 5},
		TrainingFrequencyDays: 4,
		Followed:              true,
		Recommended:           false,
		Posts: []postSeed{
			{DaysAgo: 1, Hour: 6, ExerciseType: 2, DurationMinutes: 45, Note: "腿部力量训练。"},
			{DaysAgo: 4, Hour: 6, ExerciseType: 1, DurationMinutes: 35, Note: "晨跑。"},
		},
	},
	{
		Username:              "Zhao Qiang",
		Email:                 "zhao.qiang@example.com",
		Bio:                   "减脂与塑形同步进行。",
		TagIDs:                []int{2, 8},
		TrainingFrequencyDays: 5,
		Followed:              true,
		Recommended:           false,
		Posts: []postSeed{
			{DaysAgo: 1, Hour: 17, ExerciseType: 4, DurationMinutes: 50, Note: "HIIT训练。"},
			{DaysAgo: 3, Hour: 17, ExerciseType: 1, DurationMinutes: 40, Note: "间歇跑。"},
		},
	},
	{
		Username:              "Huang Lin",
		Email:                 "huang.lin@example.com",
		Bio:                   "运动是最好的投资。",
		TagIDs:                []int{4, 7},
		TrainingFrequencyDays: 3,
		Followed:              true,
		Recommended:           false,
		Posts: []postSeed{
			{DaysAgo: 2, Hour: 8, ExerciseType: 3, DurationMinutes: 60, Note: "户外骑行。"},
			{DaysAgo: 5, Hour: 8, ExerciseType: 6, DurationMinutes: 25, Note: "恢复拉伸。"},
		},
	},
	{
		Username:              "Xu Na",
		Email:                 "xu.na@example.com",
		Bio:                   "喜欢有氧与力量结合训练。",
		TagIDs:                []int{2, 5},
		TrainingFrequencyDays: 4,
		Followed:              true,
		Recommended:           false,
		Posts: []postSeed{
			{DaysAgo: 1, Hour: 18, ExerciseType: 4, DurationMinutes: 30, Note: "燃脂循环训练。"},
			{DaysAgo: 4, Hour: 18, ExerciseType: 5, DurationMinutes: 45, Note: "上肢力量。"},
		},
	},
	{
		Username:              "Sun Hao",
		Email:                 "sun.hao@example.com",
		Bio:                   "备战半程马拉松。",
		TagIDs:                []int{1, 4},
		TrainingFrequencyDays: 6,
		Followed:              true,
		Recommended:           false,
		Posts: []postSeed{
			{DaysAgo: 1, Hour: 6, ExerciseType: 1, DurationMinutes: 70, Note: "长距离跑。"},
			{DaysAgo: 3, Hour: 6, ExerciseType: 1, DurationMinutes: 50, Note: "节奏跑训练。"},
		},
	},
	{
		Username:              "Zhou Rui",
		Email:                 "zhou.rui@example.com",
		Bio:                   "记录健康生活方式。",
		TagIDs:                []int{3, 7},
		TrainingFrequencyDays: 3,
		Followed:              true,
		Recommended:           false,
		Posts: []postSeed{
			{DaysAgo: 2, Hour: 19, ExerciseType: 6, DurationMinutes: 40, Note: "舒展训练。"},
			{DaysAgo: 5, Hour: 19, ExerciseType: 2, DurationMinutes: 35, Note: "基础力量。"},
		},
	},
}

// Run inserts development seed data without duplicating rows on restart.
func Run(db *gorm.DB) error {
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(devPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	owner, err := ensureUser(db, ownerEmail, string(passwordHash))
	if err != nil {
		return err
	}
	if _, err := ensureDefaultProfile(db, owner.ID, ownerUsername, "開発確認用の自分ユーザーです。", []int{1, 5, 8}, 3); err != nil {
		return err
	}

	recommendedOrder := 1
	notPreselectedRecommendationUserIDs := []int{}
	notFollowedUserIDs := []int{}
	for _, seedUser := range users {
		user, err := ensureUser(db, seedUser.Email, string(passwordHash))
		if err != nil {
			return err
		}
		profile, err := ensureDefaultProfile(db, user.ID, seedUser.Username, seedUser.Bio, seedUser.TagIDs, seedUser.TrainingFrequencyDays)
		if err != nil {
			return err
		}
		if err := ensureTrainingPosts(db, user.ID, seedUser.Posts); err != nil {
			return err
		}
		if seedUser.Followed {
			if err := ensureFollow(db, owner.ID, user.ID); err != nil {
				return err
			}
		} else {
			notFollowedUserIDs = append(notFollowedUserIDs, user.ID)
		}
		if seedUser.Recommended {
			if err := ensureRecommendationSlot(db, owner.ID, user.ID, recommendedOrder); err != nil {
				return err
			}
			recommendedOrder++
		} else {
			notPreselectedRecommendationUserIDs = append(notPreselectedRecommendationUserIDs, user.ID)
		}
		if err := ensurePostLikes(db, owner.ID, user.ID); err != nil {
			return err
		}
		if err := ensureDefaultProfileTags(db, profile.ID, seedUser.TagIDs); err != nil {
			return err
		}
	}
	// if err := deleteTodayRecommendationSlotsForUsers(db, owner.ID, notPreselectedRecommendationUserIDs); err != nil {
	// 	return err
	// }
	if err := deleteSeedFollowsForUsers(db, owner.ID, notFollowedUserIDs); err != nil {
		return err
	}

	return nil
}

func ensureUser(db *gorm.DB, email string, passwordHash string) (*model.User, error) {
	var existing model.User
	err := db.Where("email = ?", email).First(&existing).Error
	if err == nil {
		return &existing, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}
	user := model.User{
		Email:        email,
		PasswordHash: passwordHash,
	}
	if err := db.Create(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func ensureDefaultProfile(db *gorm.DB, userID int, username string, bio string, tagIDs []int, trainingFrequencyDays int) (*model.Profile, error) {
	var existing model.Profile
	err := db.Where("user_id = ?", userID).First(&existing).Error
	if err == nil {
		nextBio := optionalString(bio)
		if existing.Username != username || !sameOptionalString(existing.Bio, nextBio) || existing.TrainingFrequencyDays != trainingFrequencyDays {
			existing.Username = username
			existing.Bio = nextBio
			existing.TrainingFrequencyDays = trainingFrequencyDays
			if err := db.Save(&existing).Error; err != nil {
				return nil, err
			}
		}
		if err := ensureDefaultProfileTags(db, existing.ID, tagIDs); err != nil {
			return nil, err
		}
		return &existing, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	if username == "" {
		username = "user"
	}
	if trainingFrequencyDays < 1 {
		trainingFrequencyDays = 3
	}

	profile := model.Profile{
		UserID:                userID,
		Username:              username,
		Bio:                   optionalString(bio),
		TrainingFrequencyDays: trainingFrequencyDays,
	}
	if err := db.Create(&profile).Error; err != nil {
		return nil, err
	}
	if err := ensureDefaultProfileTags(db, profile.ID, tagIDs); err != nil {
		return nil, err
	}
	return &profile, nil
}

func ensureDefaultProfileTags(db *gorm.DB, profileID int, tagIDs []int) error {
	for _, tagID := range tagIDs {
		var existing model.ProfileTag
		err := db.Where("profile_id = ? AND tag_id = ?", profileID, tagID).First(&existing).Error
		if err == nil {
			continue
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}
		if err := db.Create(&model.ProfileTag{ProfileID: profileID, TagID: tagID}).Error; err != nil {
			return err
		}
	}
	return nil
}

func ensureTrainingPosts(db *gorm.DB, userID int, posts []postSeed) error {
	for _, post := range posts {
		trainedOn, startedAt, endedAt := seededTimes(post)
		var existing model.TrainingPost
		err := db.Where("user_id = ? AND trained_on = ? AND exercise_type = ? AND note = ? AND deleted_at IS NULL", userID, trainedOn, post.ExerciseType, post.Note).First(&existing).Error
		if err == nil {
			continue
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}
		duration := post.DurationMinutes
		exerciseType := post.ExerciseType
		visibility := post.Visibility
		if visibility == "" {
			visibility = "followers_and_recommended"
		}
		note := post.Note
		trainingPost := model.TrainingPost{
			UserID:          userID,
			DidTrain:        true,
			TrainedOn:       trainedOn,
			StartedAt:       &startedAt,
			EndedAt:         &endedAt,
			ExerciseType:    &exerciseType,
			DurationMinutes: &duration,
			Note:            &note,
			Visibility:      visibility,
			CreatedAt:       endedAt,
			UpdatedAt:       endedAt,
		}
		if err := db.Create(&trainingPost).Error; err != nil {
			return err
		}
	}
	return nil
}

func ensureFollow(db *gorm.DB, followerUserID int, followeeUserID int) error {
	if followerUserID == followeeUserID {
		return nil
	}
	var existing model.Follow
	err := db.Where("follower_user_id = ? AND followee_user_id = ?", followerUserID, followeeUserID).First(&existing).Error
	if err == nil {
		return markSeedRecommendationFollowed(db, followerUserID, followeeUserID)
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}
	if err := db.Create(&model.Follow{FollowerUserID: followerUserID, FolloweeUserID: followeeUserID}).Error; err != nil {
		return err
	}
	return markSeedRecommendationFollowed(db, followerUserID, followeeUserID)
}

func deleteSeedFollowsForUsers(db *gorm.DB, followerUserID int, followeeUserIDs []int) error {
	if len(followeeUserIDs) == 0 {
		return nil
	}
	return db.Where("follower_user_id = ? AND followee_user_id IN ?", followerUserID, followeeUserIDs).
		Delete(&model.Follow{}).Error
}

func markSeedRecommendationFollowed(db *gorm.DB, userID int, recommendedUserID int) error {
	return db.Model(&model.RecommendationSlot{}).
		Where("user_id = ? AND recommended_user_id = ? AND status = 1", userID, recommendedUserID).
		Update("status", 2).Error
}

func deleteTodayRecommendationSlotsForUsers(db *gorm.DB, userID int, recommendedUserIDs []int) error {
	if len(recommendedUserIDs) == 0 {
		return nil
	}
	return db.Where("user_id = ? AND recommended_user_id IN ? AND slot_date = ?", userID, recommendedUserIDs, dateOnly(time.Now())).
		Delete(&model.RecommendationSlot{}).Error
}

func ensureRecommendationSlot(db *gorm.DB, userID int, recommendedUserID int, displayOrder int) error {
	slotDate := dateOnly(time.Now())
	var follow model.Follow
	err := db.Where("follower_user_id = ? AND followee_user_id = ?", userID, recommendedUserID).First(&follow).Error
	if err == nil {
		return markSeedRecommendationFollowed(db, userID, recommendedUserID)
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}

	var existing model.RecommendationSlot
	err = db.Where("user_id = ? AND recommended_user_id = ? AND slot_date = ?", userID, recommendedUserID, slotDate).First(&existing).Error
	if err == nil {
		if existing.Status != 1 || existing.DisplayOrder != displayOrder {
			existing.Status = 1
			existing.DisplayOrder = displayOrder
			return db.Save(&existing).Error
		}
		return nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}
	return db.Create(&model.RecommendationSlot{
		UserID:            userID,
		RecommendedUserID: recommendedUserID,
		SlotDate:          slotDate,
		DisplayOrder:      displayOrder,
		Status:            1,
	}).Error
}

func ensurePostLikes(db *gorm.DB, ownerID int, authorID int) error {
	var posts []model.TrainingPost
	if err := db.Where("user_id = ? AND deleted_at IS NULL", authorID).Order("created_at DESC").Limit(1).Find(&posts).Error; err != nil {
		return err
	}
	for _, post := range posts {
		var existing model.PostLike
		err := db.Where("post_id = ? AND user_id = ?", post.ID, ownerID).First(&existing).Error
		if err == nil {
			continue
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}
		if err := db.Create(&model.PostLike{PostID: post.ID, UserID: ownerID}).Error; err != nil {
			return err
		}
	}
	return nil
}

func seededTimes(post postSeed) (time.Time, time.Time, time.Time) {
	now := time.Now()
	trainedOn := dateOnly(now.AddDate(0, 0, -post.DaysAgo))
	startedAt := trainedOn.Add(time.Duration(post.Hour) * time.Hour)
	endedAt := startedAt.Add(time.Duration(post.DurationMinutes) * time.Minute)
	return trainedOn, startedAt, endedAt
}

func dateOnly(value time.Time) time.Time {
	year, month, day := value.Date()
	return time.Date(year, month, day, 0, 0, 0, 0, value.Location())
}

func optionalString(value string) *string {
	if value == "" {
		return nil
	}
	return &value
}

func sameOptionalString(left *string, right *string) bool {
	if left == nil || right == nil {
		return left == right
	}
	return *left == *right
}
