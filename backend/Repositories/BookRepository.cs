using LibraryWebApi.Common;
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

    public Task<Paginated<Book>> GetAllAsync(PageQuery page) =>
        _context.Books.AsNoTracking().OrderBy(book => book.Title).ToPaginatedAsync(page);

    public Task<Paginated<Book>> GetAvailableAsync(PageQuery page) =>
        _context.Books.AsNoTracking()
            .Where(book => book.AvailableCopies > 0)
            .OrderBy(book => book.Title)
            .ToPaginatedAsync(page);

    public Task<Paginated<Book>> GetByGenreAsync(string genre, PageQuery page) =>
        _context.Books.AsNoTracking()
            .Where(book => EF.Functions.ILike(book.Genre, genre))
            .OrderBy(book => book.Title)
            .ToPaginatedAsync(page);

    public Task<Paginated<Book>> SearchAsync(string query, PageQuery page)
    {
        var pattern = $"%{query}%";

        return _context.Books.AsNoTracking()
            .Where(book => EF.Functions.ILike(book.Title, pattern) || EF.Functions.ILike(book.AuthorName, pattern))
            .OrderBy(book => book.Title)
            .ToPaginatedAsync(page);
    }

    public Task<int> CountAsync() => _context.Books.CountAsync();

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
