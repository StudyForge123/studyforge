locals {
  tag_mutability = var.mutable_tags ? "MUTABLE" : "IMMUTABLE"
}

resource "aws_ecr_repository" "repos" {
  for_each             = toset(var.repo_names)
  name                 = "${var.project}/${each.value}"
  image_tag_mutability = local.tag_mutability

  image_scanning_configuration {
    scan_on_push = var.scan_on_push
  }
}

# Lifecycle policy: keep only last N images (any tag), expire older
resource "aws_ecr_lifecycle_policy" "lifecycle" {
  for_each   = aws_ecr_repository.repos
  repository = each.value.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last ${var.retain_last} images"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = var.retain_last
        }
        action = { type = "expire" }
      }
    ]
  })
}