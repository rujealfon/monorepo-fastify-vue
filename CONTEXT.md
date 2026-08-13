# User Access

This context names the identity and access concepts shared by the applications.

## Language

**User**:
A person with a registered identity who can sign in and use protected application features.
_Avoid_: Account

**Profile**:
The personal information associated with a User, separate from credentials and access state.

**Session**:
A single signed-in relationship between a User and one client device. A User may have multiple concurrent Sessions.

## Notes

The API exposes the signed-in User's own record — Profile embedded — as a
single resource (`GET`/`PATCH /api/v1/profile/`), not as separate User and
Profile endpoints. Web's `session` feature owns reading and writing this
resource in full, including Profile fields, because both operations share one
cache entry and one race-safety guard (see
`apps/web/src/features/session/README.md`). The `profile` feature owns only
the Profile view/route, not Profile writes.
