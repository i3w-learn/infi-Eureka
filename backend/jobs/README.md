# jobs/

Background and scheduled work, kept out of the request path.

Likely candidates: transcoding uploaded videos, reconciling pending Razorpay
payments against their webhook, expiring abandoned test attempts.

Like `scripts/`, jobs call services — never SQL directly.
