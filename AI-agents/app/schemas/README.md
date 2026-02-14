## Database Schema

The database schema is as follows:

- **users**: id, name, email, created_at
- **classes**: id, user_id, name, code, instructor, created_at
- **files**: id, class_id, file_name, file_path, file_type, file_size, uploaded_at

## How to run the database migrations

1. Go to `AI-agents`
2. Open terminal
3. Run `flyway migrate`