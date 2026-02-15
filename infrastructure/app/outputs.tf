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

output "api_instance_id" {
  value = aws_instance.api.id
}

output "openai_secret_arn" {
  value = aws_secretsmanager_secret.openai.arn
}

output "mongo_secret_arn" {
  value = aws_secretsmanager_secret.mongo.arn
}

output "cloudfront_domain_name" {
  value = aws_cloudfront_distribution.site.domain_name
}

output "cloudfront_distribution_id" {
  value = aws_cloudfront_distribution.site.id
}

output "cloudfront_hosted_zone_id" {
  value = aws_cloudfront_distribution.site.hosted_zone_id
}

output "cognito_user_pool_id" {
  value = aws_cognito_user_pool.main.id
}

output "cognito_client_id" {
  value = aws_cognito_user_pool_client.web.id
}

output "cognito_domain" {
  value = "https://${aws_cognito_user_pool_domain.main.domain}.auth.us-east-1.amazoncognito.com"
}

output "worker_image_uri" {
  value = local.worker_image_uri
}
