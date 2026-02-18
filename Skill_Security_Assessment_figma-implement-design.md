# Security Assessment: figma-implement-design

## Executive Summary
- Overall Risk Level: SAFE
- Source: Local skill + upstream GitHub reference (`openai/skills`)
- Evaluation Date: February 18, 2026
- Evaluator: Codex (Agent Skill Evaluator workflow)
- Critical Findings: No prompt-injection, obfuscation, or malicious code patterns were found. Main residual risk is trust in the remote MCP endpoint and OAuth flow.
- Recommendation: YES, use this skill with normal MCP security hygiene (trusted endpoint verification, least-privilege account use).

## Source & Provenance
- Local source reviewed: `C:\Users\OmiRahman\.codex\skills\figma-implement-design\SKILL.md`
- Local metadata reviewed: `C:\Users\OmiRahman\.codex\skills\figma-implement-design\agents\openai.yaml`
- Upstream reference found at GitHub repository `openai/skills` (matching skill content observed).
- No suspicious domain references found beyond official Figma URLs and MCP endpoint.

## Skill Structure Overview
- `SKILL.md` (workflow instructions only)
- `agents/openai.yaml` (UI metadata + MCP dependency declaration)
- `assets/figma-small.svg`, `assets/icon.svg`, `assets/figma.png` (static assets)
- No `scripts/` directory and no executable code payloads.

## SKILL.md Analysis
### Prompt Injection Detection
- No system-override patterns detected (`ignore previous`, `disregard`, `you are now`, etc.).
- No hidden Unicode/control-byte artifacts detected in `SKILL.md` (ASCII-only).
- No encoded/obfuscated instruction blocks (base64/hex/ROT patterns) detected.

### Suspicious Behavioral Instructions
- Instruction strictness is procedural (`"Follow these steps in order. Do not skip steps."` in `SKILL.md:24`), not safety-bypass behavior.
- No directives to hide actions from users, override consent, or evade platform safeguards.

### Over-Permissioned Requests
- Declares a single external dependency on Figma MCP in `agents/openai.yaml:10` and `agents/openai.yaml:14`.
- Requires OAuth login (`SKILL.md:35`) and remote MCP enablement (`SKILL.md:33`), which is expected for this function.
- No requests for arbitrary filesystem, credential scraping, or shell execution.

## Scripts Security Analysis
- No scripts present. No executable code to statically audit for command execution, exfiltration, or persistence.

## References & Assets Analysis
- SVG assets are static path/vector content; no script tags, event handlers, or embedded remote payloads were detected.
- Resource links in `SKILL.md` point to official Figma documentation URLs (`SKILL.md:262`-`SKILL.md:264`).

## Community Feedback & External Research
- Queries used:
  - `openai skills figma-implement-design`
  - `site:github.com openai/skills figma-implement-design`
  - `figma implement design skill security`
- Results:
  - Found upstream repo and related Figma MCP documentation.
  - No credible reports of malicious behavior specific to this skill name were found in sampled results.

## Attack Pattern Analysis
- Checked against known categories in `agent-skill-evaluator` attack pattern reference:
  - System override attempts: no match
  - Role manipulation: no match
  - Hidden Unicode / obfuscation: no match
  - Data exfiltration directives: no match
  - Privilege escalation instructions: no match
- Residual operational risk remains in external service trust (MCP endpoint integrity), not in the skill text itself.

## Risk Assessment

### Detailed Scoring
| Dimension | Score (0-100) | Justification |
|-----------|---------------|--------------|
| Prompt Injection | 96 | No override/manipulation patterns; plain procedural workflow only. |
| Code Safety | 98 | No executable scripts; metadata and docs only. |
| Data Privacy | 78 | Uses remote MCP + OAuth; design/context data flows through external service by design. |
| Source Trust | 90 | Local copy aligns with known `openai/skills` source and official Figma endpoints. |
| Functionality | 92 | Behavior claimed matches implementation scope; no hidden capabilities detected. |
| **OVERALL RATING** | **91** | Low risk in content; moderate operational dependency risk on remote MCP trust boundary. |

### Threat Summary
- Medium: External dependency trust (`https://mcp.figma.com/mcp`) and OAuth account/session handling.
- Low: Potential accidental exposure of design metadata if used in sensitive/private projects without governance.
- None found: prompt injection, hidden directives, malicious scripts, exfiltration code.

### False Positive Analysis
- Imperative language (e.g., strict workflow wording) is expected for implementation quality control and did not include safety bypass patterns.
- `localhost` asset usage guidance is contextually tied to MCP asset serving and is not itself a malicious indicator.

## Final Verdict

**Recommendation**: USE

**Reasoning**: The skill is instruction-only, contains no executable code, and shows no prompt-injection or malicious behavior patterns. Risks are primarily operational (trusting the MCP endpoint and OAuth flow), which are manageable.

**Specific Concerns**:
- Confirm MCP server endpoint authenticity before login.
- Use least-privileged Figma/org accounts for sensitive environments.

**Safe Use Cases**:
- Implementing UI components/layouts from Figma where MCP integration is expected.
- Teams with standard secret handling and external service trust controls.

**Alternative Skills**:
- If remote MCP is disallowed, use a local screenshot/spec-driven implementation workflow instead of this MCP-dependent skill.

## Evaluation Limitations
- Community-signal depth is limited to publicly indexed sources available at evaluation time.
- No dynamic runtime test of MCP transport/security posture was performed; this is a static content review.

## Evidence Appendix
- `SKILL.md:31` references MCP URL setup command.
- `SKILL.md:33` enables remote MCP client.
- `SKILL.md:35` requires OAuth login.
- `agents/openai.yaml:14` declares MCP endpoint `https://mcp.figma.com/mcp`.
- Automated string checks found no suspicious injection keywords or control characters in `SKILL.md`.
