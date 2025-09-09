import { describe, it, expect, beforeEach } from "vitest";
import { uintCV, principalCV, stringAsciiCV, OptionalCV, noneCV } from "@stacks/transactions";

const ERR_UNAUTHORIZED = 1000;
const ERR_INSUFFICIENT_ENDORSEMENTS = 1001;
const ERR_INVALID_AMOUNT = 1003;
const ERR_LOAN_ALREADY_DISBURSED = 1004;
const ERR_INVALID_REQUEST_ID = 1005;
const ERR_INVALID_TOKEN_CONTRACT = 1006;
const ERR_INVALID_REPAYMENT_SCHEDULE = 1008;
const ERR_INSUFFICIENT_TREASURY_BALANCE = 1009;
const ERR_INVALID_DISBURSEMENT_TIME = 1010;
const ERR_INVALID_BORROWER = 1012;
const ERR_DISBURSEMENT_PAUSED = 1013;
const ERR_GOVERNANCE_NOT_SET = 1015;
const ERR_INVALID_CURRENCY = 1020;
const ERR_INVALID_IMPACT_DATA = 1018;

interface LoanDetails {
  borrower: string;
  amount: number;
  disbursementTime: number;
  tokenContract: string | null;
  repaymentSchedule: number;
  impactRecorded: boolean;
}

interface Result<T> {
  ok: boolean;
  value: T | number;
}

class LoanDisbursementMock {
  state: {
    treasuryBalance: number;
    disbursementPaused: boolean;
    minDisbursementAmount: number;
    maxDisbursementAmount: number;
    governanceContract: string | null;
    impactTrackerContract: string | null;
    thresholdAggregatorContract: string | null;
    repaymentTrackerContract: string | null;
    totalDisbursed: number;
    disbursementCount: number;
    lastDisbursementTime: number;
    disbursedLoans: Map<number, LoanDetails>;
  } = {
    treasuryBalance: 0,
    disbursementPaused: false,
    minDisbursementAmount: 100,
    maxDisbursementAmount: 1000000,
    governanceContract: null,
    impactTrackerContract: null,
    thresholdAggregatorContract: null,
    repaymentTrackerContract: null,
    totalDisbursed: 0,
    disbursementCount: 0,
    lastDisbursementTime: 0,
    disbursedLoans: new Map(),
  };
  blockHeight: number = 0;
  caller: string = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
  stxTransfers: Array<{ amount: number; from: string; to: string }> = [];
  tokenTransfers: Array<{ amount: number; from: string; to: string; token: string }> = [];
  mockApprovals: Map<number, boolean> = new Map();
  mockEndorsementCounts: Map<number, number> = new Map();

  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      treasuryBalance: 0,
      disbursementPaused: false,
      minDisbursementAmount: 100,
      maxDisbursementAmount: 1000000,
      governanceContract: null,
      impactTrackerContract: null,
      thresholdAggregatorContract: null,
      repaymentTrackerContract: null,
      totalDisbursed: 0,
      disbursementCount: 0,
      lastDisbursementTime: 0,
      disbursedLoans: new Map(),
    };
    this.blockHeight = 0;
    this.caller = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
    this.stxTransfers = [];
    this.tokenTransfers = [];
    this.mockApprovals = new Map();
    this.mockEndorsementCounts = new Map();
  }

  setGovernanceContract(contractPrincipal: string): Result<boolean> {
    if (this.caller !== contractPrincipal) return { ok: false, value: ERR_UNAUTHORIZED };
    this.state.governanceContract = contractPrincipal;
    return { ok: true, value: true };
  }

  setImpactTrackerContract(contractPrincipal: string): Result<boolean> {
    if (this.caller !== contractPrincipal) return { ok: false, value: ERR_UNAUTHORIZED };
    this.state.impactTrackerContract = contractPrincipal;
    return { ok: true, value: true };
  }

  setThresholdAggregatorContract(contractPrincipal: string): Result<boolean> {
    if (this.caller !== contractPrincipal) return { ok: false, value: ERR_UNAUTHORIZED };
    this.state.thresholdAggregatorContract = contractPrincipal;
    return { ok: true, value: true };
  }

  setRepaymentTrackerContract(contractPrincipal: string): Result<boolean> {
    if (this.caller !== contractPrincipal) return { ok: false, value: ERR_UNAUTHORIZED };
    this.state.repaymentTrackerContract = contractPrincipal;
    return { ok: true, value: true };
  }

  setMinDisbursementAmount(newMin: number): Result<boolean> {
    if (!this.state.governanceContract) return { ok: false, value: ERR_GOVERNANCE_NOT_SET };
    if (newMin <= 0) return { ok: false, value: ERR_INVALID_AMOUNT };
    this.state.minDisbursementAmount = newMin;
    return { ok: true, value: true };
  }

  setMaxDisbursementAmount(newMax: number): Result<boolean> {
    if (!this.state.governanceContract) return { ok: false, value: ERR_GOVERNANCE_NOT_SET };
    if (newMax <= this.state.minDisbursementAmount) return { ok: false, value: ERR_INVALID_AMOUNT };
    this.state.maxDisbursementAmount = newMax;
    return { ok: true, value: true };
  }

  pauseDisbursements(paused: boolean): Result<boolean> {
    if (this.caller !== this.state.governanceContract) return { ok: false, value: ERR_UNAUTHORIZED };
    this.state.disbursementPaused = paused;
    return { ok: true, value: true };
  }

  fundTreasury(amount: number): Result<number> {
    if (!this.state.governanceContract) return { ok: false, value: ERR_GOVERNANCE_NOT_SET };
    if (amount <= 0) return { ok: false, value: ERR_INVALID_AMOUNT };
    this.stxTransfers.push({ amount, from: this.caller, to: "contract" });
    this.state.treasuryBalance += amount;
    return { ok: true, value: this.state.treasuryBalance };
  }

  disburseLoan(
    borrower: string,
    amount: number,
    requestId: number,
    tokenContract: string | null,
    repaymentSchedule: number,
    impactData: string,
    currency: string
  ): Result<boolean> {
    if (this.state.disbursementPaused) return { ok: false, value: ERR_DISBURSEMENT_PAUSED };
    if (amount < this.state.minDisbursementAmount || amount > this.state.maxDisbursementAmount) return { ok: false, value: ERR_INVALID_AMOUNT };
    if (borrower === this.caller) return { ok: false, value: ERR_INVALID_BORROWER };
    if (requestId <= 0) return { ok: false, value: ERR_INVALID_REQUEST_ID };
    if (tokenContract && tokenContract === "SP000000000000000000002Q6VF78") return { ok: false, value: ERR_INVALID_TOKEN_CONTRACT };
    if (repaymentSchedule <= 0) return { ok: false, value: ERR_INVALID_REPAYMENT_SCHEDULE };
    if (this.blockHeight <= this.state.lastDisbursementTime) return { ok: false, value: ERR_INVALID_DISBURSEMENT_TIME };
    if (!["STX", "SIP010"].includes(currency)) return { ok: false, value: ERR_INVALID_CURRENCY };
    if (impactData.length === 0) return { ok: false, value: ERR_INVALID_IMPACT_DATA };
    if (this.state.treasuryBalance < amount) return { ok: false, value: ERR_INSUFFICIENT_TREASURY_BALANCE };
    if (!this.mockApprovals.get(requestId)) return { ok: false, value: ERR_INSUFFICIENT_ENDORSEMENTS };
    if (this.state.disbursedLoans.has(requestId)) return { ok: false, value: ERR_LOAN_ALREADY_DISBURSED };

    if (tokenContract) {
      this.tokenTransfers.push({ amount, from: "contract", to: borrower, token: tokenContract });
    } else {
      this.stxTransfers.push({ amount, from: "contract", to: borrower });
    }
    this.state.treasuryBalance -= amount;
    this.state.totalDisbursed += amount;
    this.state.disbursementCount += 1;
    this.state.lastDisbursementTime = this.blockHeight;
    this.state.disbursedLoans.set(requestId, {
      borrower,
      amount,
      disbursementTime: this.blockHeight,
      tokenContract,
      repaymentSchedule,
      impactRecorded: false,
    });
    return { ok: true, value: true };
  }

  recordLoanImpact(requestId: number, impactData: string): Result<boolean> {
    const loan = this.state.disbursedLoans.get(requestId);
    if (!loan) return { ok: false, value: ERR_INVALID_REQUEST_ID };
    if (loan.borrower !== this.caller) return { ok: false, value: ERR_UNAUTHORIZED };
    if (loan.impactRecorded) return { ok: false, value: ERR_INVALID_IMPACT_DATA };
    if (impactData.length === 0) return { ok: false, value: ERR_INVALID_IMPACT_DATA };
    this.state.disbursedLoans.set(requestId, { ...loan, impactRecorded: true });
    return { ok: true, value: true };
  }

  withdrawTreasuryFunds(amount: number, recipient: string): Result<boolean> {
    if (this.caller !== this.state.governanceContract) return { ok: false, value: ERR_UNAUTHORIZED };
    if (this.state.treasuryBalance < amount) return { ok: false, value: ERR_INSUFFICIENT_TREASURY_BALANCE };
    this.stxTransfers.push({ amount, from: "contract", to: recipient });
    this.state.treasuryBalance -= amount;
    return { ok: true, value: true };
  }

  getTreasuryBalance(): Result<number> {
    return { ok: true, value: this.state.treasuryBalance };
  }

  getDisbursementPaused(): Result<boolean> {
    return { ok: true, value: this.state.disbursementPaused };
  }

  getMinDisbursementAmount(): Result<number> {
    return { ok: true, value: this.state.minDisbursementAmount };
  }

  getMaxDisbursementAmount(): Result<number> {
    return { ok: true, value: this.state.maxDisbursementAmount };
  }

  getTotalDisbursed(): Result<number> {
    return { ok: true, value: this.state.totalDisbursed };
  }

  getDisbursementCount(): Result<number> {
    return { ok: true, value: this.state.disbursementCount };
  }

  getLoanDetails(requestId: number): LoanDetails | null {
    return this.state.disbursedLoans.get(requestId) || null;
  }
}

describe("LoanDisbursement", () => {
  let contract: LoanDisbursementMock;

  beforeEach(() => {
    contract = new LoanDisbursementMock();
    contract.reset();
  });

  it("sets governance contract successfully", () => {
    contract.caller = "ST2GOV";
    const result = contract.setGovernanceContract("ST2GOV");
    expect(result.ok).toBe(true);
    expect(contract.state.governanceContract).toBe("ST2GOV");
  });

  it("funds treasury successfully", () => {
    contract.caller = "ST2GOV";
    contract.setGovernanceContract("ST2GOV");
    const result = contract.fundTreasury(5000);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(5000);
    expect(contract.state.treasuryBalance).toBe(5000);
  });

  it("disburses loan successfully with STX", () => {
    contract.caller = "ST2GOV";
    contract.setGovernanceContract("ST2GOV");
    contract.setThresholdAggregatorContract("ST3THR");
    contract.setRepaymentTrackerContract("ST4REP");
    contract.setImpactTrackerContract("ST5IMP");
    contract.fundTreasury(10000);
    contract.mockApprovals.set(1, true);
    contract.blockHeight = 10;
    const result = contract.disburseLoan("ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5", 500, 1, null, 30, "Impact data", "STX");
    expect(result.ok).toBe(true);
    expect(contract.state.treasuryBalance).toBe(9500);
    expect(contract.state.totalDisbursed).toBe(500);
    expect(contract.state.disbursementCount).toBe(1);
    expect(contract.state.lastDisbursementTime).toBe(10);
    const loan = contract.getLoanDetails(1);
    expect(loan?.borrower).toBe("ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5");
    expect(loan?.amount).toBe(500);
    expect(loan?.disbursementTime).toBe(10);
    expect(loan?.tokenContract).toBe(null);
    expect(loan?.repaymentSchedule).toBe(30);
    expect(loan?.impactRecorded).toBe(false);
  });

  it("disburses loan successfully with token", () => {
    contract.caller = "ST2GOV";
    contract.setGovernanceContract("ST2GOV");
    contract.setThresholdAggregatorContract("ST3THR");
    contract.setRepaymentTrackerContract("ST4REP");
    contract.setImpactTrackerContract("ST5IMP");
    contract.fundTreasury(10000);
    contract.mockApprovals.set(2, true);
    contract.blockHeight = 20;
    const result = contract.disburseLoan("ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5", 1000, 2, "ST8TOK", 60, "Token impact", "SIP010");
    expect(result.ok).toBe(true);
    expect(contract.state.treasuryBalance).toBe(9000);
    expect(contract.state.totalDisbursed).toBe(1000);
    expect(contract.state.disbursementCount).toBe(1);
    expect(contract.state.lastDisbursementTime).toBe(20);
    const loan = contract.getLoanDetails(2);
    expect(loan?.borrower).toBe("ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5");
    expect(loan?.amount).toBe(1000);
    expect(loan?.tokenContract).toBe("ST8TOK");
  });

  it("rejects disbursement if paused", () => {
    contract.caller = "ST2GOV";
    contract.setGovernanceContract("ST2GOV");
    contract.pauseDisbursements(true);
    contract.blockHeight = 10;
    const result = contract.disburseLoan("ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5", 500, 1, null, 30, "Impact data", "STX");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_DISBURSEMENT_PAUSED);
  });

  it("rejects invalid amount", () => {
    contract.caller = "ST2GOV";
    contract.setGovernanceContract("ST2GOV");
    contract.setThresholdAggregatorContract("ST3THR");
    contract.setRepaymentTrackerContract("ST4REP");
    contract.setImpactTrackerContract("ST5IMP");
    contract.fundTreasury(10000);
    contract.mockApprovals.set(1, true);
    contract.blockHeight = 10;
    const result = contract.disburseLoan("ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5", 50, 1, null, 30, "Impact data", "STX");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_AMOUNT);
  });

  it("rejects if borrower is caller", () => {
    contract.caller = "ST2GOV";
    contract.setGovernanceContract("ST2GOV");
    contract.setThresholdAggregatorContract("ST3THR");
    contract.setRepaymentTrackerContract("ST4REP");
    contract.setImpactTrackerContract("ST5IMP");
    contract.fundTreasury(10000);
    contract.mockApprovals.set(1, true);
    contract.blockHeight = 10;
    const result = contract.disburseLoan("ST2GOV", 500, 1, null, 30, "Impact data", "STX");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_BORROWER);
  });

  it("rejects duplicate disbursement", () => {
    contract.caller = "ST2GOV";
    contract.setGovernanceContract("ST2GOV");
    contract.setThresholdAggregatorContract("ST3THR");
    contract.setRepaymentTrackerContract("ST4REP");
    contract.setImpactTrackerContract("ST5IMP");
    contract.fundTreasury(10000);
    contract.mockApprovals.set(1, true);
    contract.blockHeight = 10;
    contract.disburseLoan("ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5", 500, 1, null, 30, "Impact data", "STX");
    contract.blockHeight = 20;
    const result = contract.disburseLoan("ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5", 500, 1, null, 30, "Impact data", "STX");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_LOAN_ALREADY_DISBURSED);
  });

  it("records loan impact successfully", () => {
    contract.caller = "ST2GOV";
    contract.setGovernanceContract("ST2GOV");
    contract.setThresholdAggregatorContract("ST3THR");
    contract.setRepaymentTrackerContract("ST4REP");
    contract.setImpactTrackerContract("ST5IMP");
    contract.fundTreasury(10000);
    contract.mockApprovals.set(1, true);
    contract.blockHeight = 10;
    contract.disburseLoan("ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5", 500, 1, null, 30, "Initial impact", "STX");
    contract.caller = "ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5";
    const result = contract.recordLoanImpact(1, "Updated impact");
    expect(result.ok).toBe(true);
    const loan = contract.getLoanDetails(1);
    expect(loan?.impactRecorded).toBe(true);
  });

  it("rejects impact recording by non-borrower", () => {
    contract.caller = "ST2GOV";
    contract.setGovernanceContract("ST2GOV");
    contract.setThresholdAggregatorContract("ST3THR");
    contract.setRepaymentTrackerContract("ST4REP");
    contract.setImpactTrackerContract("ST5IMP");
    contract.fundTreasury(10000);
    contract.mockApprovals.set(1, true);
    contract.blockHeight = 10;
    contract.disburseLoan("ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5", 500, 1, null, 30, "Initial impact", "STX");
    contract.caller = "ST3FAKE";
    const result = contract.recordLoanImpact(1, "Updated impact");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_UNAUTHORIZED);
  });

  it("withdraws treasury funds successfully", () => {
    contract.caller = "ST2GOV";
    contract.setGovernanceContract("ST2GOV");
    contract.fundTreasury(10000);
    contract.caller = "ST2GOV";
    const result = contract.withdrawTreasuryFunds(2000, "ST9REC");
    expect(result.ok).toBe(true);
    expect(contract.state.treasuryBalance).toBe(8000);
  });

  it("rejects withdrawal by non-governance", () => {
    contract.caller = "ST2GOV";
    contract.setGovernanceContract("ST2GOV");
    contract.fundTreasury(10000);
    contract.caller = "ST3FAKE";
    const result = contract.withdrawTreasuryFunds(2000, "ST9REC");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_UNAUTHORIZED);
  });

  it("gets treasury balance correctly", () => {
    contract.caller = "ST2GOV";
    contract.setGovernanceContract("ST2GOV");
    contract.fundTreasury(5000);
    const result = contract.getTreasuryBalance();
    expect(result.ok).toBe(true);
    expect(result.value).toBe(5000);
  });

  it("gets disbursement paused status correctly", () => {
    contract.caller = "ST2GOV";
    contract.setGovernanceContract("ST2GOV");
    contract.pauseDisbursements(true);
    const result = contract.getDisbursementPaused();
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
  });

  it("gets min disbursement amount correctly", () => {
    const result = contract.getMinDisbursementAmount();
    expect(result.ok).toBe(true);
    expect(result.value).toBe(100);
  });

  it("gets max disbursement amount correctly", () => {
    const result = contract.getMaxDisbursementAmount();
    expect(result.ok).toBe(true);
    expect(result.value).toBe(1000000);
  });

  it("gets total disbursed correctly", () => {
    contract.caller = "ST2GOV";
    contract.setGovernanceContract("ST2GOV");
    contract.setThresholdAggregatorContract("ST3THR");
    contract.setRepaymentTrackerContract("ST4REP");
    contract.setImpactTrackerContract("ST5IMP");
    contract.fundTreasury(10000);
    contract.mockApprovals.set(1, true);
    contract.blockHeight = 10;
    contract.disburseLoan("ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5", 500, 1, null, 30, "Impact data", "STX");
    const result = contract.getTotalDisbursed();
    expect(result.ok).toBe(true);
    expect(result.value).toBe(500);
  });

  it("gets disbursement count correctly", () => {
    contract.caller = "ST2GOV";
    contract.setGovernanceContract("ST2GOV");
    contract.setThresholdAggregatorContract("ST3THR");
    contract.setRepaymentTrackerContract("ST4REP");
    contract.setImpactTrackerContract("ST5IMP");
    contract.fundTreasury(10000);
    contract.mockApprovals.set(1, true);
    contract.blockHeight = 10;
    contract.disburseLoan("ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5", 500, 1, null, 30, "Impact data", "STX");
    const result = contract.getDisbursementCount();
    expect(result.ok).toBe(true);
    expect(result.value).toBe(1);
  });
});