;; Business Verification Contract
;; Validates legitimate small enterprises

(define-data-var admin principal tx-sender)

;; Business data structure
(define-map businesses
  { business-id: (string-ascii 64) }
  {
    owner: principal,
    name: (string-ascii 256),
    registration-number: (string-ascii 64),
    industry: (string-ascii 64),
    verified: bool,
    verification-date: uint
  }
)

;; Register a new business
(define-public (register-business
    (business-id (string-ascii 64))
    (name (string-ascii 256))
    (registration-number (string-ascii 64))
    (industry (string-ascii 64)))
  (let ((caller tx-sender))
    (if (map-insert businesses
          { business-id: business-id }
          {
            owner: caller,
            name: name,
            registration-number: registration-number,
            industry: industry,
            verified: false,
            verification-date: u0
          })
        (ok true)
        (err u1))))

;; Verify a business (admin only)
(define-public (verify-business (business-id (string-ascii 64)))
  (let ((caller tx-sender))
    (if (is-eq caller (var-get admin))
      (match (map-get? businesses { business-id: business-id })
        business (begin
          (map-set businesses
            { business-id: business-id }
            (merge business {
              verified: true,
              verification-date: block-height
            }))
          (ok true))
        (err u2))
      (err u3))))

;; Check if a business is verified
(define-read-only (is-business-verified (business-id (string-ascii 64)))
  (match (map-get? businesses { business-id: business-id })
    business (get verified business)
    false))

;; Get business details
(define-read-only (get-business (business-id (string-ascii 64)))
  (map-get? businesses { business-id: business-id }))

;; Transfer admin rights
(define-public (set-admin (new-admin principal))
  (let ((caller tx-sender))
    (if (is-eq caller (var-get admin))
      (begin
        (var-set admin new-admin)
        (ok true))
      (err u4))))

