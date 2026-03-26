variable "domain_name" {
  description = "Root domain name (e.g., arochaoscar.online)"
  type        = string
}

variable "subdomain" {
  description = "Subdomain prefix (e.g., 'test' for test.arochaoscar.online). Empty string for root domain."
  type        = string
  default     = ""
}

variable "alb_dns_name" {
  description = "ALB DNS name"
  type        = string
}

variable "alb_zone_id" {
  description = "ALB hosted zone ID (for alias record)"
  type        = string
}
