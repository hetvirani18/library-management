using LibraryWebApi.Data;
using LibraryWebApi.Models;
using Microsoft.EntityFrameworkCore;

namespace LibraryWebApi.Repositories;

public class BorrowRecordRepository : IBorrowRecordRepository
{
    private readonly ApplicationDbContext _context;

    public BorrowRecordRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public Task<BorrowRecord?> GetActiveRecordAsync(int bookId, string userId) =>
        _context.BorrowRecords.AsNoTracking()
            .FirstOrDefaultAsync(record =>
                record.BookId == bookId && record.UserId == userId && record.ReturnedAt == null);

    public Task<List<BorrowRecord>> GetOverdueAsync() =>
        _context.BorrowRecords.AsNoTracking()
            .Include(record => record.Book)
            .Include(record => record.User)
            .Where(record => record.ReturnedAt == null && record.DueDate < DateTime.UtcNow)
            .OrderBy(record => record.DueDate)
            .ToListAsync();

    public Task<List<BorrowRecord>> GetAllAsync() =>
        _context.BorrowRecords.AsNoTracking()
            .Include(record => record.Book)
            .Include(record => record.User)
            .OrderByDescending(record => record.BorrowedAt)
            .ToListAsync();

    public Task<List<BorrowRecord>> GetMemberHistoryAsync(string userId) =>
        _context.BorrowRecords.AsNoTracking()
            .Include(record => record.Book)
            .Where(record => record.UserId == userId)
            .OrderByDescending(record => record.BorrowedAt)
            .ToListAsync();

    public Task<int> CountActiveAsync() =>
        _context.BorrowRecords.AsNoTracking().CountAsync(record => record.ReturnedAt == null);

    public Task<int> CountOverdueAsync() =>
        _context.BorrowRecords.AsNoTracking()
            .CountAsync(record => record.ReturnedAt == null && record.DueDate < DateTime.UtcNow);

    public async Task AddAsync(BorrowRecord record)
    {
        _context.BorrowRecords.Add(record);
        await _context.SaveChangesAsync();
    }

    public async Task<bool> TryMarkReturnedAsync(int recordId)
    {
        var rowsAffected = await _context.Database.ExecuteSqlInterpolatedAsync(
            $"""
             UPDATE "BorrowRecords" SET "ReturnedAt" = {DateTime.UtcNow}
             WHERE "RecordId" = {recordId} AND "ReturnedAt" IS NULL
             """);

        return rowsAffected == 1;
    }
}
