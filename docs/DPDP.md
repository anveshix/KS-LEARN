# Parental consent and DPDP compliance (अभिभावक सहमति)

KS-LEARN treats a learner as a child under the Digital Personal Data Protection Act, 2023
(DPDP). This note describes what the app actually does, so a parent, teacher or auditor can
check it. It is an engineering description, not legal advice.

## 1. What is collected, and where it stays

Everything is stored in one JSON document in this browser (`localStorage`, key `kslearn.v2`)
on this device. There is no server, no account and no network request. The build fails if the
bundle gains a `fetch`, a socket or an external resource (`tools/verify-dist.mjs`).

| Data | Why | Purpose id | Retention | Shared with |
|---|---|---|---|---|
| Nickname, class, language, subject choices | Choose suitable questions | `teach` | Until erased | Nobody |
| Answers, timing, mastery scores, review dates, streak, stars | Spaced revision and the mission | `memory` | Until erased | Nobody |
| Parent PIN (salted SHA-256, 4000 rounds) | Keep the parent area away from the child | `teach` | Until changed or erased | Nobody |
| Consent record: guardian name, relation, child's age and age band, purposes, verification method, digest, audit trail | Prove consent was given and keep it checkable | legal basis for all of the above | Until erased; re-checked every 12 months | Nobody, unless the guardian exports the receipt |
| Voice | The device's own text-to-speech reads a question aloud | `readaloud` | Not stored at all | Nobody |

Never collected: audio or video recordings, camera, location, contacts, advertising id,
device fingerprints, behavioural profiles, third-party analytics. The optional `voice`
purpose (Phase 3) uses on-device recognition only; audio stays in memory and is discarded
after the answer is graded.

Deliberate data minimisation: no exact date of birth (only whole years), no Aadhaar, no
address, no school record number, no photographs. The guardian's name is stored only because
a consent record without a signatory is not a record.

## 2. Notice (Sec 6(3))

The first screen, before any data exists, states in English and Hindi: what is stored, what
is never collected, each purpose separately, rights, retention and the grievance route. The
guardian must tick that they read it. The notice text lives in `src/core/consent.js`
(`POLICY`) so the version shown is the version stored on the record.

## 3. Verifiable parental consent (Sec 9)

Consent is specific (four purposes, two essential and two optional, each with its own
switch), informed (the notice above), free (learning works with both optional purposes off),
and revocable (see 5).

Verification is done offline, because DigiLocker needs a network round-trip and this app has
no network at all. Two methods are implemented:

1. **Guardian ceremony — default.** The app shows a one-time token made of three words and a
   four-digit check (for example `koel-jalebi-bullock-3176`). It is displayed once; the adult
   must write it down and type it back. Three wrong tries issue a new token. Only a SHA-256
   hash of the token is stored (`verification.ref`), never the token. This stops a child from
   tapping through the notice, and it records that an adult present performed the ceremony.
2. **School-issued token — for schools and NGOs.** A teacher runs
   `node tools/school-token.mjs` on a laptop, hands the guardian the printed token and tells
   them the passcode in person. The token is `KST1.<payload>.<HMAC-SHA256>`; the app verifies
   the signature, the expiry and the clock skew without any network. The passcode is never
   stored by the app. The record is marked `issuer-signed`.

**DigiLocker:** not implemented, on purpose. A DigiLocker flow would require an online
OAuth round-trip, a server to hold the client secret, and would hand a child's identity
document to a remote service — the opposite of this app's design. If a deployment already
has a DPDP consent manager with DigiLocker, its signed receipt can be carried by the
school-token path (an issuer-signed artefact verified offline).

Honest limits: neither method proves *identity*. A determined adult can still complete the
ceremony on a child's behalf, and anyone with developer tools can rewrite local storage. The
record makes consent explicit, dated, purpose-specific and checkable; it is not biometric or
government identity verification.

## 4. The record

`createConsent()` writes a canonical record:

```json
{
  "v": 1, "id": "ksc_…", "policy": "1.0",
  "grantedAt": "2026-11-17T09:30:00.000Z", "reconsentBy": "2027-11-17",
  "guardian": { "name": "Asha Devi", "relation": "mother" },
  "child": { "age": 9, "ageBand": "6-9", "class": 4 },
  "purposes": { "teach": true, "memory": true, "readaloud": false, "voice": false },
  "verification": { "method": "guardian-token", "level": "guardian-ceremony", "ref": "<sha256>", "at": "…" },
  "status": "granted",
  "audit": [{ "at": "…", "action": "granted", "note": "one-time token transcribed" }],
  "digest": "<sha256 over the canonical record>"
}
```

`digest` covers every field except itself, in sorted key order. `verifyConsent()` recomputes
it, checks required purposes, the 12-month date and the status. A record that fails any check
closes every learning route (`render()` in `src/ui/app.js`) until a guardian fixes it; the
screen says which check failed.

The guardian can download a receipt (`ks-learn-consent-<date>.json`) with the record, the
policy version, a human verification code (`DFAE-359A` style) and the digest, to compare with
the copy on the device or hand to a school.

## 5. Rights the app implements

| Right | Where |
|---|---|
| Access and confirmation | Parent area → Privacy and consent, and the backup export (full data) |
| Correction | Parent area → Settings; guardian details can be re-entered on renewal |
| Erasure (Sec 8(6)) | Parent area → Erase all progress (two-step, keeps one undo copy) |
| Withdraw consent (Sec 6(4)) | Parent area → Withdraw consent. Learning stops immediately; the record turns `withdrawn` and stays auditable |
| Grievance (Sec 8(7)) | Notice and Parent area show the route: raise it with the school/operator; response within 30 days |
| No behavioural monitoring | No tracking exists to switch off (Sec 9(3)) |
| Purpose limitation | Optional purposes can be narrowed at any time; essential ones cannot, and the notice says why |

Withdrawal does not silently delete: the guardian chooses between withdrawing (data stays,
learning paused) and erasing (data removed). Both are explained on screen.

## 6. Retention and re-consent

Data lives until the guardian erases it. The consent record carries `reconsentBy` = grant
date + 365 days. After that date, or when `POLICY.version` changes, `verifyConsent()` returns
`reconsent` and the app asks a guardian (PIN, then the token ceremony again) before any
learning continues. Every renewal appends to `audit`.

## 7. Security properties of the consent record

- Stored only on the device, in the same document as the progress; included in backups, so a
  restore does not invent consent out of nothing.
- Rebuilt field by field by `sanitizeConsent()` on every load and every import: bounded
  lengths, allowed enums, literal booleans, no unknown keys, audit capped at 20 entries.
- A record whose digest does not match is shown as damaged and refused, not trusted.
- The one-time token and school passcode are never written to storage.
- Local data is not encrypted at rest. A person with developer tools on an unlocked device can
  read and edit it, including minting a new record. Use the device's own screen lock; keep
  backups private.

## 8. Mapping to the Act (engineering view)

| Provision | Implementation |
|---|---|
| Sec 6 — consent, notice, purpose limitation | Four purposes with separate switches; versioned bilingual notice; optional purposes off by default |
| Sec 6(4)–(6) — withdrawal | Withdraw action; learning pauses; record audited |
| Sec 8(6)–(7) — erasure, grievance | Erase all progress; grievance route shown in-app |
| Sec 9 — children | Guardian gate before any processing; verifiable consent; no tracking, no targeted advertising |
| Sec 12–14 — rights | Access, correction, erasure via Parent area and backup export |
| Data minimisation | No DOB, identity numbers, location, contacts, audio; on-device only |

## 9. What a school or operator must still do

- Run `tools/school-token.mjs` on a trusted machine, keep the passcode out of the app and out
  of shared documents, and give it in person.
- Publish a grievance contact and a DPO name for the deployment, and respond within 30 days.
- If data is ever moved to a server (sync, dashboards), a fresh notice, purpose and consent
  are required; the offline record is not a lawful basis for something it does not describe.
