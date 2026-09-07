using LibraryWebApi.Data;
using LibraryWebApi.Models;
using Microsoft.EntityFrameworkCore;

namespace LibraryWebApi.Repositories;

public class BookRepository : IBookRepository
{
    private readonly ApplicationDbContext _context;

    public BookRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public Task<Book?> GetByIdAsync(int bookId) =>
        _context.Books.AsNoTracking().FirstOrDefaultAsync(book => book.BookId == bookId);

    public Task<List<Book>> GetAllAsync() =>
        _context.Books.AsNoTracking().OrderBy(book => book.Title).ToListAsync();

    public Task<List<Book>> GetAvailableAsync() =>
        _context.Books.AsNoTracking()
            .Where(book => book.AvailableCopies > 0)
            .OrderBy(book => book.Title)
            .ToListAsync();

    public Task<List<Book>> GetByGenreAsync(string genre) =>
        _context.Books.AsNoTracking()
            .Where(book => EF.Functions.ILike(book.Genre, genre))
            .OrderBy(book => book.Title)
            .ToListAsync();

    public async Task AddAsync(Book book)
    {
        _context.Books.Add(book);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Book book)
    {
        _context.Books.Update(book);
        await _context.SaveChangesAsync();
    }

    public async Task<bool> DeleteAsync(int bookId)
    {
        var rowsAffected = await _context.Books
            .Where(book => book.BookId == bookId)
            .ExecuteDeleteAsync();

        return rowsAffected == 1;
    }

    public Task<bool> HasBorrowHistoryAsync(int bookId) =>
        _context.BorrowRecords.AsNoTracking()
            .AnyAsync(record => record.BookId == bookId);

    public async Task<bool> TryDecrementAvailableCopiesAsync(int bookId)
    {
        var rowsAffected = await _context.Database.ExecuteSqlInterpolatedAsync(
            $"""
             UPDATE "Books" SET "AvailableCopies" = "AvailableCopies" - 1
             WHERE "BookId" = {bookId} AND "AvailableCopies" > 0
             """);

        return rowsAffected == 1;
    }

    public async Task<bool> TryIncrementAvailableCopiesAsync(int bookId)
    {
        var rowsAffected = await _context.Database.ExecuteSqlInterpolatedAsync(
            $"""
             UPDATE "Books" SET "AvailableCopies" = "AvailableCopies" + 1
             WHERE "BookId" = {bookId} AND "AvailableCopies" < "TotalCopies"
             """);

        return rowsAffected == 1;
    }
}
