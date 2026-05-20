namespace BadmintonFinance.Domain.Exceptions;

public class DomainException : Exception
{
    public string Code { get; }
    public DomainException(string code, string message) : base(message) { Code = code; }
}

public class NotFoundException : DomainException
{
    public NotFoundException(string entity, object id)
        : base("NOT_FOUND", $"{entity} with id '{id}' was not found.") { }
}

public class BusinessRuleException : DomainException
{
    public BusinessRuleException(string code, string message) : base(code, message) { }
}
