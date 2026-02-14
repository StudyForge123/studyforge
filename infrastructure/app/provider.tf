provider "aws" {
  region = "us-east-1"

  assume_role {
    role_arn = "arn:aws:iam::732772501381:role/studybuddy-TerraformRole"
  }
}