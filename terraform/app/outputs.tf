output "classifier_endpoint" {
  description = "Public endpoint used by the GitHub Pages build."
  value       = "${aws_apigatewayv2_api.image_api.api_endpoint}/classify"
}

output "typesafe_api_key_secret_arn" {
  description = "Secret metadata ARN. Add the TypeSafe key value through Secrets Manager after initial deployment."
  value       = aws_secretsmanager_secret.typesafe_api_key.arn
}
