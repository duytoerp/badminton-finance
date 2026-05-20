using BadmintonFinance.Application.DTOs;
using FluentValidation;

namespace BadmintonFinance.Application.Validators;

public class CreatePlayerValidator : AbstractValidator<CreatePlayerDto>
{
    public CreatePlayerValidator()
    {
        RuleFor(x => x.FullName).NotEmpty().MaximumLength(150);
        RuleFor(x => x.PhoneNumber).MaximumLength(30).Matches(@"^[0-9+\-\s]*$").When(x => !string.IsNullOrEmpty(x.PhoneNumber));
        RuleFor(x => x.Email).EmailAddress().When(x => !string.IsNullOrEmpty(x.Email));
    }
}

public class QuickAddPlayerValidator : AbstractValidator<QuickAddPlayerDto>
{
    public QuickAddPlayerValidator()
    {
        RuleFor(x => x.FullName).NotEmpty().MaximumLength(150);
    }
}

public class CreateCourtValidator : AbstractValidator<CreateCourtDto>
{
    public CreateCourtValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(150);
        RuleFor(x => x.DefaultHourlyRate).GreaterThanOrEqualTo(0);
    }
}

public class CreateSessionValidator : AbstractValidator<CreateSessionDto>
{
    public CreateSessionValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(200);
        RuleFor(x => x.CourtId).NotEmpty();
        RuleFor(x => x.PlayDate).NotEmpty();
        RuleFor(x => x.CourtCount).GreaterThan(0);
        RuleFor(x => x).Must(x => x.EndTime > x.StartTime).WithMessage("EndTime must be after StartTime.");
    }
}

public class AddParticipantValidator : AbstractValidator<AddParticipantDto>
{
    public AddParticipantValidator()
    {
        RuleFor(x => x.SessionId).NotEmpty();
        RuleFor(x => x.PlayerId).NotEmpty();
        RuleFor(x => x.SlotCount).GreaterThan(0).LessThanOrEqualTo(10);
    }
}

public class CreateExpenseValidator : AbstractValidator<CreateExpenseDto>
{
    public CreateExpenseValidator()
    {
        RuleFor(x => x.SessionId).NotEmpty();
        RuleFor(x => x.Amount).GreaterThan(0);
        RuleFor(x => x.Description).NotEmpty().MaximumLength(500);
    }
}

public class QuickPaymentValidator : AbstractValidator<QuickPaymentDto>
{
    public QuickPaymentValidator()
    {
        RuleFor(x => x.SessionId).NotEmpty();
        RuleFor(x => x.PlayerId).NotEmpty();
        RuleFor(x => x.Amount).GreaterThan(0);
    }
}

public class ReopenSessionValidator : AbstractValidator<ReopenSessionDto>
{
    public ReopenSessionValidator()
    {
        RuleFor(x => x.SessionId).NotEmpty();
        RuleFor(x => x.Reason).NotEmpty().MinimumLength(5).MaximumLength(500);
    }
}

public class LoginValidator : AbstractValidator<LoginDto>
{
    public LoginValidator()
    {
        RuleFor(x => x.UserName).NotEmpty();
        RuleFor(x => x.Password).NotEmpty().MinimumLength(6);
    }
}

public class UpsertPricingTemplateValidator : AbstractValidator<UpsertPricingTemplateDto>
{
    public UpsertPricingTemplateValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(150);
        RuleForEach(x => x.Rules).SetValidator(new UpsertPricingTemplateRuleValidator());
    }
}

public class UpsertPricingTemplateRuleValidator : AbstractValidator<UpsertPricingTemplateRuleDto>
{
    public UpsertPricingTemplateRuleValidator()
    {
        RuleFor(x => x.Multiplier).GreaterThanOrEqualTo(0).LessThanOrEqualTo(10);
        RuleFor(x => x.FixedAmount).GreaterThanOrEqualTo(0).LessThanOrEqualTo(100_000_000);
    }
}

public class RegisterValidator : AbstractValidator<RegisterDto>
{
    public RegisterValidator()
    {
        RuleFor(x => x.UserName).NotEmpty().MinimumLength(3).MaximumLength(80);
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Password).NotEmpty().MinimumLength(6);
        RuleFor(x => x.FullName).NotEmpty().MaximumLength(150);
    }
}
