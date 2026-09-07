using LibraryWebApi.Common;
using LibraryWebApi.Data;
using LibraryWebApi.Models;
using LibraryWebApi.Repositories;
using Microsoft.AspNetCore.Identity;

namespace LibraryWebApi.Services;

public class BorrowService
{
    private const int DefaultLoanDays = 14;

    private readonly ApplicationDbContext _context;
    private readonly IBookRepository _bookRepository;
    private readonly IBorrowRecordRepository _borrowRecordRepository;
    private readonly UserManager<ApplicationUser> _userManager;

    public BorrowService(
        ApplicationDbContext context,
        IBookRepository bookRepository,
        IBorrowRecordRepository borrowRecordRepository,
        UserManager<ApplicationUser> userManager)
    {
        _context = context;
        _bookRepository = bookRepository;
        _borrowRecordRepository = borrowRecordRepository;
        _userManager = userManager;
    }

    public async Task<BorrowRecord> BorrowBookAsync(int bookId, string userId)
    {
        var book = await _bookRepository.GetByIdAsync(bookId) ?? throw Errors.BookNotFound;

        var user = await _userManager.FindByIdAsync(userId) ?? throw Errors.MemberNotFound;
        if (!user.IsActive)
        {
            throw Errors.AccountDeactivated;
        }

        await using var transaction = await _context.Database.BeginTransactionAsync();

        var decremented = await _bookRepository.TryDecrementAvailableCopiesAsync(bookId);
        if (!decremented)
        {
            throw Errors.NoAvailableCopies;
        }

        var record = new BorrowRecord
        {
            BookId = bookId,
            UserId = userId,
            BorrowedAt = DateTime.UtcNow,
            DueDate = DateTime.UtcNow.AddDays(DefaultLoanDays)
        };

        await _borrowRecordRepository.AddAsync(record);
        await transaction.CommitAsync();

        record.Book = book;
        return record;
    }

    public async Task<BorrowRecord> ReturnBookAsync(int bookId, string userId)
    {
        var activeRecord = await _borrowRecordRepository.GetActiveRecordAsync(bookId, userId)
                            ?? throw Errors.BookNotBorrowed;

        await using var transaction = await _context.Database.BeginTransactionAsync();

        var marked = await _borrowRecordRepository.TryMarkReturnedAsync(activeRecord.RecordId);
        if (!marked)
        {
            throw Errors.BookNotBorrowed;
        }

        await _bookRepository.TryIncrementAvailableCopiesAsync(bookId);
        await transaction.CommitAsync();

        activeRecord.ReturnedAt = DateTime.UtcNow;
        return activeRecord;
    }
}
