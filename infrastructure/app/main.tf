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

############################
# Frontend - S3 Static Website
############################

resource "aws_s3_bucket" "frontend" {
  bucket = var.frontend_bucket_name
}

resource "aws_s3_bucket_website_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  index_document { suffix = "index.html" }
  error_document { key    = "index.html" }
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
  ami                         = data.aws_ami.al2023.id
  instance_type               = var.instance_type
  subnet_id                   = data.aws_subnets.default_vpc_subnets.ids[0]
  vpc_security_group_ids      = [aws_security_group.api_sg.id]
  key_name                    = local.use_key ? var.key_pair_name : null
  iam_instance_profile        = aws_iam_instance_profile.api_profile.name

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