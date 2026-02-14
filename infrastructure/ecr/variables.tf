variable "project" {
  type    = string
  default = "studybuddy"
}

# Repos you want to persist (add more names anytime)
variable "repo_names" {
  type    = list(string)
  default = ["backend"]
}

# Keep last N images (MVP-friendly cleanup)
variable "retain_last" {
  type    = number
  default = 20
}

variable "scan_on_push" {
  type    = bool
  default = true
}

variable "mutable_tags" {
  type    = bool
  default = true
}