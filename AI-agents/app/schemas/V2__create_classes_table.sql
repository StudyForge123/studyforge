CREATE TABLE classes (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50),
    instructor VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_classes_user
        FOREIGN KEY (id)
        REFERENCES users(id)
        ON DELETE CASCADE
);