# SuperForge Backend

## Setup

1.  **Create Virtual Environment**:
    ```bash
    python -m venv .venv
    .\.venv\Scripts\activate
    ```

2.  **Install Dependencies**:
    ```bash
    pip install -r requirements.txt
    ```

3.  **Environment Variables**:
    - Copy `.env.example` to `.env`
    - Fill in `COGNITO_USER_POOL_ID` and `COGNITO_APP_CLIENT_ID` (Get these from AWS or Terraform output)

## Running

```bash
uvicorn app.main:app --reload
```

## API Documentation

- Swagger UI: http://localhost:8000/docs
