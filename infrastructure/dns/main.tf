# Hosted zone created in Route53 (GoDaddy will point NS here)
resource "aws_route53_zone" "zone" {
  name = var.domain_name
}

locals {
  zone_id = aws_route53_zone.zone.zone_id
}

# -------------------------
# Phase gate
# -------------------------
locals {
  # Phase 1: false -> only create hosted zone (output NS, change in GoDaddy)
  # Phase 2: true  -> create ACM validation + alias records
  enable_deps = var.enable_dependent_records
}

# CloudFront requires ACM cert in us-east-1
resource "aws_acm_certificate" "site" {
  count                   = local.enable_deps ? 1 : 0
  domain_name             = var.domain_name
  validation_method       = "DNS"
  subject_alternative_names = var.create_www ? ["www.${var.domain_name}"] : []

  lifecycle {
    create_before_destroy = true
  }
}

# DNS validation records (only in Phase 2)
resource "aws_route53_record" "cert_validation" {
  for_each = local.enable_deps ? {
    for dvo in aws_acm_certificate.site[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      type   = dvo.resource_record_type
      record = dvo.resource_record_value
    }
  } : {}

  zone_id = local.zone_id
  name    = each.value.name
  type    = each.value.type
  ttl     = 60
  records = [each.value.record]
}

resource "aws_acm_certificate_validation" "site" {
  count                   = local.enable_deps ? 1 : 0
  certificate_arn         = aws_acm_certificate.site[0].arn
  validation_record_fqdns = [for r in aws_route53_record.cert_validation : r.fqdn]
}

# Read CloudFront info from the app stack state (10-app)
data "terraform_remote_state" "app" {
  backend = "s3"
  config = {
    bucket = var.app_state_bucket
    key    = var.app_state_key
    region = var.app_state_region
  }
}

locals {
  cf_domain = try(data.terraform_remote_state.app.outputs.cloudfront_domain_name, null)
  cf_zone   = try(data.terraform_remote_state.app.outputs.cloudfront_hosted_zone_id, null)

  # Only create aliases in Phase 2 AND only if enabled and app outputs exist
  can_create_alias = local.enable_deps && var.enable_alias_records && local.cf_domain != null && local.cf_zone != null
}

# Apex records
resource "aws_route53_record" "apex_a" {
  count  = local.can_create_alias ? 1 : 0
  zone_id = local.zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = local.cf_domain
    zone_id                = local.cf_zone
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "apex_aaaa" {
  count  = local.can_create_alias ? 1 : 0
  zone_id = local.zone_id
  name    = var.domain_name
  type    = "AAAA"

  alias {
    name                   = local.cf_domain
    zone_id                = local.cf_zone
    evaluate_target_health = false
  }
}

# www records
resource "aws_route53_record" "www_a" {
  count  = (local.can_create_alias && var.create_www) ? 1 : 0
  zone_id = local.zone_id
  name    = "www.${var.domain_name}"
  type    = "A"

  alias {
    name                   = local.cf_domain
    zone_id                = local.cf_zone
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "www_aaaa" {
  count  = (local.can_create_alias && var.create_www) ? 1 : 0
  zone_id = local.zone_id
  name    = "www.${var.domain_name}"
  type    = "AAAA"

  alias {
    name                   = local.cf_domain
    zone_id                = local.cf_zone
    evaluate_target_health = false
  }
}