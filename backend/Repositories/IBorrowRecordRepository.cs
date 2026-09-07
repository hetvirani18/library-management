using LibraryWebApi.Models;

namespace LibraryWebApi.Repositories;

public interface IBorrowRecordRepository
{
    Task<BorrowRecord?> GetActiveRecordAsync(int bookId, string userId);
    Task<List<BorrowRecord>> GetOverdueAsync();
    Task<List<BorrowRecord>> GetAllAsync();
    Task<List<BorrowRecord>> GetMemberHistoryAsync(string userId);
    Task<int> CountActiveAsync();
    Task<int> CountOverdueAsync();
    Task AddAsync(BorrowRecord record);
    Task<bool> TryMarkReturnedAsync(int recordId);
}
