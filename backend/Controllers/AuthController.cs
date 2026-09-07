using LibraryWebApi.Common;
using LibraryWebApi.DTOs;
using LibraryWebApi.Models;
using LibraryWebApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace LibraryWebApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly TokenService _tokenService;

    public const string LibrarianRole = "Librarian";
    public const string MemberRole = "Member";
    private const string AccessTokenCookieName = "access_token";

    public AuthController(UserManager<ApplicationUser> userManager, TokenService tokenService)
    {
        _userManager = userManager;
        _tokenService = tokenService;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest request)
    {
        if (!ModelState.IsValid)
        {
            throw Errors.ValidationFailed;
        }

        var existingUser = await _userManager.FindByEmailAsync(request.Email);
        if (existingUser is not null)
        {
            throw Errors.EmailAlreadyExists;
        }

        var user = new ApplicationUser
        {
            UserName = request.Email,
            Email = request.Email,
            FullName = request.FullName,
            MembershipDate = DateTime.UtcNow,
            IsActive = true,
            Role = MemberRole
        };

        var result = await _userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            throw new AppException(
                string.Join(" ", result.Errors.Select(e => e.Description)),
                Errors.ValidationFailed.Code,
                Errors.ValidationFailed.StatusCode);
        }

        SetAccessTokenCookie(user);
        return Ok(ApiResponse<AuthResponse>.SuccessResponse(ToAuthResponse(user), "Registered successfully"));
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request)
    {
        if (!ModelState.IsValid)
        {
            throw Errors.ValidationFailed;
        }

        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user is null || !await _userManager.CheckPasswordAsync(user, request.Password))
        {
            throw Errors.InvalidCredentials;
        }

        if (!user.IsActive)
        {
            throw Errors.AccountDeactivated;
        }

        SetAccessTokenCookie(user);
        return Ok(ApiResponse<AuthResponse>.SuccessResponse(ToAuthResponse(user), "Logged in successfully"));
    }

    [HttpPost("logout")]
    public IActionResult Logout()
    {
        Response.Cookies.Delete(AccessTokenCookieName, new CookieOptions
        {
            HttpOnly = true,
            Secure = Request.IsHttps,
            SameSite = SameSiteMode.Lax,
            Path = "/"
        });

        return Ok(ApiResponse<object?>.SuccessResponse(null, "Logged out successfully"));
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me()
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                      ?? User.FindFirst("sub")?.Value;

        var user = userId is null ? null : await _userManager.FindByIdAsync(userId);
        if (user is null)
        {
            throw Errors.InvalidAuthToken;
        }

        return Ok(ApiResponse<AuthResponse>.SuccessResponse(ToAuthResponse(user), "Current user fetched"));
    }

    private void SetAccessTokenCookie(ApplicationUser user)
    {
        var token = _tokenService.CreateToken(user);

        Response.Cookies.Append(AccessTokenCookieName, token, new CookieOptions
        {
            HttpOnly = true,
            Secure = Request.IsHttps,
            SameSite = SameSiteMode.Lax,
            Expires = DateTimeOffset.UtcNow.AddHours(8),
            Path = "/"
        });
    }

    private static AuthResponse ToAuthResponse(ApplicationUser user)
    {
        return new AuthResponse
        {
            UserId = user.Id,
            FullName = user.FullName,
            Email = user.Email!,
            Role = user.Role
        };
    }
}
