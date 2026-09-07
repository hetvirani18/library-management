using LibraryWebApi.Common;
using LibraryWebApi.Models;

namespace LibraryWebApi.Repositories;

public interface IBorrowRecordRepository
{
    Task<BorrowRecord?> GetActiveRecordAsync(int bookId, string userId);
    Task<Paginated<BorrowRecord>> GetOverdueAsync(PageQuery page);
    Task<Paginated<BorrowRecord>> GetAllAsync(PageQuery page);
    Task<Paginated<BorrowRecord>> GetMemberHistoryAsync(string userId, PageQuery page);
    Task<int> CountActiveAsync();
    Task<int> CountOverdueAsync();
    Task AddAsync(BorrowRecord record);
    Task<bool> TryMarkReturnedAsync(int recordId);
}
