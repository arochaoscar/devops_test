# Look up the existing hosted zone by domain name
data "aws_route53_zone" "this" {
  name         = var.domain_name
  private_zone = false
}

# A record — root domain pointing to ALB
resource "aws_route53_record" "root" {
  zone_id = data.aws_route53_zone.this.zone_id
  name    = var.subdomain != "" ? "${var.subdomain}.${var.domain_name}" : var.domain_name
  type    = "A"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}
