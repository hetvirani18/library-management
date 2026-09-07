using LibraryWebApi.Models;

namespace LibraryWebApi.Repositories;

public interface IBookRepository
{
    Task<Book?> GetByIdAsync(int bookId);
    Task<List<Book>> GetAllAsync();
    Task<List<Book>> GetAvailableAsync();
    Task<List<Book>> GetByGenreAsync(string genre);
    Task<List<Book>> SearchAsync(string query);
    Task<int> CountAsync();
    Task AddAsync(Book book);
    Task UpdateAsync(Book book);
    Task<bool> DeleteAsync(int bookId);
    Task<bool> HasBorrowHistoryAsync(int bookId);
    Task<bool> TryDecrementAvailableCopiesAsync(int bookId);
    Task<bool> TryIncrementAvailableCopiesAsync(int bookId);
}
