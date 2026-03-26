# =============================================================================
# ACM Certificate Module
# =============================================================================
# Creates an SSL/TLS certificate for the domain with automatic DNS validation.
#
# The certificate covers both the root domain and all subdomains via wildcard:
#   - arochaoscar.online       (root)
#   - *.arochaoscar.online     (wildcard — covers test.arochaoscar.online, etc.)
#
# Validation flow:
#   1. ACM issues a certificate and provides CNAME records for validation
#   2. This module creates those CNAME records in Route 53 automatically
#   3. ACM verifies the records and marks the certificate as "Issued"
#   4. The validation resource blocks until the certificate is fully valid
#
# Both environments share the same certificate (wildcard covers all subdomains).
# =============================================================================

# Request the certificate for the root domain + wildcard SAN
# create_before_destroy ensures zero-downtime certificate rotation
resource "aws_acm_certificate" "this" {
  domain_name               = var.domain_name
  subject_alternative_names = ["*.${var.domain_name}"]
  validation_method         = "DNS"

  tags = merge(var.tags, { Name = "${var.project}-cert" })

  lifecycle {
    create_before_destroy = true
  }
}

# Create the DNS CNAME records required by ACM to prove domain ownership.
# for_each iterates over each domain_validation_option (root + wildcard)
# and creates the corresponding Route 53 record.
resource "aws_route53_record" "validation" {
  for_each = {
    for dvo in aws_acm_certificate.this.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  zone_id = var.zone_id
  name    = each.value.name
  type    = each.value.type
  records = [each.value.record]
  ttl     = 60

  allow_overwrite = true
}

# Wait for ACM to validate the certificate before downstream resources
# (ALB HTTPS listener) can reference it. This blocks terraform apply
# until the certificate status changes to "Issued".
resource "aws_acm_certificate_validation" "this" {
  certificate_arn         = aws_acm_certificate.this.arn
  validation_record_fqdns = [for record in aws_route53_record.validation : record.fqdn]
}
