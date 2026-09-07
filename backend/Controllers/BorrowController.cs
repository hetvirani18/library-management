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
    [Authorize(Roles = AuthController.LibrarianRole)]
    public async Task<IActionResult> Borrow(BorrowBookRequest request)
    {
        if (!ModelState.IsValid)
        {
            throw Errors.ValidationFailed;
        }

        var record = await _borrowService.BorrowBookAsync(request.BookId, request.MemberId);
        return Ok(ApiResponse<BorrowRecordResponse>.SuccessResponse(ToResponse(record), "Book assigned to member successfully"));
    }

    [HttpPost("return")]
    [Authorize(Roles = AuthController.LibrarianRole)]
    public async Task<IActionResult> Return(ReturnBookRequest request)
    {
        if (!ModelState.IsValid)
        {
            throw Errors.ValidationFailed;
        }

        var record = await _borrowService.ReturnBookAsync(request.BookId, request.MemberId);
        return Ok(ApiResponse<BorrowRecordResponse>.SuccessResponse(ToResponse(record), "Book returned successfully"));
    }

    [HttpGet("my-history")]
    public async Task<IActionResult> MyHistory([FromQuery] PageQuery page)
    {
        var history = await _borrowRecordRepository.GetMemberHistoryAsync(GetUserId(), page);
        return Ok(ApiResponse<Paginated<BorrowRecordResponse>>.SuccessResponse(history.Map(ToResponse)));
    }

    [HttpGet("overdue")]
    [Authorize(Roles = AuthController.LibrarianRole)]
    public async Task<IActionResult> Overdue([FromQuery] PageQuery page)
    {
        var overdue = await _borrowRecordRepository.GetOverdueAsync(page);
        return Ok(ApiResponse<Paginated<BorrowRecordResponse>>.SuccessResponse(overdue.Map(ToResponse)));
    }

    [HttpGet("all")]
    [Authorize(Roles = AuthController.LibrarianRole)]
    public async Task<IActionResult> All([FromQuery] PageQuery page)
    {
        var all = await _borrowRecordRepository.GetAllAsync(page);
        return Ok(ApiResponse<Paginated<BorrowRecordResponse>>.SuccessResponse(all.Map(ToResponse)));
    }

    [HttpGet("history/{userId}")]
    [Authorize(Roles = AuthController.LibrarianRole)]
    public async Task<IActionResult> HistoryForMember(string userId, [FromQuery] PageQuery page)
    {
        var history = await _borrowRecordRepository.GetMemberHistoryAsync(userId, page);
        return Ok(ApiResponse<Paginated<BorrowRecordResponse>>.SuccessResponse(history.Map(ToResponse)));
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
