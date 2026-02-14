output "state_bucket" {
  value = aws_s3_bucket.tf_state.bucket
}

output "lock_table" {
  value = aws_dynamodb_table.tf_lock.name
}

output "terraform_role_arn" {
  value = aws_iam_role.terraform_role.arn
}

output "account_id" {
  value = data.aws_caller_identity.current.account_id
}