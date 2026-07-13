package repository

import (
	"context"
	"database/sql"
	"time"
	"v3/internal/models"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ConversationRepository struct {
	db *pgxpool.Pool
}

func NewConversationRepository(db *pgxpool.Pool) *ConversationRepository {
	return &ConversationRepository{db: db}
}

func (r *ConversationRepository) CreateConversation(
	ctx context.Context,
	isGroup bool,
	groupName string,
	participants []uuid.UUID,
) (*models.Conversation, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	conv := &models.Conversation{
		ID:        uuid.New(),
		IsGroup:   isGroup,
		GroupName: groupName,
		CreatedAt: time.Now(),
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO conversations (id, is_group, group_name, created_at)
		VALUES ($1, $2, $3, $4)`,
		conv.ID, conv.IsGroup, conv.GroupName, conv.CreatedAt,
	)
	if err != nil {
		return nil, err
	}

	for _, userID := range participants {
		_, err = tx.Exec(ctx, `
			INSERT INTO participants (conversation_id, user_id, joined_at)
			VALUES ($1, $2, $3)`,
			conv.ID, userID, time.Now(),
		)
		if err != nil {
			return nil, err
		}
	}

	if err = tx.Commit(ctx); err != nil {
		return nil, err
	}

	return conv, nil
}

func (r *ConversationRepository) GetUserConversations(
	ctx context.Context,
	userID uuid.UUID,
) ([]*models.Conversation, error) {
	rows, err := r.db.Query(ctx, `
		SELECT c.id, c.is_group, c.group_name, c.created_at,
		       (SELECT COUNT(m.id) FROM messages m WHERE m.conversation_id = c.id AND m.is_read = false AND m.sender_id != $1) as unread_count
		FROM conversations c
		JOIN participants p ON c.id = p.conversation_id
		WHERE p.user_id = $1
		ORDER BY c.created_at DESC`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var conversations []*models.Conversation
	for rows.Next() {
		conv := &models.Conversation{}
		var groupName sql.NullString

		if err := rows.Scan(
			&conv.ID, &conv.IsGroup, &groupName, &conv.CreatedAt, &conv.UnreadCount,
		); err != nil {
			return nil, err
		}

		if groupName.Valid {
			conv.GroupName = groupName.String
		}

		
		participants, err := r.getConversationParticipants(ctx, conv.ID)
		if err != nil {
			return nil, err
		}
		conv.Participants = participants

		conversations = append(conversations, conv)
	}

	return conversations, nil
}

func (r *ConversationRepository) getConversationParticipants(
	ctx context.Context,
	conversationID uuid.UUID,
) ([]models.User, error) {
	rows, err := r.db.Query(ctx, `
		SELECT u.id, u.name, u.email, u.avatar_url, u.created_at, u.last_seen
		FROM users u
		JOIN participants p ON u.id = p.user_id
		WHERE p.conversation_id = $1`,
		conversationID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var participants []models.User
	for rows.Next() {
		var user models.User
		var avatarURL sql.NullString
		var lastSeen sql.NullTime

		if err := rows.Scan(
			&user.ID, &user.Name, &user.Email, &avatarURL, &user.CreatedAt, &lastSeen,
		); err != nil {
			return nil, err
		}

		if avatarURL.Valid {
			user.AvatarURL = avatarURL.String
		}
		if lastSeen.Valid {
			user.LastSeen = lastSeen.Time
		}

		participants = append(participants, user)
	}

	return participants, nil
}

func (r *ConversationRepository) IsParticipant(
	ctx context.Context,
	conversationID, userID uuid.UUID,
) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM participants 
			WHERE conversation_id = $1 AND user_id = $2
		)`,
		conversationID, userID,
	).Scan(&exists)

	return exists, err
}
