output "frontend_bucket" {
  value = aws_s3_bucket.frontend.bucket
}

output "frontend_website_url" {
  value = aws_s3_bucket_website_configuration.frontend.website_endpoint
}

output "api_public_ip" {
  value = aws_instance.api.public_ip
}

output "api_public_dns" {
  value = aws_instance.api.public_dns
}

output "openai_secret_arn" {
  value = aws_secretsmanager_secret.openai.arn
}

output "mongo_secret_arn" {
  value = aws_secretsmanager_secret.mongo.arn
}