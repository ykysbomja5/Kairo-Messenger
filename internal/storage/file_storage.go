package storage

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
)

type FileStorage interface {
	
	Upload(ctx context.Context, data []byte, contentType string) (string, error)
}


type LocalFileStorage struct {
	BaseDir string 
	BaseURL string 
}


func NewLocalFileStorage(baseDir, baseURL string) *LocalFileStorage {
	if baseDir == "" {
		baseDir = "./uploads"
	}
	if baseURL == "" {
		baseURL = "/uploads"
	}
	_ = os.MkdirAll(baseDir, 0o755)
	return &LocalFileStorage{BaseDir: baseDir, BaseURL: baseURL}
}

func (s *LocalFileStorage) Upload(ctx context.Context, data []byte, contentType string) (string, error) {
	select {
	case <-ctx.Done():
		return "", ctx.Err()
	default:
	}
	if len(data) == 0 {
		return "", fmt.Errorf("no data provided")
	}
	ext := extensionFromContentType(contentType)
	
	if strings.HasPrefix(contentType, "data:") {
		if i := strings.Index(contentType, ";"); i > 5 {
			if e := extensionFromContentType(contentType[len("data:"):i]); e != "" {
				ext = e
			}
		}
	}
	filename := fmt.Sprintf("%d_%s%s", time.Now().UnixNano(), uuid.New().String(), ext)
	fullPath := filepath.Join(s.BaseDir, filename)
	if err := os.MkdirAll(s.BaseDir, 0o755); err != nil {
		return "", err
	}
	if err := os.WriteFile(fullPath, data, 0o644); err != nil {
		return "", err
	}
	
	public := s.BaseURL
	if !strings.HasPrefix(public, "/") {
		public = "/" + public
	}
	public = strings.TrimRight(public, "/") + "/" + filename
	return public, nil
}

func extensionFromContentType(ct string) string {
	switch strings.ToLower(strings.TrimSpace(ct)) {
	case "image/jpeg", "image/jpg":
		return ".jpg"
	case "image/png":
		return ".png"
	case "image/webp":
		return ".webp"
	case "image/gif":
		return ".gif"
	case "video/mp4":
		return ".mp4"
	case "audio/mpeg", "audio/mp3", "voice":
		return ".mp3"
	case "image":
		return ".jpg"
	default:
		return ".bin"
	}
}
