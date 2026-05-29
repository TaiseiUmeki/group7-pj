package service

type PostLikeResponse struct {
	LikedByMe bool `json:"likedByMe"`
	LikeCount int  `json:"likeCount"`
}

func (s *Service) LikeTrainingPost(postID int, userID int) (*PostLikeResponse, error) {
	if err := s.repo.CreatePostLike(postID, userID); err != nil {
		return nil, err
	}
	return s.postLikeResponse(postID, userID)
}

func (s *Service) UnlikeTrainingPost(postID int, userID int) (*PostLikeResponse, error) {
	if err := s.repo.DeletePostLike(postID, userID); err != nil {
		return nil, err
	}
	return s.postLikeResponse(postID, userID)
}

func (s *Service) postLikeResponse(postID int, userID int) (*PostLikeResponse, error) {
	status, err := s.repo.GetPostLikeStatus(postID, userID)
	if err != nil {
		return nil, err
	}
	return &PostLikeResponse{
		LikedByMe: status.LikedByMe,
		LikeCount: status.LikeCount,
	}, nil
}
