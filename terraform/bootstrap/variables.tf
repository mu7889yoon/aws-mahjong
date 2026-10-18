variable "aws_region" {
  description = "AWS region for the state bucket and GitHub Actions role."
  type        = string
  default     = "ap-northeast-1"
}

variable "state_bucket_name" {
  description = "Globally unique name for the private Terraform state bucket."
  type        = string
}

variable "github_repository" {
  description = "GitHub repository allowed to deploy, in owner/name format."
  type        = string
  default     = "mu7889yoon/aws-mahjong"
}

variable "github_environment" {
  description = "GitHub Actions environment used by the deployment job."
  type        = string
  default     = "github-pages"
}
