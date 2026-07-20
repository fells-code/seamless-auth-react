---
'@seamless-auth/react': patch
---

Correct the organization response types, checked against the API's declared response schemas.

- `addOrganizationMember` and `updateOrganizationMember` return `OrganizationMembershipResult` (`{ membership }`). They were typed as returning a members list, so reading `.members` gave `undefined`.
- `removeOrganizationMember` returns `MessageResult`, not a members list.
- `switchOrganization` returns `OrganizationSwitchResult` (`{ message, organizationId, organization }`), which describes what the endpoint actually sends.

`OrganizationMembershipResult` and `OrganizationSwitchResult` are new exports.
