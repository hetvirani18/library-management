using System.Security.Claims;
using LibraryWebApi.Common;
using LibraryWebApi.DTOs;
using LibraryWebApi.Models;
using LibraryWebApi.Repositories;
using LibraryWebApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LibraryWebApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class BorrowController : ControllerBase
{
    private readonly BorrowService _borrowService;
    private readonly IBorrowRecordRepository _borrowRecordRepository;

    public BorrowController(BorrowService borrowService, IBorrowRecordRepository borrowRecordRepository)
    {
        _borrowService = borrowService;
        _borrowRecordRepository = borrowRecordRepository;
    }

    [HttpPost]
    public async Task<IActionResult> Borrow(BorrowBookRequest request)
    {
        if (!ModelState.IsValid)
        {
            throw Errors.ValidationFailed;
        }

        var record = await _borrowService.BorrowBookAsync(request.BookId, GetUserId());
        return Ok(ApiResponse<BorrowRecordResponse>.SuccessResponse(ToResponse(record), "Book borrowed successfully"));
    }

    [HttpPost("return")]
    public async Task<IActionResult> Return(ReturnBookRequest request)
    {
        if (!ModelState.IsValid)
        {
            throw Errors.ValidationFailed;
        }

        var record = await _borrowService.ReturnBookAsync(request.BookId, GetUserId());
        return Ok(ApiResponse<BorrowRecordResponse>.SuccessResponse(ToResponse(record), "Book returned successfully"));
    }

    [HttpGet("my-history")]
    public async Task<IActionResult> MyHistory()
    {
        var history = await _borrowRecordRepository.GetMemberHistoryAsync(GetUserId());
        return Ok(ApiResponse<List<BorrowRecordResponse>>.SuccessResponse(history.Select(ToResponse).ToList()));
    }

    [HttpGet("overdue")]
    [Authorize(Roles = AuthController.LibrarianRole)]
    public async Task<IActionResult> Overdue()
    {
        var overdue = await _borrowRecordRepository.GetOverdueAsync();
        return Ok(ApiResponse<List<BorrowRecordResponse>>.SuccessResponse(overdue.Select(ToResponse).ToList()));
    }

    [HttpGet("all")]
    [Authorize(Roles = AuthController.LibrarianRole)]
    public async Task<IActionResult> All()
    {
        var all = await _borrowRecordRepository.GetAllAsync();
        return Ok(ApiResponse<List<BorrowRecordResponse>>.SuccessResponse(all.Select(ToResponse).ToList()));
    }

    [HttpGet("history/{userId}")]
    [Authorize(Roles = AuthController.LibrarianRole)]
    public async Task<IActionResult> HistoryForMember(string userId)
    {
        var history = await _borrowRecordRepository.GetMemberHistoryAsync(userId);
        return Ok(ApiResponse<List<BorrowRecordResponse>>.SuccessResponse(history.Select(ToResponse).ToList()));
    }

    private string GetUserId()
    {
        return User.FindFirst(ClaimTypes.NameIdentifier)?.Value
               ?? User.FindFirst("sub")?.Value
               ?? throw Errors.InvalidAuthToken;
    }

    private static BorrowRecordResponse ToResponse(BorrowRecord record)
    {
        return new BorrowRecordResponse
        {
            RecordId = record.RecordId,
            BookId = record.BookId,
            BookTitle = record.Book?.Title,
            UserId = record.UserId,
            UserFullName = record.User?.FullName,
            BorrowedAt = record.BorrowedAt,
            DueDate = record.DueDate,
            ReturnedAt = record.ReturnedAt,
            IsOverdue = record.IsOverdue
        };
    }
}
