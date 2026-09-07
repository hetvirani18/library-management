using LibraryWebApi.Common;
using LibraryWebApi.DTOs;
using LibraryWebApi.Models;
using LibraryWebApi.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LibraryWebApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = AuthController.LibrarianRole)]
public class DashboardController : ControllerBase
{
    private readonly IBookRepository _bookRepository;
    private readonly IBorrowRecordRepository _borrowRecordRepository;
    private readonly UserManager<ApplicationUser> _userManager;

    public DashboardController(
        IBookRepository bookRepository,
        IBorrowRecordRepository borrowRecordRepository,
        UserManager<ApplicationUser> userManager)
    {
        _bookRepository = bookRepository;
        _borrowRecordRepository = borrowRecordRepository;
        _userManager = userManager;
    }

    [HttpGet("stats")]
    public async Task<IActionResult> Stats()
    {
        var stats = new DashboardStatsResponse
        {
            TotalBooks = await _bookRepository.CountAsync(),
            TotalMembers = await _userManager.Users.CountAsync(user => user.Role == AuthController.MemberRole),
            CurrentlyBorrowed = await _borrowRecordRepository.CountActiveAsync(),
            OverdueCount = await _borrowRecordRepository.CountOverdueAsync()
        };

        return Ok(ApiResponse<DashboardStatsResponse>.SuccessResponse(stats));
    }
}
