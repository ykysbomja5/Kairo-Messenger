package models

import (
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"username"`
	Email     string    `json:"email"`
	Password  string    `json:"-"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	AvatarURL string    `json:"avatar_url"`
	LastSeen  time.Time `json:"last_seen"`
}

type Conversation struct {
	ID           uuid.UUID `json:"id"`
	IsGroup      bool      `json:"is_group"`
	GroupName    string    `json:"group_name,omitempty"`
	GroupAvatar  string    `json:"group_avatar,omitempty"`
	LastMessage  *Message  `json:"last_message,omitempty"`
	Participants []User    `json:"participants"`
	CreatedAt    time.Time `json:"created_at"`
	UnreadCount  int       `json:"unread_count"`
}

type MessageType string

const (
	TextMessage  MessageType = "text"
	ImageMessage MessageType = "image"
	VideoMessage MessageType = "video"
	VoiceMessage MessageType = "voice"
)

type Message struct {
	ID             uuid.UUID   `json:"id"`
	ConversationID uuid.UUID   `json:"conversation_id"`
	SenderID       uuid.UUID   `json:"sender_id"`
	Type           MessageType `json:"type"`
	Content        string      `json:"content"`
	CreatedAt      time.Time   `json:"created_at"`
	IsRead         bool        `json:"is_read"`
	IsEdited       bool        `json:"is_edited"`
}
