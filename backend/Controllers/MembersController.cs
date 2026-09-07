using LibraryWebApi.Common;
using LibraryWebApi.DTOs;
using LibraryWebApi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

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
    public async Task<IActionResult> GetAll()
    {
        var members = await _userManager.Users
            .Where(user => user.Role == AuthController.MemberRole)
            .OrderBy(user => user.FullName)
            .ToListAsync();

        return Ok(ApiResponse<List<MemberResponse>>.SuccessResponse(members.Select(ToResponse).ToList()));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var member = await _userManager.FindByIdAsync(id) ?? throw Errors.MemberNotFound;
        return Ok(ApiResponse<MemberResponse>.SuccessResponse(ToResponse(member)));
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
