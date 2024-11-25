# Security Policy

## Supported Versions

Given the early stage of the project, we currently only support the latest version with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 0.0.x   | :white_check_mark: |
| < 0.0.1 | :x:                |

## Reporting a Vulnerability

We take the security of Eliza seriously. If you believe you have found a security vulnerability, please report it to us following these steps:

### Private Reporting Process

1. **DO NOT** create a public GitHub issue for the vulnerability
2. Send an email to security@eliza.builders with:
    - A detailed description of the vulnerability
    - Steps to reproduce the issue
    - Potential impact of the vulnerability
    - Any possible mitigations you've identified

### What to Expect

-   **Initial Response**: Within 48 hours, you will receive an acknowledgment of your report
-   **Updates**: We will provide updates every 5 business days about the progress
-   **Resolution Timeline**: We aim to resolve critical issues within 15 days
-   **Disclosure**: We will coordinate with you on the public disclosure timing

## Security Best Practices

### For Contributors

1. **API Keys and Secrets**

    - Never commit API keys, passwords, or other secrets to the repository
    - Use environment variables as described in our secrets management guide
    - Rotate any accidentally exposed credentials immediately

2. **Dependencies**

    - Keep all dependencies up to date
    - Review security advisories for dependencies regularly
    - Use `pnpm audit` to check for known vulnerabilities

3. **Code Review**
    - All code changes must go through pull request review
    - Security-sensitive changes require additional review
    - Enable branch protection on main branches

### For Users

1. **Environment Setup**

    - Follow our [secrets management guide](docs/guides/secrets-management.md) for secure configuration
    - Use separate API keys for development and production
    - Regularly rotate credentials

2. **Model Provider Security**

    - Use appropriate rate limiting for API calls
    - Monitor usage patterns for unusual activity
    - Implement proper authentication for exposed endpoints

3. **Platform Integration**
    - Use separate bot tokens for different environments
    - Implement proper permission scoping for platform APIs
    - Regular audit of platform access and permissions

## Security Features

### Current Implementation

-   Environment variable based secrets management
-   Type-safe API implementations
-   Automated dependency updates via Renovate
-   Continuous Integration security checks

### Planned Improvements

1. **Q4 2024**

    - Automated security scanning in CI pipeline
    - Enhanced rate limiting implementation
    - Improved audit logging

2. **Q1 2025**
    - Security-focused documentation improvements
    - Enhanced platform permission management
    - Automated vulnerability scanning

## Vulnerability Disclosure Policy

We follow a coordinated disclosure process:

1. Reporter submits vulnerability details
2. Our team validates and assesses the report
3. We develop and test a fix
4. Fix is deployed to supported versions
5. Public disclosure after 30 days or by mutual agreement

## Recognition

We believe in recognizing security researchers who help improve our security. Contributors who report valid security issues will be:

-   Credited in our security acknowledgments (unless they wish to remain anonymous)
-   Added to our security hall of fame
-   Considered for our bug bounty program (coming soon)

## License Considerations

As an MIT licensed project, users should understand:

-   The software is provided "as is"
-   No warranty is provided
-   Users are responsible for their own security implementations
-   Contributors grant perpetual license to their contributions

## Contact

-   Security Issues: security@eliza.builders
-   General Questions: Join our [Discord](https://discord.gg/ai16z)
-   Updates: Follow our [security advisory page](https://github.com/ai16z/eliza/security/advisories)
