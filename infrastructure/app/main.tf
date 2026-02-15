############################
# Data Sources
############################

data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }
}

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default_vpc_subnets" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# Look up the certificate created by the DNS stack
data "aws_acm_certificate" "site" {
  count       = var.custom_domain_enabled && var.domain_name != "" ? 1 : 0
  domain      = var.domain_name
  statuses    = ["ISSUED"]
  most_recent = true
}

locals {
  # Use the certificate_arn from variable if provided (override), 
  # otherwise try to get it from the data source lookup if enabled.
  certificate_arn = var.certificate_arn != "" ? var.certificate_arn : try(data.aws_acm_certificate.site[0].arn, "")
}

############################
# Frontend - S3 Static Website
############################

resource "aws_s3_bucket" "frontend" {
  bucket = var.frontend_bucket_name
}

resource "aws_s3_bucket_website_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  index_document { suffix = "index.html" }
  error_document { key = "index.html" }
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket                  = aws_s3_bucket.frontend.id
  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "frontend_public_read" {
  bucket = aws_s3_bucket.frontend.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = "*"
      Action    = ["s3:GetObject"]
      Resource  = ["${aws_s3_bucket.frontend.arn}/*"]
    }]
  })

  depends_on = [aws_s3_bucket_public_access_block.frontend]
}

############################
# CloudFront Distribution
############################

resource "aws_cloudfront_distribution" "site" {
  origin {
    domain_name = aws_s3_bucket_website_configuration.frontend.website_endpoint
    origin_id   = "S3-${aws_s3_bucket.frontend.id}"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"

  # If you want to use the custom domain here, you must add 'aliases'
  # BUT ONLY if the ACM cert is also here or passed in.
  aliases = var.custom_domain_enabled && var.domain_name != "" ? [var.domain_name, "www.${var.domain_name}"] : []

  # The user's DNS stack creates the cert.
  # Circular dependency risk: DNS/ACM needs domain -> App needs Cert.
  # Usually:
  # 1. App creates CloudFront with default cert.
  # 2. DNS creates ACM + Validates.
  # 3. App updates CloudFront with Alias + ACM Cert.
  #
  # However, the user's `dns` stack reads `app` outputs for CloudFront domain.
  # Use default viewer cert for now to get the distribution domain.

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.frontend.id}"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = local.certificate_arn == "" ? true : false
    acm_certificate_arn            = local.certificate_arn != "" ? local.certificate_arn : null
    ssl_support_method             = local.certificate_arn != "" ? "sni-only" : null
    minimum_protocol_version       = local.certificate_arn != "" ? "TLSv1.2_2021" : null
  }
}

############################
# Secrets Manager
############################

resource "aws_secretsmanager_secret" "openai" {
  name                    = var.openai_secret_name
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret" "mongo" {
  name                    = var.mongo_secret_name
  recovery_window_in_days = 0
}

############################
# IAM for EC2
############################

data "aws_iam_policy_document" "ec2_assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "api_role" {
  name               = "studybuddy-api-role"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume.json
}

data "aws_iam_policy_document" "secret_access" {
  statement {
    effect = "Allow"
    actions = [
      "secretsmanager:GetSecretValue",
      "secretsmanager:DescribeSecret"
    ]
    resources = [
      aws_secretsmanager_secret.openai.arn,
      aws_secretsmanager_secret.mongo.arn
    ]
  }
}

resource "aws_iam_policy" "secret_policy" {
  name   = "studybuddy-secret-read"
  policy = data.aws_iam_policy_document.secret_access.json
}

resource "aws_iam_role_policy_attachment" "attach_secret_policy" {
  role       = aws_iam_role.api_role.name
  policy_arn = aws_iam_policy.secret_policy.arn
}

resource "aws_iam_instance_profile" "api_profile" {
  name = "studybuddy-api-profile"
  role = aws_iam_role.api_role.name
}

############################
# Security Group
############################

resource "aws_security_group" "api_sg" {
  name   = "studybuddy-api-sg"
  vpc_id = data.aws_vpc.default.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 8000
    to_port     = 8000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.ssh_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

############################
# EC2 Instance
############################

locals {
  use_key = length(trimspace(var.key_pair_name)) > 0
}

resource "aws_instance" "api" {
  ami                    = data.aws_ami.al2023.id
  instance_type          = var.instance_type
  subnet_id              = data.aws_subnets.default_vpc_subnets.ids[0]
  vpc_security_group_ids = [aws_security_group.api_sg.id]
  key_name               = local.use_key ? var.key_pair_name : null
  iam_instance_profile   = aws_iam_instance_profile.api_profile.name

  user_data = <<-EOF
    #!/bin/bash
    dnf update -y
    dnf install -y docker awscli
    systemctl enable docker
    systemctl start docker
  EOF

  tags = {
    Name = "studybuddy-api"
  }
}

############################
# Cognito
############################

resource "aws_cognito_user_pool" "main" {
  name = "${var.project}-user-pool"

  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
    require_uppercase = true
  }

  mfa_configuration = "OFF"

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }
}

resource "aws_cognito_user_pool_client" "web" {
  name = "${var.project}-web-client"

  user_pool_id = aws_cognito_user_pool.main.id

  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code", "implicit"]
  allowed_oauth_scopes                 = ["email", "openid", "profile"]
  supported_identity_providers         = ["COGNITO"]

  callback_urls = var.callback_urls
  logout_urls   = var.logout_urls
}

resource "aws_cognito_user_pool_domain" "main" {
  domain       = var.cognito_domain_prefix
  user_pool_id = aws_cognito_user_pool.main.id
}
