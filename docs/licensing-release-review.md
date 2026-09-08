# Licensing release review

This document accompanies the September 8, 2026 license revision in PR #20. The change updates the contract and its package documentation. It does not implement or verify native CLI enforcement, DWS eligibility, checkout, or telemetry behavior. Complete the release conditions below before distributing a release under the revised terms.

## Commercial decisions

- Standard conversion and `query` are free and unlimited for permitted uses, regardless of company revenue or employee count. No DWS account or key is required.
- Noncompetitive hosted, SaaS, internal, and automated integrations are permitted. OEM delivery of the proprietary engine in a customer-operated product requires a separate agreement. Customer access to a provider-operated SaaS does not itself constitute OEM use.
- Vision and additional premium features require DWS authorization. CLI premium use requires a DWS-issued license key and the corresponding paid CLI entitlement. A valid key without that entitlement is insufficient.
- Free premium evaluation is available only through a DWS offering that expressly provides it. It must not unlock CLI premium functionality.
- An organization with more than USD 1 million in annual gross revenue **or** more than 20 employees is excluded from free DWS premium access, including development, testing, and evaluation. Neither threshold restricts paid access or free Standard/query use.
- The threshold matches the existing DWS greater-than tests: exactly USD 1 million and exactly 20 employees do not exceed the limits. This revision does not create a new corporate-group aggregation rule or change the DWS accounting or employee-count method.

## Required release evidence

| Area | Required evidence | Status for this change |
| --- | --- | --- |
| CLI premium authorization | Real native/backend tests reject missing keys, free/guest/evaluation entitlements, wrong-feature keys, and legacy-key-only bypasses; accept the intended paid DWS CLI entitlement | Not implemented or run here |
| Standard and query | Real execution remains available without keys, with invalid/expired credentials, during DWS/network failures, and after premium allowances expire | Not implemented or run here |
| DWS evaluation | Backend and signup/checkout apply the revenue OR employee test and restrict free evaluation to hosted DWS; the same allowance cannot be spent through CLI | Not implemented or run here |
| Contract formation | Installation, account/API-key, managed/CI, and upgrade paths give the correct product terms before acceptance; preserve the accepted version and authorized acceptance evidence | Not implemented or run here |
| Guest creation and privacy | Give required notice before installation identification and guest creation; document legal basis and any required consent separately from contract assent | Not implemented or run here |
| Full telemetry inventory | Verify DWS receipts, SDK analytics, diagnostics, update traffic and relevant server logs against the license and product-specific privacy notice; substantiate purposes, recipients, retention and rights handling | Not verified here |
| Billing | Define and test per-document success, partial batches, crashes, settlement failures, duplicate receipt retries and full-command retries; confirm that failed document conversions are not charged | Not implemented or run here |
| Prior-version and negotiated rights | Identify affected earlier free-license integrations and signed SDK/OEM/offline agreements; implement the license's transition and precedence rules without silently revoking them | Requires owner/legal review |
| Distribution | Match this exact license version to native `--license`, packaged LICENSE, installer notice, account terms, website, pricing descriptions and distributed skill documentation | Package text updated here; other artifacts pending |
| Contract completion | Review the chosen licensor, liability allocation, termination/cure, forum, privacy wording and consumer savings against the intended sales entities and territories | Complete draft supplied for review; final legal sign-off remains a release condition |

Passing this repository's shell and wrapper checks establishes neither enforceable assent nor premium gating. Do not describe those tests as proving the new licensing policy is enforced.

## Native findings that require follow-through

The earlier review inspected GdPicture PR #3201 at `ed128d23bce3ca55616428153c79d797d24ed98e`. These are immutable source references, not claims about later native releases:

- [Guest bootstrap and first notice](https://github.com/PSPDFKit/GdPicture/blob/ed128d23bce3ca55616428153c79d797d24ed98e/DotNet/Tools/fiona/common/dws.cpp#L2293-L2359): identification and guest-token storage precede the notice. [The notice helper](https://github.com/PSPDFKit/GdPicture/blob/ed128d23bce3ca55616428153c79d797d24ed98e/DotNet/Tools/fiona/common/dws.cpp#L2254-L2260) records that text was shown, not acceptance. The [notice text](https://github.com/PSPDFKit/GdPicture/blob/ed128d23bce3ca55616428153c79d797d24ed98e/DotNet/Tools/fiona/common/dws.cpp#L82-L90) links general website terms instead of the CLI license.
- [Conversion credential handling](https://github.com/PSPDFKit/GdPicture/blob/ed128d23bce3ca55616428153c79d797d24ed98e/DotNet/Tools/fiona/common/dws.cpp#L3458-L3522): a standalone commercial key bypasses DWS sessions; explicit or saved credentials can make Standard fail, including on network-dependent entitlement verification. Both require reconciliation with the new standard grant and existing negotiated rights.
- [Vision settlement](https://github.com/PSPDFKit/GdPicture/blob/ed128d23bce3ca55616428153c79d797d24ed98e/DotNet/Tools/fiona/common/dws.cpp#L3364-L3384): a successful document conversion can return a failing command status when reporting fails, while preserving its usage record. Distinguish reconciliation retries from rerunning a completed conversion. This finding is not proof that failed engine conversions are charged.
- [Installation identity](https://github.com/PSPDFKit/GdPicture/blob/ed128d23bce3ca55616428153c79d797d24ed98e/DotNet/Tools/fiona/common/dws.cpp#L958-L985): the derivation does not substantiate the former promise of a product-specific hash. The new license avoids representing hashing as anonymity or product isolation.
- [SDK telemetry dispatch](https://github.com/PSPDFKit/GdPicture/blob/ed128d23bce3ca55616428153c79d797d24ed98e/DotNet/Tools/fiona/main.cpp#L92-L101): DWS receipt fields are not the complete telemetry inventory. This source alone does not establish what every shipped build transmits.
- [Embedded native license](https://github.com/PSPDFKit/GdPicture/blob/ed128d23bce3ca55616428153c79d797d24ed98e/DotNet/Tools/fiona/LICENSE.md): the native copy must be updated to the approved version and verified in the released binary, not just compared to selected phrases in a source test.

## Acceptance cases for the coordinated release

| Scenario | Expected result |
| --- | --- |
| Enterprise runs large Standard/query workload without a key | Allowed without charges or volume limits |
| Standard/query with invalid credentials or unavailable DWS | Continues; any credential/reporting warning remains separate |
| Noncompetitive SaaS operates Standard on its own or contracted infrastructure | Allowed; no OEM agreement required merely for hosting |
| Noncompetitive SaaS uses CLI Vision with a paid DWS CLI entitlement | Allowed within the paid entitlement |
| CLI Vision with no key or only account sign-in | Rejected under the new standard policy |
| CLI Vision with a valid free DWS evaluation key | Rejected, even when hosted DWS evaluation is authorized |
| CLI premium with a valid paid key for another feature/channel | Rejected |
| Standalone SDK/offline key attempts new CLI premium access | Does not bypass DWS; conflicting negotiated rights are handled under the migration process |
| Offered DWS evaluation: USD 1 million revenue and 20 employees | Not excluded by these thresholds; other DWS conditions still apply |
| Offered DWS evaluation: USD 1,000,001 revenue and 10 employees | Free access denied; paid access available |
| Offered DWS evaluation: USD 500,000 revenue and 21 employees | Free access denied; paid access available |
| Organization exceeds either threshold and purchases premium access | Allowed within the purchased entitlement |
| Successful Vision conversion; receipt transmission is retried | No second charge for the same conversion event |
| Failed document conversion within a partly successful batch | Failed document uncharged; successful documents remain chargeable |
| Proprietary engine supplied in a customer-operated product | Separate OEM authorization required |
| Provider operates a noncompetitive SaaS under its own brand | Branding alone does not trigger OEM restriction |
| Software used to supply competing functionality | Prohibited under the competitive-use restriction |
| Automatic update introduces materially different terms | Version/notice/acceptance behavior follows the license; mere download is not treated as acceptance |

## Validation of this documentation change

Use the existing `npm run check`, `npm test`, and `npm run pack:dry-run` entrypoints. Inspect an actual package archive and compare its `package/LICENSE.md` with the reviewed source. Existing wrapper tests use fixtures and fake native executables; they do not contact paid services or establish native feature authorization. No new runtime enforcement test is added in this repository because the enforcement being changed is outside its wrappers.

## References

- [CLI license](../LICENSE.md).
- [DWS terms](https://www.nutrient.io/legal/cloud-terms/), especially Sections 1.3, 3.1 and 4.2 for the existing eligibility thresholds.
- [Nutrient legal entities](https://www.nutrient.io/legal/impressum/) and [Privacy Policy](https://www.nutrient.io/legal/privacy/).
- [Previous free-use license](https://github.com/PSPDFKit/pdf-to-markdown/blob/faab2ef8335490156d5918e4b6f2abfeb8a7dd02/LICENSE.md), which expressly permitted SaaS/OEM/embedded use within its historical allowance.
