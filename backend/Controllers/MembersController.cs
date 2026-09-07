using LibraryWebApi.Common;
using LibraryWebApi.DTOs;
using LibraryWebApi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace LibraryWebApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = AuthController.LibrarianRole)]
public class MembersController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;

    public MembersController(UserManager<ApplicationUser> userManager)
    {
        _userManager = userManager;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] PageQuery page)
    {
        var members = await _userManager.Users
            .Where(user => user.Role == AuthController.MemberRole)
            .OrderBy(user => user.FullName)
            .ToPaginatedAsync(page);

        return Ok(ApiResponse<Paginated<MemberResponse>>.SuccessResponse(members.Map(ToResponse)));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var member = await _userManager.FindByIdAsync(id) ?? throw Errors.MemberNotFound;
        return Ok(ApiResponse<MemberResponse>.SuccessResponse(ToResponse(member)));
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateMemberRequest request)
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

        var member = new ApplicationUser
        {
            UserName = request.Email,
            Email = request.Email,
            FullName = request.FullName.Trim(),
            MembershipDate = DateTime.UtcNow,
            IsActive = true,
            Role = AuthController.MemberRole
        };

        var result = await _userManager.CreateAsync(member, request.Password);
        if (!result.Succeeded)
        {
            throw new AppException(
                string.Join(" ", result.Errors.Select(e => e.Description)),
                Errors.ValidationFailed.Code,
                Errors.ValidationFailed.StatusCode);
        }

        return Ok(ApiResponse<MemberResponse>.SuccessResponse(ToResponse(member), "Member added successfully"));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, UpdateMemberRequest request)
    {
        if (!ModelState.IsValid)
        {
            throw Errors.ValidationFailed;
        }

        var member = await _userManager.FindByIdAsync(id) ?? throw Errors.MemberNotFound;

        var existingWithEmail = await _userManager.FindByEmailAsync(request.Email);
        if (existingWithEmail is not null && existingWithEmail.Id != member.Id)
        {
            throw Errors.EmailAlreadyExists;
        }

        member.FullName = request.FullName.Trim();
        await _userManager.SetEmailAsync(member, request.Email);
        await _userManager.SetUserNameAsync(member, request.Email);
        await _userManager.UpdateAsync(member);

        return Ok(ApiResponse<MemberResponse>.SuccessResponse(ToResponse(member), "Member updated successfully"));
    }

    [HttpPatch("{id}/reset-password")]
    public async Task<IActionResult> ResetPassword(string id, ResetMemberPasswordRequest request)
    {
        if (!ModelState.IsValid)
        {
            throw Errors.ValidationFailed;
        }

        var member = await _userManager.FindByIdAsync(id) ?? throw Errors.MemberNotFound;

        var token = await _userManager.GeneratePasswordResetTokenAsync(member);
        var result = await _userManager.ResetPasswordAsync(member, token, request.NewPassword);
        if (!result.Succeeded)
        {
            throw new AppException(
                string.Join(" ", result.Errors.Select(e => e.Description)),
                Errors.ValidationFailed.Code,
                Errors.ValidationFailed.StatusCode);
        }

        return Ok(ApiResponse<object?>.SuccessResponse(null, "Member's password reset successfully"));
    }

    [HttpPatch("{id}/deactivate")]
    public async Task<IActionResult> Deactivate(string id)
    {
        var member = await _userManager.FindByIdAsync(id) ?? throw Errors.MemberNotFound;

        member.IsActive = false;
        await _userManager.UpdateAsync(member);

        return Ok(ApiResponse<MemberResponse>.SuccessResponse(ToResponse(member), "Member deactivated successfully"));
    }

    [HttpPatch("{id}/activate")]
    public async Task<IActionResult> Activate(string id)
    {
        var member = await _userManager.FindByIdAsync(id) ?? throw Errors.MemberNotFound;

        member.IsActive = true;
        await _userManager.UpdateAsync(member);

        return Ok(ApiResponse<MemberResponse>.SuccessResponse(ToResponse(member), "Member activated successfully"));
    }

    private static MemberResponse ToResponse(ApplicationUser member)
    {
        return new MemberResponse
        {
            UserId = member.Id,
            FullName = member.FullName,
            Email = member.Email!,
            Role = member.Role,
            IsActive = member.IsActive,
            MembershipDate = member.MembershipDate
        };
    }
}
