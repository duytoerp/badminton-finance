namespace BadmintonFinance.Domain.Enums;

public enum SessionStatus
{
    Draft = 0,
    Open = 1,
    Closed = 2,
    Cancelled = 3
}

public enum PaymentStatus
{
    Unpaid = 0,
    PartialPaid = 1,
    Paid = 2,
    OverPaid = 3
}

public enum TransactionType
{
    Income = 0,
    Expense = 1,
    Adjustment = 2
}

public enum PaymentMethod
{
    Cash = 0,
    BankTransfer = 1,
    Momo = 2,
    ZaloPay = 3,
    Other = 99
}

public enum PlayerType
{
    Member = 0,
    Guest = 1
}

public enum FundTransactionType
{
    Deposit = 0,
    Withdraw = 1,
    Adjustment = 2,
    SessionSettlement = 3
}

public enum Gender
{
    Male = 0,
    Female = 1,
    Other = 99
}

public enum SkillLevel
{
    Beginner = 0,
    Intermediate = 1,
    Advanced = 2
}

/// <summary>
/// How a pricing template distributes the session expense across participants.
/// </summary>
public enum PricingMode
{
    /// <summary>
    /// AmountDue = FeePerSlot × SlotCount × Multiplier.
    /// FeePerSlot = TotalExpense / Σ(SlotCount × Multiplier). The total balances exactly to expense.
    /// </summary>
    WeightedSlot = 0,

    /// <summary>
    /// AmountDue = FixedAmount × SlotCount. Rules define a fixed amount per slot per (gender, skill).
    /// Total collected may not equal expense — the fund absorbs the difference.
    /// </summary>
    FixedAmount = 1,

    /// <summary>
    /// AmountDue = round(TotalExpense / HeadCount) for each participant. Rules + slot count are ignored.
    /// </summary>
    EqualPerHead = 2
}
