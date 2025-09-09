(define-constant ERR-UNAUTHORIZED (err u1000))
(define-constant ERR-INSUFFICIENT-ENDORSEMENTS (err u1001))
(define-constant ERR-TREASURY_EMPTY (err u1002))
(define-constant ERR-INVALID_AMOUNT (err u1003))
(define-constant ERR-LOAN_ALREADY_DISBURSED (err u1004))
(define-constant ERR_INVALID_REQUEST_ID (err u1005))
(define-constant ERR_INVALID_TOKEN_CONTRACT (err u1006))
(define-constant ERR_TRANSFER_FAILED (err u1007))
(define-constant ERR_INVALID_REPAYMENT_SCHEDULE (err u1008))
(define-constant ERR_INSUFFICIENT_TREASURY_BALANCE (err u1009))
(define-constant ERR_INVALID_DISBURSEMENT_TIME (err u1010))
(define-constant ERR_NO_FUNDS_AVAILABLE (err u1011))
(define-constant ERR_INVALID_BORROWER (err u1012))
(define-constant ERR_DISBURSEMENT_PAUSED (err u1013))
(define-constant ERR_INVALID_THRESHOLD (err u1014))
(define-constant ERR_GOVERNANCE_NOT_SET (err u1015))
(define-constant ERR_INVALID_GOVERNANCE_CALL (err u1016))
(define-constant ERR_TREASURY_NOT_FUNDED (err u1017))
(define-constant ERR_INVALID_IMPACT_DATA (err u1018))
(define-constant ERR_DISBURSEMENT_LIMIT_EXCEEDED (err u1019))
(define-constant ERR_INVALID_CURRENCY (err u1020))

(define-data-var treasury-balance uint u0)
(define-data-var disbursement-paused bool false)
(define-data-var min-disbursement-amount uint u100)
(define-data-var max-disbursement-amount uint u1000000)
(define-data-var governance-contract (optional principal) none)
(define-data-var impact-tracker-contract (optional principal) none)
(define-data-var threshold-aggregator-contract (optional principal) none)
(define-data-var repayment-tracker-contract (optional principal) none)
(define-data-var total-disbursed uint u0)
(define-data-var disbursement-count uint u0)
(define-data-var last-disbursement-time uint u0)

(define-map disbursed-loans
  uint
  {
    borrower: principal,
    amount: uint,
    disbursement-time: uint,
    token-contract: (optional principal),
    repayment-schedule: uint,
    impact-recorded: bool
  }
)

(define-trait sip010-trait
  (
    (transfer (uint principal principal (buff 34)) (response bool uint))
  )
)

(define-trait governance-trait
  (
    (is-approved-funder (principal) (response bool uint))
    (pause-disbursements (bool) (response bool uint))
  )
)

(define-trait threshold-trait
  (
    (is-approved (uint) (response bool uint))
    (get-endorsement-count (uint) (response uint uint))
  )
)

(define-trait repayment-trait
  (
    (initiate-repayment-schedule (uint uint principal uint) (response bool uint))
  )
)

(define-trait impact-trait
  (
    (record-initial-impact (uint uint (string-ascii 256)) (response bool uint))
  )
)

(define-read-only (get-treasury-balance)
  (ok (var-get treasury-balance))
)

(define-read-only (get-disbursement-paused)
  (ok (var-get disbursement-paused))
)

(define-read-only (get-min-disbursement-amount)
  (ok (var-get min-disbursement-amount))
)

(define-read-only (get-max-disbursement-amount)
  (ok (var-get max-disbursement-amount))
)

(define-read-only (get-total-disbursed)
  (ok (var-get total-disbursed))
)

(define-read-only (get-disbursement-count)
  (ok (var-get disbursement-count))
)

(define-read-only (get-loan-details (request-id uint))
  (map-get? disbursed-loans request-id)
)

(define-private (validate-amount (amount uint))
  (if (and (>= amount (var-get min-disbursement-amount)) (<= amount (var-get max-disbursement-amount)))
    (ok true)
    (err ERR-INVALID_AMOUNT))
)

(define-private (validate-borrower (borrower principal))
  (if (is-eq borrower tx-sender)
    (err ERR_INVALID_BORROWER)
    (ok true))
)

(define-private (validate-request-id (request-id uint))
  (if (> request-id u0)
    (ok true)
    (err ERR_INVALID_REQUEST_ID))
)

(define-private (validate-token-contract (token-contract (optional principal)))
  (match token-contract
    contract-principal
      (if (is-eq contract-principal 'SP000000000000000000002Q6VF78)
        (err ERR_INVALID_TOKEN_CONTRACT)
        (ok true))
    (ok true))
)

(define-private (validate-repayment-schedule (schedule uint))
  (if (> schedule u0)
    (ok true)
    (err ERR_INVALID_REPAYMENT_SCHEDULE))
)

(define-private (validate-disbursement-time)
  (if (> block-height (var-get last-disbursement-time))
    (ok true)
    (err ERR_INVALID_DISBURSEMENT_TIME))
)

(define-private (validate-currency (currency (string-ascii 10)))
  (if (or (is-eq currency "STX") (is-eq currency "SIP010"))
    (ok true)
    (err ERR_INVALID_CURRENCY))
)

(define-private (validate-impact-data (data (string-ascii 256)))
  (if (> (len data) u0)
    (ok true)
    (err ERR_INVALID_IMPACT_DATA))
)

(define-public (set-governance-contract (contract-principal principal))
  (begin
    (asserts! (is-eq tx-sender contract-caller) ERR-UNAUTHORIZED)
    (var-set governance-contract (some contract-principal))
    (ok true)
  )
)

(define-public (set-impact-tracker-contract (contract-principal principal))
  (begin
    (asserts! (is-eq tx-sender contract-caller) ERR-UNAUTHORIZED)
    (var-set impact-tracker-contract (some contract-principal))
    (ok true)
  )
)

(define-public (set-threshold-aggregator-contract (contract-principal principal))
  (begin
    (asserts! (is-eq tx-sender contract-caller) ERR-UNAUTHORIZED)
    (var-set threshold-aggregator-contract (some contract-principal))
    (ok true)
  )
)

(define-public (set-repayment-tracker-contract (contract-principal principal))
  (begin
    (asserts! (is-eq tx-sender contract-caller) ERR-UNAUTHORIZED)
    (var-set repayment-tracker-contract (some contract-principal))
    (ok true)
  )
)

(define-public (set-min-disbursement-amount (new-min uint))
  (begin
    (asserts! (is-some (var-get governance-contract)) ERR_GOVERNANCE_NOT_SET)
    (asserts! (> new-min u0) ERR_INVALID_AMOUNT)
    (var-set min-disbursement-amount new-min)
    (ok true)
  )
)

(define-public (set-max-disbursement-amount (new-max uint))
  (begin
    (asserts! (is-some (var-get governance-contract)) ERR_GOVERNANCE_NOT_SET)
    (asserts! (> new-max (var-get min-disbursement-amount)) ERR_INVALID_AMOUNT)
    (var-set max-disbursement-amount new-max)
    (ok true)
  )
)

(define-public (pause-disbursements (paused bool))
  (let ((gov (unwrap! (var-get governance-contract) ERR_GOVERNANCE_NOT_SET)))
    (asserts! (is-eq tx-sender gov) ERR_UNAUTHORIZED)
    (var-set disbursement-paused paused)
    (ok true)
  )
)

(define-public (fund-treasury (amount uint))
  (let ((gov (unwrap! (var-get governance-contract) ERR_GOVERNANCE_NOT_SET)))
    (asserts! (unwrap! (as-contract (contract-call? gov is-approved-funder tx-sender)) ERR_INVALID_GOVERNANCE_CALL) ERR_UNAUTHORIZED)
    (asserts! (> amount u0) ERR_INVALID_AMOUNT)
    (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))
    (var-set treasury-balance (+ (var-get treasury-balance) amount))
    (ok (var-get treasury-balance))
  )
)

(define-public (disburse-loan (borrower principal) (amount uint) (request-id uint) (token-contract (optional principal)) (repayment-schedule uint) (impact-data (string-ascii 256)) (currency (string-ascii 10)))
  (let
    (
      (threshold (unwrap! (var-get threshold-aggregator-contract) ERR_GOVERNANCE_NOT_SET))
      (repayment (unwrap! (var-get repayment-tracker-contract) ERR_GOVERNANCE_NOT_SET))
      (impact (unwrap! (var-get impact-tracker-contract) ERR_GOVERNANCE_NOT_SET))
      (is-approved (unwrap! (as-contract (contract-call? threshold is-approved request-id)) ERR_INVALID_GOVERNANCE_CALL))
    )
    (asserts! (not (var-get disbursement-paused)) ERR_DISBURSEMENT_PAUSED)
    (try! (validate-amount amount))
    (try! (validate-borrower borrower))
    (try! (validate-request-id request-id))
    (try! (validate-token-contract token-contract))
    (try! (validate-repayment-schedule repayment-schedule))
    (try! (validate-disbursement-time))
    (try! (validate-currency currency))
    (try! (validate-impact-data impact-data))
    (asserts! (>= (var-get treasury-balance) amount) ERR_INSUFFICIENT_TREASURY_BALANCE)
    (asserts! is-approved ERR_INSUFFICIENT_ENDORSEMENTS)
    (asserts! (is-none (map-get? disbursed-loans request-id)) ERR_LOAN_ALREADY_DISBURSED)
    (match token-contract
      token
        (let ((token-trait (as-contract (contract-call? token transfer amount tx-sender borrower (buff 0)))))
          (asserts! (is-ok token-trait) ERR_TRANSFER_FAILED)
        )
      (try! (as-contract (stx-transfer? amount tx-sender borrower)))
    )
    (var-set treasury-balance (- (var-get treasury-balance) amount))
    (var-set total-disbursed (+ (var-get total-disbursed) amount))
    (var-set disbursement-count (+ (var-get disbursement-count) u1))
    (var-set last-disbursement-time block-height)
    (map-set disbursed-loans request-id
      {
        borrower: borrower,
        amount: amount,
        disbursement-time: block-height,
        token-contract: token-contract,
        repayment-schedule: repayment-schedule,
        impact-recorded: false
      }
    )
    (try! (as-contract (contract-call? repayment initiate-repayment-schedule request-id amount borrower repayment-schedule)))
    (try! (as-contract (contract-call? impact record-initial-impact request-id amount impact-data)))
    (print { event: "loan-disbursed", request-id: request-id, amount: amount, borrower: borrower })
    (ok true)
  )
)

(define-public (record-loan-impact (request-id uint) (impact-data (string-ascii 256)))
  (let
    (
      (loan (unwrap! (map-get? disbursed-loans request-id) ERR_INVALID_REQUEST_ID))
      (impact (unwrap! (var-get impact-tracker-contract) ERR_GOVERNANCE_NOT_SET))
    )
    (asserts! (is-eq (get borrower loan) tx-sender) ERR_UNAUTHORIZED)
    (asserts! (not (get impact-recorded loan)) ERR_INVALID_IMPACT_DATA)
    (try! (validate-impact-data impact-data))
    (map-set disbursed-loans request-id
      (merge loan { impact-recorded: true })
    )
    (try! (as-contract (contract-call? impact record-initial-impact request-id (get amount loan) impact-data)))
    (ok true)
  )
)

(define-public (withdraw-treasury-funds (amount uint) (recipient principal))
  (let ((gov (unwrap! (var-get governance-contract) ERR_GOVERNANCE_NOT_SET)))
    (asserts! (is-eq tx-sender gov) ERR_UNAUTHORIZED)
    (asserts! (>= (var-get treasury-balance) amount) ERR_INSUFFICIENT_TREASURY_BALANCE)
    (try! (as-contract (stx-transfer? amount tx-sender recipient)))
    (var-set treasury-balance (- (var-get treasury-balance) amount))
    (ok true)
  )
)