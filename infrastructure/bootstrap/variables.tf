variable "region" {
  type    = string
  default = "us-east-1"
}

variable "project" {
  type    = string
  default = "studybuddy"
}

# The ARN of the identity that will run bootstrap AND later assume the TerraformRole.
# Examples:
# - arn:aws:iam::123456789012:user/your-user
# - arn:aws:iam::123456789012:role/AWSReservedSSO_...
variable "admin_principal_arn" {
  type = string
}

variable "state_bucket_name" {
  type = string
}

variable "lock_table_name" {
  type    = string
  default = "tf-locks"
}
