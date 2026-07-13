package repository

import (
	"context"
	"time"
	"v3/internal/models"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type MessageRepository struct {
	db *pgxpool.Pool
}

func NewMessageRepository(db *pgxpool.Pool) *MessageRepository {
	return &MessageRepository{db: db}
}

func (r *MessageRepository) CreateMessage(
	ctx context.Context,
	conversationID, senderID uuid.UUID,
	messageType models.MessageType,
	content string,
) (*models.Message, error) {
	msg := &models.Message{
		ID:             uuid.New(),
		ConversationID: conversationID,
		SenderID:       senderID,
		Type:           messageType,
		Content:        content,
		CreatedAt:      time.Now(),
	}

	_, err := r.db.Exec(ctx, `
		INSERT INTO messages (id, conversation_id, sender_id, type, content, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)`,
		msg.ID, msg.ConversationID, msg.SenderID, msg.Type, msg.Content, msg.CreatedAt,
	)

	return msg, err
}

func (r *MessageRepository) GetMessages(
	ctx context.Context,
	conversationID uuid.UUID,
	limit, offset int,
) ([]*models.Message, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, conversation_id, sender_id, type, content, created_at, is_read, is_edited
		FROM messages
		WHERE conversation_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3`,
		conversationID, limit, offset,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var messages []*models.Message
	for rows.Next() {
		msg := &models.Message{}
		if err := rows.Scan(
			&msg.ID, &msg.ConversationID, &msg.SenderID,
			&msg.Type, &msg.Content, &msg.CreatedAt, &msg.IsRead, &msg.IsEdited,
		); err != nil {
			return nil, err
		}
		messages = append(messages, msg)
	}

	return messages, nil
}

func (r *MessageRepository) MarkMessagesAsRead(ctx context.Context, conversationID, readerID uuid.UUID) error {
	_, err := r.db.Exec(ctx, `
		UPDATE messages 
		SET is_read = true 
		WHERE conversation_id = $1 
		  AND sender_id != $2 
		  AND is_read = false`,
		conversationID, readerID,
	)
	return err
}

func (r *MessageRepository) EditMessage(ctx context.Context, messageID, senderID uuid.UUID, newContent string) error {
	_, err := r.db.Exec(ctx, `
		UPDATE messages 
		SET content = $1, is_edited = true 
		WHERE id = $2 AND sender_id = $3`,
		newContent, messageID, senderID,
	)
	return err
}
