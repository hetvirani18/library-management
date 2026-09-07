namespace LibraryWebApi.Common;

public class ApiResponse<T>
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public T? Data { get; set; }
    public ApiError? Error { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    public static ApiResponse<T> SuccessResponse(T data, string message = "Operation successful")
    {
        return new ApiResponse<T> { Success = true, Message = message, Data = data };
    }

    public static ApiResponse<T> ErrorResponse(string message, int code = 10000)
    {
        return new ApiResponse<T> { Success = false, Error = new ApiError { Code = code, Message = message } };
    }
}

public class ApiError
{
    public int Code { get; set; }
    public string Message { get; set; } = string.Empty;
}

public static class ApiResponse
{
    public static ApiResponse<object?> ErrorResponse(string message, int code = 10000)
    {
        return ApiResponse<object?>.ErrorResponse(message, code);
    }
}
