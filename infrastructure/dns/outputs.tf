output "certificate_arn" {
  value = try(aws_acm_certificate_validation.site[0].certificate_arn, null)
}

output "name_servers" {
  value = aws_route53_zone.zone.name_servers
}

output "domain_name" {
  value = var.domain_name
}