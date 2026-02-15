terraform {
  backend "s3" {
    bucket         = "studybuddy-tfstate-unique"
    key            = "persistent/dns.tfstate"
    region         = "us-east-1"
    dynamodb_table = "studybuddy-tf-locks"
    encrypt        = true
  }
}