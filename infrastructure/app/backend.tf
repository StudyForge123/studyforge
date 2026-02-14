terraform {
  backend "s3" {
    bucket         = "REPLACE_WITH_BOOTSTRAP_state_bucket"
    key            = "dev/app.tfstate"
    region         = "us-east-1"
    dynamodb_table = "REPLACE_WITH_BOOTSTRAP_lock_table"
    encrypt        = true
  }
}