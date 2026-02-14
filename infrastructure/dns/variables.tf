# Root domain (must match what you bought on GoDaddy)
# Example: "studyforge.com"
variable "domain_name" {
  type = string
}

# Whether to create www.domain.com in addition to apex
variable "create_www" {
  type    = bool
  default = true
}

# Phase control:
# false = create hosted zone only (so you can update GoDaddy NS)
# true  = create ACM cert + validation + alias records
variable "enable_dependent_records" {
  type    = bool
  default = false
}

# Controls whether alias A/AAAA records to CloudFront are created
# (only applies if enable_dependent_records = true)
variable "enable_alias_records" {
  type    = bool
  default = false
}

# Remote state config for reading CloudFront outputs from 10-app stack
variable "app_state_bucket" {
  type    = string
  default = "studybuddy-tfstate-unique"
}

variable "app_state_key" {
  type    = string
  default = "dev/app.tfstate"
}

variable "app_state_region" {
  type    = string
  default = "us-east-1"
}