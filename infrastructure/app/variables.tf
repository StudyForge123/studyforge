variable "project" {
  type    = string
  default = "studybuddy"
}

variable "region" {
  type    = string
  default = "us-east-1"
}

# React/Vite static site bucket name must be globally unique.
variable "frontend_bucket_name" {
  type = string
}

# Optional: lock down SSH to your IP. For MVP you can set 0.0.0.0/0 (not recommended).
variable "ssh_cidr" {
  type    = string
  default = "0.0.0.0/0"
}

# EC2 settings (MVP)
variable "instance_type" {
  type    = string
  default = "t3.small"
}

# You can use an existing key pair name, or leave blank to skip SSH key attach.
variable "key_pair_name" {
  type    = string
  default = ""
}