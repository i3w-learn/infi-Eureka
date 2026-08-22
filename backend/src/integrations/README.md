# integrations/

Third-party clients, each wrapped behind our own interface so the rest of the
codebase never imports a vendor SDK directly (Razorpay, storage, email).

Same dependency-inversion pattern as `dao/`:

```
integrations/
├── interfaces/
│   └── payment-gateway.interface.ts   # IPaymentGateway — what WE need
└── razorpay/
    └── razorpay.gateway.ts            # implements it using the SDK
```

The service depends on `IPaymentGateway`. It does not know Razorpay exists.

Two payoffs: tests pass a fake gateway instead of hitting a real payment API,
and switching provider means one new folder here plus one line in
`src/container.ts` — no service changes.

Vendor types stop at this boundary. Nothing above it should ever import from
the SDK.
