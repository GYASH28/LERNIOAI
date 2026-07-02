# Test Report

## Added Regression Coverage

- `src/lib/user-dto.test.ts`: public user DTO strips forbidden fields and detects leaks.
- `src/lib/roles.test.ts`: canonical role normalization, permissions, and assignment rules.
- `src/lib/campus-auth.test.ts`: invalid departments do not silently default; roll number can be omitted.
- `src/lib/rate-limit.test.ts`: rate-limit keys are normalized and hashed.
- `src/lib/auth-policy.test.ts`: unsafe callback URLs are rejected.

## Latest Results

```bash
npm run db:generate
# passed

npm run typecheck
# passed

npm run test
# 12 files passed, 26 tests passed

npm run lint
# passed with warnings only

npm run build
# passed

npm run test:e2e
# 4 passed

npm run test:a11y
# 2 passed

npm audit --audit-level=high
# found 0 vulnerabilities
```

## Remaining Test Work

- Integration tests with isolated PostgreSQL.
- E2E signup/login/logout two-account leakage test.
- Password reset and email verification tests after those flows are implemented.
- Admin invite/revocation/role request approval workflow tests.
