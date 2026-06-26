# API And Route Inventory

## Authority Pages

| Route | Required role | Purpose |
| --- | --- | --- |
| `/admin` | admin | Admin command center |
| `/admin/[module]` | admin | Access, curriculum, audit modules |
| `/coordinator` | coordinator or admin | Department operations |
| `/coordinator/[module]` | coordinator or admin | Assignments, reviews, analytics |
| `/teacher` | teacher or admin | Teacher studio |
| `/teacher/[module]` | teacher or admin | Content, questions, analytics |
| `/reviewer` | reviewer or admin | Review queue |
| `/reviewer/[module]` | reviewer or admin | Queue, citations, policy |
| `/moderator` | moderator or admin | Moderation desk |
| `/moderator/[module]` | moderator or admin | Reports, uploads, audit |
| `/cr` | cr or admin | Class representative hub |
| `/cr/[module]` | cr or admin | Resources, feedback, reports |

## Admin APIs

| Endpoint | Method | Authority | Notes |
| --- | --- | --- | --- |
| `/api/admin/users` | GET | active admin | Search, filter, paginate users |
| `/api/admin/users` | POST | active admin | Create non-admin user |
| `/api/admin/users/[id]` | PATCH | active admin | Update user; protects final admin |
| `/api/admin/role-requests` | GET | active admin | List requests |
| `/api/admin/role-assignments` | GET | active admin | List normalized assignments |
| `/api/admin/role-assignments` | POST | active admin | Create scoped non-admin assignment |
| `/api/admin/role-assignments/[id]` | DELETE | active admin | Revoke assignment; protects final admin |
| `/api/admin/audit` | GET | active admin | List audit events |

## Role Request APIs

| Endpoint | Method | Authority | Notes |
| --- | --- | --- | --- |
| `/api/roles/request` | POST | authenticated student/user | Create a role request |
| `/api/roles/request/[id]` | PATCH | admin/coordinator policy path | Approve/reject and create normalized rows |

## Student Routes Preserved

- `/dashboard`
- `/learn`
- `/practice`
- `/tutor`
- `/labs`
- `/coding`
- `/exams`
- `/revision`
- `/materials`
- `/planner`
- `/analytics`
- `/profile`

## Public Routes Preserved

- `/`
- `/sign-in`
- `/sign-up`
- `/forgot-password`
- `/reset-password`
- `/privacy`
- `/terms`
- `/support`
