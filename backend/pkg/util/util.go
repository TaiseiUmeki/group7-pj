package util

// ここに共有ユーティリティ関数を定義します
// 例：

// ResponseError はエラーレスポンスを表します
type ResponseError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

// NewResponseError はエラーレスポンスを作成します
func NewResponseError(code int, message string) *ResponseError {
	return &ResponseError{
		Code:    code,
		Message: message,
	}
}
