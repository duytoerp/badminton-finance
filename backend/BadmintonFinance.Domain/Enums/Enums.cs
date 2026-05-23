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

/// <summary>State of a recorded match in BadmintonMatchHistory.</summary>
public enum MatchStatus
{
    /// <summary>Match started but not finished — scores not yet entered.</summary>
    InProgress = 0,
    /// <summary>Match finished — final scores recorded (or explicitly closed without a score).</summary>
    Finished = 1
}

/// <summary>How the match planner pairs the 4 players inside one court of a round.</summary>
public enum MatchSkillMode
{
    /// <summary>Strongest+weakest vs the two middles — balanced match strength.</summary>
    Mixed = 0,
    /// <summary>Strong pair vs weak pair — players play at their own level.</summary>
    Similar = 1
}

/// <summary>
/// How a court booking generates its set of session dates.
/// </summary>
public enum BookingRecurrenceType
{
    /// <summary>Theo ngày — Pattern is a CSV of yyyy-MM-dd dates, one session per date.</summary>
    SingleDates = 0,

    /// <summary>Theo tháng – theo thứ — Pattern is a CSV of DayOfWeek ints (0=Sun..6=Sat). One session per matching date inside [FromDate,ToDate].</summary>
    MonthlyByWeekday = 1,

    /// <summary>Theo tháng – theo ngày — Pattern is a CSV of day-of-month ints (1..31). One session per matching date inside [FromDate,ToDate]; days that don't exist in a given month are skipped.</summary>
    MonthlyByDayOfMonth = 2
}

/// <summary>
/// Classifies a BadmintonPlayerGroup: regulars (Fixed), guests/walk-ins (Casual), tournament squad, or other.
/// Carried on the group itself and snapshotted onto SessionParticipant.JoinedViaGroupType when applied.
/// </summary>
public enum PlayerGroupType
{
    /// <summary>Cố định — nhóm thành viên thường xuyên.</summary>
    Fixed = 0,
    /// <summary>Vãng lai — người chơi không cố định.</summary>
    Casual = 1,
    /// <summary>Đội thi đấu.</summary>
    Tournament = 2,
    /// <summary>Khác / chưa phân loại.</summary>
    Other = 99
}

/// <summary>
/// How a single ExpenseTemplateItem's amount is computed for a given session/booking.
/// All formulas read the booking's hours (EndTime − StartTime) and CourtCount; the court's current
/// DefaultHourlyRate is read for CourtHourlyRate at apply time (not snapshot — picks up current rate).
/// </summary>
public enum ExpenseCalculationType
{
    /// <summary>Amount used as-is (e.g. shuttlecock budget).</summary>
    FixedAmount = 0,
    /// <summary>Hours × Court.DefaultHourlyRate × CourtCount. Amount field is ignored.</summary>
    CourtHourlyRate = 1,
    /// <summary>Amount × Hours.</summary>
    PerHour = 2,
    /// <summary>Amount × CourtCount.</summary>
    PerCourt = 3,
    /// <summary>Amount × Hours × CourtCount.</summary>
    PerHourPerCourt = 4
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
