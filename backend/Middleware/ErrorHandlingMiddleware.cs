using System.Text.Json;
using LibraryWebApi.Common;

namespace LibraryWebApi.Middleware;

public class ErrorHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ErrorHandlingMiddleware> _logger;

    public ErrorHandlingMiddleware(RequestDelegate next, ILogger<ErrorHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (AppException appException)
        {
            _logger.LogWarning(appException, "Handled application error: {Message}", appException.Message);
            await WriteResponseAsync(context, appException.StatusCode,
                ApiResponse.ErrorResponse(appException.Message, appException.Code));
        }
        catch (Exception exception)
        {
            _logger.LogError(exception, "Unhandled exception");
            await WriteResponseAsync(context, StatusCodes.Status500InternalServerError,
                ApiResponse.ErrorResponse("Internal server error", 10000));
        }
    }

    private static async Task WriteResponseAsync(HttpContext context, int statusCode, object body)
    {
        context.Response.ContentType = "application/json";
        context.Response.StatusCode = statusCode;
        await context.Response.WriteAsync(JsonSerializer.Serialize(body, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        }));
    }
}
