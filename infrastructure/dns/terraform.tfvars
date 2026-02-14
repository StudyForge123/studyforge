domain_name = "studyforge.us"
create_www  = true

# Phase gating
enable_dependent_records = true
enable_alias_records     = true

# Remote state for app stack (CloudFront outputs)
app_state_bucket = "studybuddy-tfstate-unique"
app_state_key    = "dev/app.tfstate"
app_state_region = "us-east-1"