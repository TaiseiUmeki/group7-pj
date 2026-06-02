package service

import (
	"time"
)

// RefreshWorkoutStreak recalculates and caches a user's workout streak.
func (s *Service) RefreshWorkoutStreak(userID int, now time.Time) (int, bool, *time.Time, error) {
	dates, err := s.repo.ListWorkoutDatesByUserID(userID)
	if err != nil {
		return 0, false, nil, err
	}

	location := now.Location()
	if location == nil {
		location = time.Local
	}
	today := dateInLocation(now, location)
	yesterday := today.AddDate(0, 0, -1)

	workoutDates := map[string]bool{}
	var lastWorkoutDate *time.Time
	for _, value := range dates {
		workoutDate := dateInLocation(value, location)
		if lastWorkoutDate == nil || workoutDate.After(*lastWorkoutDate) {
			date := workoutDate
			lastWorkoutDate = &date
		}
		if workoutDate.After(today) {
			continue
		}
		workoutDates[workoutDate.Format("2006-01-02")] = true
	}

	trainedToday := workoutDates[today.Format("2006-01-02")]
	streakStart := yesterday
	if trainedToday {
		streakStart = today
	}

	streakDays := 0
	for day := streakStart; workoutDates[day.Format("2006-01-02")]; day = day.AddDate(0, 0, -1) {
		streakDays++
	}

	if err := s.repo.UpdateUserWorkoutStreak(userID, streakDays, lastWorkoutDate); err != nil {
		return 0, false, nil, err
	}
	return streakDays, trainedToday, lastWorkoutDate, nil
}

func dateInLocation(value time.Time, location *time.Location) time.Time {
	local := value.In(location)
	year, month, day := local.Date()
	return time.Date(year, month, day, 0, 0, 0, 0, location)
}
