# Security

## Reporting a vulnerability

Please **do not** open a public GitHub issue for undisclosed security vulnerabilities.

**Preferred:** use [GitHub Security Advisories](https://github.com/mystt/MySTT/security/advisories/new) for this repository (if enabled for the fork).

If that is not available, contact the maintainers through a private channel they designate for security reports.

Include:

- A concise description of the issue and its impact
- Steps to reproduce (proof-of-concept if applicable)
- Affected versions or commit range if known

We aim to acknowledge reasonable reports promptly; timelines depend on maintainer availability.

## Secure development notes

- Do not commit **API keys**, tokens, or `.env` files containing secrets (see `.gitignore`).
- Cloud dictation uses an **optional** OpenAI API key supplied by the user; treat local storage of secrets with care when changing related code.
