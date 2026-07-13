package repository

import (
	"context"
	"database/sql"
	"log"
	"time"
	"v3/internal/models"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

type UserRepository struct {
	db *pgxpool.Pool
}

func NewUserRepository(db *pgxpool.Pool) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) CreateUser(ctx context.Context, email, password, name string) (*models.User, error) {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user := &models.User{
		ID:        uuid.New(),
		Email:     email,
		Password:  string(hashedPassword),
		Name:      name,
		CreatedAt: time.Now(),
		LastSeen:  time.Now(),
	}

	
	log.Printf("Creating user: Email=%s, Name=%s, PasswordHash=%s",
		user.Email, user.Name, user.Password)

	_, err = r.db.Exec(ctx, `
        INSERT INTO users (id, email, password_hash, name, created_at, last_seen)
        VALUES ($1, $2, $3, $4, $5, $6)`,
		user.ID, user.Email, user.Password, user.Name, user.CreatedAt, user.LastSeen,
	)

	if err != nil {
		log.Printf("DB error: %v", err)
	}

	return user, err
}

func (r *UserRepository) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	user := &models.User{}
	var avatarURL sql.NullString
	var lastSeen sql.NullTime

	err := r.db.QueryRow(ctx, `
		SELECT id, email, password_hash, name, avatar_url, created_at, last_seen
		FROM users WHERE email = $1`, email,
	).Scan(
		&user.ID,
		&user.Email,
		&user.Password,
		&user.Name,
		&avatarURL,
		&user.CreatedAt,
		&lastSeen,
	)

	if avatarURL.Valid {
		user.AvatarURL = avatarURL.String
	}
	if lastSeen.Valid {
		user.LastSeen = lastSeen.Time
	}

	return user, err
}

func (r *UserRepository) UpdateUser(ctx context.Context, userID uuid.UUID, name, avatarURL string) error {
	_, err := r.db.Exec(ctx, `
		UPDATE users 
		SET name = $1, avatar_url = $2 
		WHERE id = $3`,
		name, avatarURL, userID,
	)
	return err
}

func (r *UserRepository) GetUserByID(ctx context.Context, userID uuid.UUID) (*models.User, error) {
	user := &models.User{}
	var avatarURL sql.NullString
	var lastSeen sql.NullTime

	err := r.db.QueryRow(ctx, `
		SELECT id, email, password_hash, name, avatar_url, created_at, last_seen 
		FROM users WHERE id = $1`, userID,
	).Scan(
		&user.ID,
		&user.Email,
		&user.Password,
		&user.Name,
		&avatarURL,
		&user.CreatedAt,
		&lastSeen,
	)

	if avatarURL.Valid {
		user.AvatarURL = avatarURL.String
	}
	if lastSeen.Valid {
		user.LastSeen = lastSeen.Time
	}

	return user, err
}

func (r *UserRepository) GetUsersByIDs(ctx context.Context, userIDs []uuid.UUID) ([]*models.User, error) {
	if len(userIDs) == 0 {
		return []*models.User{}, nil
	}

	query := `
		SELECT id, email, password_hash, name, avatar_url, created_at, last_seen 
		FROM users WHERE id = ANY($1)`

	rows, err := r.db.Query(ctx, query, userIDs)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []*models.User
	for rows.Next() {
		user := &models.User{}
		var avatarURL sql.NullString
		var lastSeen sql.NullTime

		if err := rows.Scan(
			&user.ID,
			&user.Email,
			&user.Password,
			&user.Name,
			&avatarURL,
			&user.CreatedAt,
			&lastSeen,
		); err != nil {
			return nil, err
		}

		if avatarURL.Valid {
			user.AvatarURL = avatarURL.String
		}
		if lastSeen.Valid {
			user.LastSeen = lastSeen.Time
		}

		users = append(users, user)
	}

	return users, nil
}
