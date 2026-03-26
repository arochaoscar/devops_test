variable "project" {
  description = "Project name used for resource naming"
  type        = string
}

variable "domain_name" {
  description = "Root domain name (e.g., arochaoscar.online)"
  type        = string
}

variable "zone_id" {
  description = "Route 53 hosted zone ID"
  type        = string
}

variable "tags" {
  description = "Common tags for all resources"
  type        = map(string)
  default     = {}
}
