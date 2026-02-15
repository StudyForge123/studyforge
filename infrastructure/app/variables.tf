variable "project" {
  type    = string
  default = "studybuddy"
}

variable "frontend_bucket_name" {
  type = string
}

variable "ssh_cidr" {
  type    = string
  default = "0.0.0.0/0"
}

variable "instance_type" {
  type    = string
  default = "t3.small"
}

variable "key_pair_name" {
  type    = string
  default = ""
}

variable "openai_secret_name" {
  type    = string
  default = "studybuddy/openai"
}

variable "mongo_secret_name" {
  type    = string
  default = "studybuddy/mongodb"
}

variable "domain_name" {
  type    = string
  default = ""
}

variable "custom_domain_enabled" {
  type    = bool
  default = false
}

variable "certificate_arn" {
  type    = string
  default = ""
}

variable "cognito_domain_prefix" {
  type        = string
  default     = "studyforge"
  description = "Unique prefix for the Cognito hosted UI"
}

variable "callback_urls" {
  type    = list(string)
  default = ["http://localhost:3000"]
}

variable "logout_urls" {
  type    = list(string)
  default = ["http://localhost:3000"]
}
