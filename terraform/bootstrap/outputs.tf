output "github_actions_role_arn" {
  description = "Set this as the AWS_ROLE_ARN repository variable in GitHub Actions."
  value       = aws_iam_role.github_actions.arn
}

output "state_bucket_name" {
  description = "Set this as the TF_STATE_BUCKET repository variable in GitHub Actions."
  value       = aws_s3_bucket.terraform_state.bucket
}
