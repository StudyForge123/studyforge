resource "aws_cognito_user_pool" "main" {
  name = "${var.project}-user-pool-${var.stage}"

  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
    require_uppercase = true
  }

  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
    email_subject        = "Account Confirmation"
    email_message        = "Your confirmation code is {####}"
  }

  schema {
    attribute_data_type = "String"
    developer_only_attribute = false
    mutable = true
    name = "email"
    required = true

    string_attribute_constraints {
      min_length = 0
      max_length = 2048
    }
  }

  force_alias_creation = true
}

resource "aws_cognito_user_pool_client" "client" {
  name = "${var.project}-user-pool-client-${var.stage}"

  user_pool_id = aws_cognito_user_pool.main.id

  generate_secret     = false
  explicit_auth_flows = ["ALLOW_USER_SRP_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"]
  
  # Prevent user existence errors to avoid enumeration attacks
  prevent_user_existence_errors = "ENABLED"
}

output "cognito_user_pool_id" {
  value = aws_cognito_user_pool.main.id
}

output "cognito_user_pool_client_id" {
  value = aws_cognito_user_pool_client.client.id
}
