provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project   = "aws-mahjong"
      ManagedBy = "Terraform"
    }
  }
}

data "aws_caller_identity" "current" {}

resource "aws_secretsmanager_secret" "typesafe_api_key" {
  name                    = "aws-mahjong/typesafe-api-key"
  description             = "TypeSafe API key used only by the AWS Mahjong image classifier Lambda."
  recovery_window_in_days = 7
}

resource "aws_iam_role" "classifier" {
  name = "aws-mahjong-classifier"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRole"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "classifier" {
  name = "aws-mahjong-classifier-runtime"
  role = aws_iam_role.classifier.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = aws_secretsmanager_secret.typesafe_api_key.arn
      },
      {
        Effect   = "Allow"
        Action   = ["logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "${aws_cloudwatch_log_group.classifier.arn}:*"
      },
    ]
  })
}

resource "aws_cloudwatch_log_group" "classifier" {
  name              = "/aws/lambda/aws-mahjong-tile-classifier"
  retention_in_days = 30
}

data "archive_file" "classifier" {
  type        = "zip"
  source_dir  = "${path.module}/../../backend/runtime-package"
  output_path = "${path.module}/classifier.zip"
}

resource "aws_lambda_function" "classifier" {
  function_name    = "aws-mahjong-tile-classifier"
  description      = "Recognizes AWS Mahjong tile candidates from an uploaded photo."
  role             = aws_iam_role.classifier.arn
  runtime          = "nodejs22.x"
  handler          = "dist/handler.handler"
  architectures    = ["x86_64"]
  memory_size      = 2048
  timeout          = 29
  filename         = data.archive_file.classifier.output_path
  source_code_hash = data.archive_file.classifier.output_base64sha256

  environment {
    variables = {
      ALLOWED_ORIGIN              = var.api_origin
      TYPESAFE_API_KEY_SECRET_ARN = aws_secretsmanager_secret.typesafe_api_key.arn
      TYPESAFE_MODEL              = var.typesafe_model
    }
  }

  depends_on = [
    aws_cloudwatch_log_group.classifier,
    aws_iam_role_policy.classifier,
  ]
}

resource "aws_apigatewayv2_api" "image_api" {
  name          = "aws-mahjong-image-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = [var.api_origin]
    allow_methods = ["POST", "OPTIONS"]
    allow_headers = ["content-type"]
    max_age       = 600
  }
}

resource "aws_apigatewayv2_integration" "classifier" {
  api_id                 = aws_apigatewayv2_api.image_api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.classifier.invoke_arn
  payload_format_version = "2.0"
  timeout_milliseconds   = 29000
}

resource "aws_apigatewayv2_route" "classify" {
  api_id    = aws_apigatewayv2_api.image_api.id
  route_key = "POST /classify"
  target    = "integrations/${aws_apigatewayv2_integration.classifier.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.image_api.id
  name        = "$default"
  auto_deploy = true

  default_route_settings {
    throttling_rate_limit  = var.api_throttle_rate
    throttling_burst_limit = var.api_throttle_burst
  }
}

resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowImageApiInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.classifier.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.image_api.execution_arn}/*/*"
}
