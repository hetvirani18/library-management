using LibraryWebApi.Common;
using LibraryWebApi.DTOs;
using LibraryWebApi.Models;
using LibraryWebApi.Services;
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
            IsActive = true
        };

        var result = await _userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            throw new AppException(
                string.Join(" ", result.Errors.Select(e => e.Description)),
                Errors.ValidationFailed.Code,
                Errors.ValidationFailed.StatusCode);
        }

        await _userManager.AddToRoleAsync(user, MemberRole);

        var response = await BuildAuthResponseAsync(user);
        return Ok(ApiResponse<AuthResponse>.SuccessResponse(response, "Registered successfully"));
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

        var response = await BuildAuthResponseAsync(user);
        return Ok(ApiResponse<AuthResponse>.SuccessResponse(response, "Logged in successfully"));
    }

    private async Task<AuthResponse> BuildAuthResponseAsync(ApplicationUser user)
    {
        var roles = await _userManager.GetRolesAsync(user);
        var token = _tokenService.CreateToken(user, roles);

        return new AuthResponse
        {
            Token = token,
            UserId = user.Id,
            FullName = user.FullName,
            Email = user.Email!,
            Roles = roles.ToList()
        };
    }
}
