CREATE TABLE files (
    id SERIAL PRIMARY KEY,
    class_id INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_type VARCHAR(50),
    file_size BIGINT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_files_class
        FOREIGN KEY (id)
        REFERENCES classes(id)
        ON DELETE CASCADE
);