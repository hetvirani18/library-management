using LibraryWebApi.Common;
using LibraryWebApi.Models;

namespace LibraryWebApi.Repositories;

public interface IBookRepository
{
    Task<Book?> GetByIdAsync(int bookId);
    Task<Paginated<Book>> GetAllAsync(PageQuery page);
    Task<Paginated<Book>> GetAvailableAsync(PageQuery page);
    Task<Paginated<Book>> GetByGenreAsync(string genre, PageQuery page);
    Task<Paginated<Book>> SearchAsync(string query, PageQuery page);
    Task<int> CountAsync();
    Task AddAsync(Book book);
    Task UpdateAsync(Book book);
    Task<bool> DeleteAsync(int bookId);
    Task<bool> HasBorrowHistoryAsync(int bookId);
    Task<bool> TryDecrementAvailableCopiesAsync(int bookId);
    Task<bool> TryIncrementAvailableCopiesAsync(int bookId);
}
