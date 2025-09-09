# 💰 Community-Endorsed Interest-Free Loans with Impact Tracking

Welcome to a decentralized lending platform that empowers underserved communities with interest-free loans and transparently tracks their impact on poverty alleviation! Built on the Stacks blockchain using Clarity smart contracts, this system enables loans triggered by verified community endorsements and aggregates impact data for donor reports.

## ✨ Features

🔑 User registration with identity verification  
🤝 Community endorsements for loan eligibility  
💸 Interest-free loan disbursement in STX or custom tokens  
🔄 Secure repayment tracking with incentives  
⚖️ Community governance for dispute resolution  
📊 Transparent impact tracking for poverty alleviation metrics  
📈 Aggregated data for donor reports (e.g., jobs created, income growth)  
🚫 Fraud prevention via endorsement verification  

## 🛠 How It Works

**For Borrowers**  
- Register a profile with a verification hash and submit a loan request (amount, purpose, repayment plan, expected impact).  
- Secure endorsements from community members to validate your request.  
- Upon meeting the endorsement threshold, receive funds automatically.  
- Report impact metrics (e.g., business revenue, job creation) post-loan.  
- Repay on schedule to unlock future loans and build trust.  

**For Endorsers**  
- Submit endorsements for loan requests you trust, staking a small refundable amount.  
- Participate in governance to resolve disputes or adjust platform rules.  

**For Donors/Verifiers**  
- Query loan impact data (e.g., number of beneficiaries, economic uplift) via public functions.  
- Access aggregated reports for insights on poverty alleviation outcomes.  
- Initiate disputes if fraud or misuse is suspected.  

**Impact Tracking**  
- Borrowers submit post-loan impact data (e.g., jobs created, income increase).  
- Data is verified by endorsers or community governance.  
- Aggregated metrics are compiled into donor-friendly reports, accessible on-chain.  

This ensures transparency, accountability, and measurable social impact.

## 📜 Smart Contracts Overview

The system comprises 9 Clarity smart contracts for modularity, security, and transparent impact tracking:

1. **UserRegistry.clar**  
   Manages user registration and stores verification hashes for identity.  

2. **EndorsementSubmission.clar**  
   Handles submission of endorsements with anti-spam staking mechanisms.  

3. **EndorsementVerifier.clar**  
   Validates endorsements against criteria (e.g., unique users, stake thresholds).  

4. **LoanRequest.clar**  
   Stores loan requests with details like amount, purpose, and expected impact metrics.  

5. **ThresholdAggregator.clar**  
   Counts endorsements and approves loans when thresholds are met.  

6. **LoanDisbursement.clar**  
   Disburses funds from a treasury (STX or SIP-10 tokens) upon approval.  

7. **RepaymentTracker.clar**  
   Tracks repayments, enforces schedules, and applies penalties for defaults.  

8. **ImpactTracker.clar**  
   Collects and verifies borrower-submitted impact data (e.g., jobs created, income growth).  

9. **GovernanceDispute.clar**  
   Facilitates community voting for disputes, parameter updates, and impact data validation.  

These contracts use traits for secure interactions, ensuring a decentralized, transparent system.

## 📊 Impact Data Aggregation

The **ImpactTracker.clar** contract aggregates metrics like:  
- Number of loans disbursed  
- Total jobs created or businesses supported  
- Income growth percentages for borrowers  
- Geographic distribution of loan impacts  

Donors can query this data via public read-only functions, generating reports for poverty alleviation insights. All data is stored immutably on-chain, ensuring transparency and trust.

## 🚀 Getting Started

1. Deploy the contracts on the Stacks blockchain.  
2. Register users and configure endorsement thresholds via governance.  
3. Fund the treasury with STX or SIP-10 tokens.  
4. Start accepting loan requests and endorsements.  
5. Monitor repayments and impact metrics for donor reporting.  

This platform fosters financial inclusion while providing donors with clear, verifiable evidence of poverty alleviation.