namespace BadmintonFinance.Application.DTOs;

public class ApiResponse<T>
{
    public bool Success { get; set; } = true;
    public T? Data { get; set; }
    public string? Message { get; set; }
    public List<string> Warnings { get; set; } = new();
    public string? ErrorCode { get; set; }

    public static ApiResponse<T> Ok(T data, string? message = null, List<string>? warnings = null)
        => new() { Success = true, Data = data, Message = message, Warnings = warnings ?? new() };

    public static ApiResponse<T> Fail(string code, string message)
        => new() { Success = false, ErrorCode = code, Message = message };
}

public class PagedResult<T>
{
    public IEnumerable<T> Items { get; set; } = Enumerable.Empty<T>();
    public int Total { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}

public class PagedQuery
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public string? Search { get; set; }
}
