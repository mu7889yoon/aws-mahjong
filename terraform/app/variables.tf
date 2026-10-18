variable "aws_region" {
  description = "AWS region for the public image API."
  type        = string
  default     = "ap-northeast-1"
}

variable "api_origin" {
  description = "Exact public website origin allowed by API Gateway CORS and the Lambda origin check."
  type        = string
  default     = "https://mu7889yoon.github.io"
}

variable "api_throttle_rate" {
  description = "API Gateway steady-state request limit for the whole API, in requests per second."
  type        = number
  default     = 3

  validation {
    condition     = var.api_throttle_rate > 0 && var.api_throttle_rate <= 10
    error_message = "api_throttle_rate must be greater than 0 and no more than 10 requests per second."
  }
}

variable "api_throttle_burst" {
  description = "API Gateway burst limit for the whole API."
  type        = number
  default     = 2

  validation {
    condition     = var.api_throttle_burst >= 1 && var.api_throttle_burst <= 20
    error_message = "api_throttle_burst must be between 1 and 20 requests."
  }
}

variable "typesafe_model" {
  description = "TypeSafe model used for image classification."
  type        = string
  default     = "jev-preview"
}
