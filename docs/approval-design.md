# Product Approval Workflow — Future Design

Phase 3+. MVP treats all admin-created products as approved.

## Statuses

```ts
type ProductApprovalStatus = 'draft' | 'pending_review' | 'approved' | 'rejected';
```

## Custom fields (on Medusa Product)

| Field | Type | Notes |
|---|---|---|
| `approval_status` | enum | Default `draft` for vendor uploads, `approved` for admin-created |
| `approval_note` | text | Reviewer's note when rejecting |
| `submitted_by_vendor_id` | uuid | FK to vendor user |
| `approved_by_user_id` | uuid | FK to reviewer/admin user |
| `approved_at` | timestamptz | |
| `rejected_by_user_id` | uuid | |
| `rejected_at` | timestamptz | |

Add via Medusa v2 custom module — extend the Product entity with a linked `ProductApproval` model.

## Rules

- **Super admin** — can create approved products directly; can override reviewer decisions.
- **Vendor / shop owner** — can create drafts, submit for review, edit rejected and resubmit. Cannot publish directly.
- **Reviewer** — sees `pending_review` only; approves or rejects with reason.
- **Shopper** — public Store API filters `approval_status = 'approved'`.

## Public filtering

The shopper API (`GET /store/products`) must hide unapproved products. Implement via a Medusa middleware or override the product query to apply:

```sql
WHERE approval_status = 'approved'
```

## Audit log table

```ts
id              uuid
product_id      uuid
actor_user_id   uuid
action          enum  -- product_created | submitted_for_review | approved | rejected | edited_after_rejection | resubmitted
old_status      enum
new_status      enum
note            text?
created_at      timestamptz
```
