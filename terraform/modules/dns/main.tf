# =============================================================================
# DNS Module
# =============================================================================
# Creates a Route 53 A record (alias) pointing the domain to the ALB.
#
# Usage per environment:
#   - prod: subdomain = ""     → arochaoscar.online       → ALB
#   - test: subdomain = "test" → test.arochaoscar.online   → ALB
#
# Uses an alias record instead of a CNAME because:
#   - Alias records work at the zone apex (root domain)
#   - No additional DNS lookup cost (resolved within AWS)
#   - evaluate_target_health enables automatic failover
# =============================================================================

resource "aws_route53_record" "root" {
  zone_id = var.zone_id
  name    = var.subdomain != "" ? "${var.subdomain}.${var.domain_name}" : var.domain_name
  type    = "A"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}
