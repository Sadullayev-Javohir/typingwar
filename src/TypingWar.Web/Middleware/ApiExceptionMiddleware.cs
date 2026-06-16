using System.Text.Json;
using FluentValidation;

namespace TypingWar.Web.Middleware;

/// <summary>API xatolarini JSON ko'rinishida qaytaradi (ValidationException → 400, Unauthorized → 401 va h.k.).</summary>
public class ApiExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ApiExceptionMiddleware> _logger;

    public ApiExceptionMiddleware(RequestDelegate next, ILogger<ApiExceptionMiddleware> logger)
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
        catch (Exception ex) when (context.Request.Path.StartsWithSegments("/api"))
        {
            var (status, message) = ex switch
            {
                ValidationException ve => (StatusCodes.Status400BadRequest,
                    string.Join("; ", ve.Errors.Select(e => e.ErrorMessage))),
                UnauthorizedAccessException => (StatusCodes.Status401Unauthorized, ex.Message),
                InvalidOperationException => (StatusCodes.Status400BadRequest, ex.Message),
                _ => (StatusCodes.Status500InternalServerError, "Kutilmagan xatolik yuz berdi.")
            };

            if (status == StatusCodes.Status500InternalServerError)
                _logger.LogError(ex, "API xatosi: {Path}", context.Request.Path);

            context.Response.StatusCode = status;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync(JsonSerializer.Serialize(new { error = message }));
        }
    }
}
