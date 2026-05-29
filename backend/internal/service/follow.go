package service

import (
	"errors"
	"fmt"
)

var ErrCannotFollowSelf = errors.New("cannot follow yourself")

type FollowResponse struct {
	Following bool `json:"following"`
}

func (s *Service) FollowUser(followerUserID int, followeeUserID int) (*FollowResponse, error) {
	if followerUserID == followeeUserID {
		return nil, ErrCannotFollowSelf
	}
	if followeeUserID <= 0 {
		return nil, fmt.Errorf("invalid user id")
	}
	if err := s.repo.CreateFollow(followerUserID, followeeUserID); err != nil {
		return nil, err
	}
	return s.followResponse(followerUserID, followeeUserID)
}

func (s *Service) UnfollowUser(followerUserID int, followeeUserID int) (*FollowResponse, error) {
	if followerUserID == followeeUserID {
		return nil, ErrCannotFollowSelf
	}
	if followeeUserID <= 0 {
		return nil, fmt.Errorf("invalid user id")
	}
	if err := s.repo.DeleteFollow(followerUserID, followeeUserID); err != nil {
		return nil, err
	}
	return s.followResponse(followerUserID, followeeUserID)
}

func (s *Service) followResponse(followerUserID int, followeeUserID int) (*FollowResponse, error) {
	status, err := s.repo.GetFollowStatus(followerUserID, followeeUserID)
	if err != nil {
		return nil, err
	}
	return &FollowResponse{Following: status.Following}, nil
}
